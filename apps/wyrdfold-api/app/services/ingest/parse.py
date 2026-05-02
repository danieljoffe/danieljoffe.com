"""Resume file parsing: PDF (pdfplumber) and DOCX (python-docx).

Pure functions — no DB, no side effects. Callers pass file bytes in,
get structured text out.
"""

from __future__ import annotations

import io
import logging
from typing import Literal

from pydantic import BaseModel

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ACCEPTED_CONTENT_TYPES: dict[str, Literal["pdf", "docx"]] = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}


class ParsedResume(BaseModel):
    text: str
    source_filename: str
    file_type: Literal["pdf", "docx"]
    page_count: int | None = None
    warnings: list[str] = []


class ParseError(Exception):
    """Raised when a file cannot be parsed."""


def parse_pdf(file_bytes: bytes, filename: str) -> ParsedResume:
    """Extract text from a PDF file using pdfplumber."""
    import pdfplumber

    warnings: list[str] = []
    pages_text: list[str] = []

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                if not text.strip():
                    warnings.append(f"empty_page:{i + 1}")
                else:
                    pages_text.append(text)
    except Exception as exc:
        raise ParseError(f"Failed to parse PDF: {exc}") from exc

    full_text = "\n\n".join(pages_text)
    return ParsedResume(
        text=full_text,
        source_filename=filename,
        file_type="pdf",
        page_count=page_count,
        warnings=warnings,
    )


def parse_docx(file_bytes: bytes, filename: str) -> ParsedResume:
    """Extract text from a DOCX file using python-docx."""
    from docx import Document

    warnings: list[str] = []

    try:
        doc = Document(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ParseError(f"Failed to parse DOCX: {exc}") from exc

    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    full_text = "\n".join(paragraphs)

    return ParsedResume(
        text=full_text,
        source_filename=filename,
        file_type="docx",
        warnings=warnings,
    )


def parse_resume(
    file_bytes: bytes,
    filename: str,
    content_type: str,
) -> ParsedResume:
    """Route to the correct parser based on content type.

    Raises ParseError on parsing failure, ValueError on unsupported type
    or oversized file.
    """
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(
            f"File too large: {len(file_bytes)} bytes (max {MAX_FILE_SIZE})"
        )

    file_type = ACCEPTED_CONTENT_TYPES.get(content_type)

    # Fallback: check file extension if content type is generic
    if file_type is None:
        lower = filename.lower()
        if lower.endswith(".pdf"):
            file_type = "pdf"
        elif lower.endswith(".docx"):
            file_type = "docx"

    if file_type is None:
        raise ValueError(f"Unsupported file type: {content_type}")

    if file_type == "pdf":
        return parse_pdf(file_bytes, filename)
    return parse_docx(file_bytes, filename)
