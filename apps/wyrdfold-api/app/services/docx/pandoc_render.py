"""Markdown -> .docx via pandoc subprocess.

Pandoc renders markdown to a single-column, ATS-friendly .docx with
its default styles. We invoke the binary via subprocess (stdin -> stdout)
to avoid temp files.

The pandoc binary must be available on PATH. The wyrdfold-api Dockerfile
installs it via apt; local dev needs `brew install pandoc` or equivalent.
`PandocNotInstalledError` is raised loud if the binary is missing — there's
no silent fallback because the structured docx renderer is going away.
"""

from __future__ import annotations

import hashlib
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING

from app.services.docx.style import build_reference_docx

if TYPE_CHECKING:
    from app.models.user_profile import ResumeStyleSettings

PANDOC_BIN = "pandoc"
RENDER_TIMEOUT_SECONDS = 30


class PandocNotInstalledError(RuntimeError):
    """Pandoc binary is not on PATH."""


class PandocRenderError(RuntimeError):
    """Pandoc returned a non-zero exit code."""


def md_payload_hash(markdown: str, style: ResumeStyleSettings | None = None) -> str:
    """Stable cache key for a markdown payload + its render style.

    ``style is None`` hashes the markdown alone — byte-identical to the
    pre-style behavior, so existing cached docx entries stay valid. When a
    style is set, it joins the key so a style change forces a re-render.
    """
    if style is None:
        return hashlib.sha256(markdown.encode("utf-8")).hexdigest()
    keyed = f"{markdown}\x00{style.preset}\x00{style.accent}"
    return hashlib.sha256(keyed.encode("utf-8")).hexdigest()


def md_to_docx(markdown: str, style: ResumeStyleSettings | None = None) -> bytes:
    """Render markdown to .docx bytes via pandoc subprocess.

    When ``style`` is set, pandoc copies its styles from a generated
    ``--reference-doc`` (see ``app.services.docx.style``); when ``None``, the
    invocation is pandoc's unstyled default (today's behavior).

    Raises PandocNotInstalledError if the binary is missing, PandocRenderError
    on non-zero exit, and lets TimeoutExpired propagate if pandoc hangs.
    """
    if shutil.which(PANDOC_BIN) is None:
        raise PandocNotInstalledError(
            f"{PANDOC_BIN!r} not found on PATH. "
            "Install via `apt-get install pandoc` (Docker) or `brew install pandoc` (local)."
        )

    # Args list is otherwise constant: PANDOC_BIN is a module-level literal and
    # the remaining args are static flags. `markdown` is fed via stdin, not
    # argv. The only dynamic arg is a reference-doc path we create ourselves.
    args = [PANDOC_BIN, "-f", "markdown", "-t", "docx", "-o", "-"]
    ref_path: str | None = None
    if style is not None:
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            tmp.write(build_reference_docx(style))
            ref_path = tmp.name
        args += ["--reference-doc", ref_path]

    try:
        result = subprocess.run(  # noqa: S603
            args,
            input=markdown.encode("utf-8"),
            capture_output=True,
            check=False,
            timeout=RENDER_TIMEOUT_SECONDS,
        )
    except FileNotFoundError as exc:
        raise PandocNotInstalledError(str(exc)) from exc
    finally:
        if ref_path is not None:
            Path(ref_path).unlink()

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        raise PandocRenderError(
            f"pandoc exited {result.returncode}: {stderr or '(no stderr)'}"
        )
    return result.stdout
