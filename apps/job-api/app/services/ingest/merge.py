"""Merge extracted resume text into the prose doc.

Pure function — no DB access. The caller fetches existing prose,
calls merge, then persists the result as a new prose version.
"""

from __future__ import annotations

from app.services.ingest.parse import ParsedResume


def merge_into_prose(
    existing_content: str | None,
    parsed: ParsedResume,
) -> str:
    """Concatenate extracted resume text into existing prose content.

    If no existing prose exists, returns the extracted text directly.
    Otherwise appends with a section divider and filename header.
    """
    if not existing_content or not existing_content.strip():
        return parsed.text

    return (
        f"{existing_content}\n\n"
        f"---\n"
        f"[Uploaded Resume: {parsed.source_filename}]\n\n"
        f"{parsed.text}"
    )
