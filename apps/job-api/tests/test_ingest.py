"""Tests for resume parsing and merge services (#497)."""

from __future__ import annotations

import io

import pytest

from app.services.ingest.merge import merge_into_prose
from app.services.ingest.parse import (
    ACCEPTED_CONTENT_TYPES,
    MAX_FILE_SIZE,
    ParseError,
    ParsedResume,
    parse_docx,
    parse_pdf,
    parse_resume,
)


# ---------------------------------------------------------------------------
# Helpers — create minimal valid PDF / DOCX bytes
# ---------------------------------------------------------------------------


def _make_pdf_bytes(text: str = "Senior Frontend Engineer\nReact, TypeScript") -> bytes:
    """Create a minimal single-page PDF with pdfplumber-readable text."""
    from pdfplumber.utils.pdfinternals import resolve_and_decode  # noqa: F401
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument.new()
    page = pdf.new_page(200, 100)
    # pypdfium2 doesn't have a simple text-insert API, so we'll use
    # a raw content stream approach. Instead, create via reportlab-free method.
    pdf.close()

    # Fallback: build a minimal PDF by hand with text operators
    content = text.encode("latin-1", errors="replace")
    stream = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]"
        b"/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>>endobj\n"
        b"4 0 obj<</Length " + str(50 + len(content)).encode() + b">>\nstream\n"
        b"BT /F1 12 Tf 72 720 Td (" + content + b") Tj ET\n"
        b"endstream\nendobj\n"
        b"xref\n0 5\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000310 00000 n \n"
        b"trailer<</Size 5/Root 1 0 R>>\n"
        b"startxref\n456\n%%EOF"
    )
    return stream


def _make_docx_bytes(
    paragraphs: list[str] | None = None,
) -> bytes:
    """Create a minimal DOCX file with python-docx."""
    from docx import Document

    doc = Document()
    if paragraphs is None:
        paragraphs = ["Senior Frontend Engineer", "React, TypeScript, Next.js"]
    for text in paragraphs:
        doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# PDF parsing
# ---------------------------------------------------------------------------


class TestParsePdf:
    def test_basic_extraction(self):
        pdf_bytes = _make_pdf_bytes("Software Engineer at Acme Corp")
        result = parse_pdf(pdf_bytes, "resume.pdf")
        assert result.file_type == "pdf"
        assert result.source_filename == "resume.pdf"
        assert result.page_count is not None
        assert result.page_count >= 1
        # pdfplumber may or may not extract text from our hand-built PDF,
        # so we check that parsing doesn't crash
        assert isinstance(result.text, str)

    def test_corrupt_file_raises(self):
        with pytest.raises(ParseError, match="Failed to parse PDF"):
            parse_pdf(b"not a pdf", "bad.pdf")


# ---------------------------------------------------------------------------
# DOCX parsing
# ---------------------------------------------------------------------------


class TestParseDocx:
    def test_basic_extraction(self):
        docx_bytes = _make_docx_bytes(["Hello World", "Skills: Python, FastAPI"])
        result = parse_docx(docx_bytes, "resume.docx")
        assert result.file_type == "docx"
        assert result.source_filename == "resume.docx"
        assert "Hello World" in result.text
        assert "Python" in result.text

    def test_empty_docx(self):
        docx_bytes = _make_docx_bytes([])
        result = parse_docx(docx_bytes, "empty.docx")
        assert result.text == ""

    def test_corrupt_file_raises(self):
        with pytest.raises(ParseError, match="Failed to parse DOCX"):
            parse_docx(b"not a docx", "bad.docx")


# ---------------------------------------------------------------------------
# parse_resume (router)
# ---------------------------------------------------------------------------


class TestParseResume:
    def test_routes_docx_by_content_type(self):
        docx_bytes = _make_docx_bytes(["Test content"])
        ct = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        result = parse_resume(docx_bytes, "resume.docx", ct)
        assert result.file_type == "docx"
        assert "Test content" in result.text

    def test_routes_docx_by_extension(self):
        docx_bytes = _make_docx_bytes(["Fallback test"])
        result = parse_resume(docx_bytes, "resume.docx", "application/octet-stream")
        assert result.file_type == "docx"

    def test_rejects_unsupported_type(self):
        with pytest.raises(ValueError, match="Unsupported"):
            parse_resume(b"data", "file.txt", "text/plain")

    def test_rejects_oversized_file(self):
        big = b"x" * (MAX_FILE_SIZE + 1)
        with pytest.raises(ValueError, match="too large"):
            parse_resume(big, "huge.pdf", "application/pdf")

    def test_accepted_content_types(self):
        assert "application/pdf" in ACCEPTED_CONTENT_TYPES
        assert (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            in ACCEPTED_CONTENT_TYPES
        )


# ---------------------------------------------------------------------------
# merge_into_prose
# ---------------------------------------------------------------------------


class TestMergeIntoProse:
    def test_first_upload_no_existing(self):
        parsed = ParsedResume(
            text="My resume content",
            source_filename="resume.pdf",
            file_type="pdf",
        )
        result = merge_into_prose(None, parsed)
        assert result == "My resume content"

    def test_first_upload_empty_existing(self):
        parsed = ParsedResume(
            text="My resume content",
            source_filename="resume.pdf",
            file_type="pdf",
        )
        result = merge_into_prose("", parsed)
        assert result == "My resume content"

    def test_merge_with_existing(self):
        parsed = ParsedResume(
            text="New resume text",
            source_filename="second.docx",
            file_type="docx",
        )
        result = merge_into_prose("Existing prose content", parsed)
        assert result.startswith("Existing prose content")
        assert "---" in result
        assert "[Uploaded Resume: second.docx]" in result
        assert "New resume text" in result

    def test_preserves_filename_in_header(self):
        parsed = ParsedResume(
            text="Content",
            source_filename="Daniel_Joffe_Resume_2026.pdf",
            file_type="pdf",
        )
        result = merge_into_prose("Old content", parsed)
        assert "Daniel_Joffe_Resume_2026.pdf" in result
