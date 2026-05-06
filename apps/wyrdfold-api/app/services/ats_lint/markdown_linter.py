"""Markdown-level ATS lint.

Runs cheap text checks on the markdown source before pandoc renders.
Catches ATS-hostile patterns (tables, images, length blowup, missing
sections) at edit time so the user sees feedback without paying for
a pandoc round-trip.

The docx-byte linter (linter.py) still runs at download time as the
safety net — it catches issues the markdown text can't see (e.g.,
malformed XML, image entries pandoc may produce from inline HTML).
"""

from __future__ import annotations

import re
from typing import Literal

from app.models.ats_lint import LintResult, LintViolation

_TABLE_PIPE_RE = re.compile(r"^\s*\|.*\|\s*$", re.MULTILINE)
_IMAGE_RE = re.compile(r"!\[[^\]]*\]\([^)]+\)")
_HTML_TAG_RE = re.compile(r"<[a-zA-Z][^>]*>")
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)

_PARA_WARN_AT = 80
_PARA_ERROR_AT = 120

# Required sections for resumes. Cover letters skip these.
_REQUIRED_RESUME_SECTIONS = {"Experience"}
_KNOWN_RESUME_SECTIONS = {"Summary", "Experience", "Skills", "Education"}


def _heading_texts(markdown: str, level: int) -> list[str]:
    """Return text of headings at exactly `level` (1=`#`, 2=`##`, ...)."""
    out: list[str] = []
    for match in _HEADING_RE.finditer(markdown):
        if len(match.group(1)) == level:
            out.append(match.group(2).strip())
    return out


def _non_empty_lines(markdown: str) -> int:
    return sum(1 for line in markdown.splitlines() if line.strip())


def lint_markdown(
    markdown: str,
    *,
    document_type: Literal["resume", "cover_letter"] = "resume",
) -> LintResult:
    """Lint markdown text for ATS compatibility.

    Errors block save/generation. Warnings surface to the user but
    don't fail the request.
    """
    violations: list[LintViolation] = []

    if not markdown.strip():
        violations.append(
            LintViolation(
                code="empty",
                message="Markdown is empty.",
                severity="error",
            )
        )
        return LintResult(ok=False, violations=violations)

    # no_tables — pipe-delimited tables are the only markdown-native form
    if _TABLE_PIPE_RE.search(markdown):
        violations.append(
            LintViolation(
                code="no_tables",
                message=(
                    "Markdown contains a table. Most ATS parsers read tables "
                    "inconsistently; use single-column paragraph content."
                ),
                severity="error",
            )
        )

    # no_inline_images
    if _IMAGE_RE.search(markdown):
        violations.append(
            LintViolation(
                code="no_inline_images",
                message=(
                    "Markdown contains an inline image. ATS parsers "
                    "routinely drop image content."
                ),
                severity="error",
            )
        )

    # no_html — raw HTML can produce text frames or other ATS-hostile output
    if _HTML_TAG_RE.search(markdown):
        violations.append(
            LintViolation(
                code="no_html",
                message=(
                    "Markdown contains raw HTML tags. Use plain markdown so "
                    "ATS parsers see selectable text."
                ),
                severity="warning",
            )
        )

    if document_type == "resume":
        h2 = _heading_texts(markdown, 2)
        h2_set = set(h2)
        missing = _REQUIRED_RESUME_SECTIONS - h2_set
        if missing:
            violations.append(
                LintViolation(
                    code="experience_heading",
                    message=(
                        f"Missing required H2 section(s): {sorted(missing)}. "
                        "ATS parsers key off standard section names."
                    ),
                    severity="error",
                )
            )

        non_standard = [h for h in h2 if h not in _KNOWN_RESUME_SECTIONS]
        if non_standard:
            violations.append(
                LintViolation(
                    code="standard_headings",
                    message=(
                        f"Non-standard H2 section(s): {sorted(set(non_standard))}. "
                        f"Expected a subset of {sorted(_KNOWN_RESUME_SECTIONS)}."
                    ),
                    severity="warning",
                )
            )

    # page_count — non-empty line heuristic mirrors the docx linter
    line_count = _non_empty_lines(markdown)
    if line_count > _PARA_ERROR_AT:
        violations.append(
            LintViolation(
                code="page_count",
                message=(
                    f"Markdown has {line_count} non-empty lines; "
                    f"likely exceeds 3 pages. Tighten content."
                ),
                severity="error",
            )
        )
    elif line_count > _PARA_WARN_AT:
        violations.append(
            LintViolation(
                code="page_count",
                message=(
                    f"Markdown has {line_count} non-empty lines; "
                    f"likely exceeds 2 pages."
                ),
                severity="warning",
            )
        )

    ok = not any(v.severity == "error" for v in violations)
    return LintResult(ok=ok, violations=violations)
