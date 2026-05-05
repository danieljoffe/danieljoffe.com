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

PANDOC_BIN = "pandoc"
RENDER_TIMEOUT_SECONDS = 30


class PandocNotInstalledError(RuntimeError):
    """Pandoc binary is not on PATH."""


class PandocRenderError(RuntimeError):
    """Pandoc returned a non-zero exit code."""


def md_payload_hash(markdown: str) -> str:
    """Stable cache key for a markdown payload."""
    return hashlib.sha256(markdown.encode("utf-8")).hexdigest()


def md_to_docx(markdown: str) -> bytes:
    """Render markdown to .docx bytes via pandoc subprocess.

    Raises PandocNotInstalledError if the binary is missing, PandocRenderError
    on non-zero exit, and lets TimeoutExpired propagate if pandoc hangs.
    """
    if shutil.which(PANDOC_BIN) is None:
        raise PandocNotInstalledError(
            f"{PANDOC_BIN!r} not found on PATH. "
            "Install via `apt-get install pandoc` (Docker) or `brew install pandoc` (local)."
        )

    try:
        # Args list is fully constant: PANDOC_BIN is a module-level literal,
        # remaining args are static flags. `markdown` content is fed via stdin,
        # not interpolated into argv, so there is no shell-injection surface.
        result = subprocess.run(  # noqa: S603
            [PANDOC_BIN, "-f", "markdown", "-t", "docx", "-o", "-"],
            input=markdown.encode("utf-8"),
            capture_output=True,
            check=False,
            timeout=RENDER_TIMEOUT_SECONDS,
        )
    except FileNotFoundError as exc:
        raise PandocNotInstalledError(str(exc)) from exc

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        raise PandocRenderError(
            f"pandoc exited {result.returncode}: {stderr or '(no stderr)'}"
        )
    return result.stdout
