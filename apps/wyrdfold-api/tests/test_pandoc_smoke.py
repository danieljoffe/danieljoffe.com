"""Smoke test: markdown -> pandoc -> docx -> existing ATS lint passes.

This is the critical compatibility check. If pandoc's default output
fails our docx-byte ATS rules (text frames, image entries, etc.) we'd
need a reference template. We want this test to pass with default
pandoc so the migration is clean.

Skipped automatically if pandoc binary is missing (CI without the
binary; not on dev machine).
"""

from __future__ import annotations

import shutil

import pytest

from app.models.tailor import (
    ContactInfo,
    CoverLetterParagraph,
    TailoredBullet,
    TailoredCoverLetter,
    TailoredEducation,
    TailoredResume,
    TailoredRole,
)
from app.services.ats_lint.linter import lint_docx
from app.services.ats_lint.markdown_linter import lint_markdown
from app.services.docx.pandoc_render import md_to_docx
from app.services.tailor.markdown_render import (
    to_markdown,
    to_markdown_cover_letter,
)

pandoc_required = pytest.mark.skipif(
    shutil.which("pandoc") is None,
    reason="pandoc binary not installed",
)


def _sample_resume() -> TailoredResume:
    return TailoredResume(
        summary="Senior frontend engineer with 8 years building product UIs.",
        contact=ContactInfo(
            name="Daniel Joffe",
            email="daniel@example.com",
            phone="+1 555 123 4567",
            location="San Francisco, CA",
            linkedin="linkedin.com/in/danieljoffe",
        ),
        experience=[
            TailoredRole(
                company="Acme Corp",
                title="Senior Frontend Engineer",
                start="2022-01",
                end=None,
                bullets=[
                    TailoredBullet(text="Led the migration to Next.js."),
                    TailoredBullet(text="Mentored 4 junior engineers."),
                ],
                source_role_ref="role-1",
            ),
        ],
        skills=["React", "TypeScript", "Node.js"],
        education=[
            TailoredEducation(
                school="University of Toronto",
                degree="BSc Computer Science",
                dates="2014–2018",
            ),
        ],
        resume_type="senior-frontend",
    )


def _sample_cover_letter() -> TailoredCoverLetter:
    return TailoredCoverLetter(
        contact=ContactInfo(name="Daniel Joffe", email="daniel@example.com"),
        recipient_company="Acme Corp",
        recipient_role="Senior Frontend Engineer",
        salutation="Dear Hiring Manager,",
        paragraphs=[
            CoverLetterParagraph(text="I am writing to apply for the role."),
            CoverLetterParagraph(text="My experience aligns well."),
        ],
        closing="Sincerely,",
        signature="Daniel Joffe",
    )


def test_resume_markdown_is_stable() -> None:
    """Same input -> same bytes (lets us hash the markdown for cache keys)."""
    resume = _sample_resume()
    a = to_markdown(resume)
    b = to_markdown(resume)
    assert a == b
    assert a.endswith("\n")


def test_resume_markdown_has_required_sections() -> None:
    md = to_markdown(_sample_resume())
    assert "# Daniel Joffe" in md
    assert "## Summary" in md
    assert "## Skills" in md
    assert "## Experience" in md
    assert "## Education" in md
    assert "### Senior Frontend Engineer — Acme Corp" in md


def test_resume_markdown_passes_md_lint() -> None:
    md = to_markdown(_sample_resume())
    result = lint_markdown(md, document_type="resume")
    assert result.ok, [v.model_dump() for v in result.violations]
    # No errors AND no warnings on a clean canonical resume.
    assert result.warnings == [], [v.model_dump() for v in result.warnings]


def test_cover_letter_markdown_passes_md_lint() -> None:
    md = to_markdown_cover_letter(_sample_cover_letter())
    result = lint_markdown(md, document_type="cover_letter")
    assert result.ok, [v.model_dump() for v in result.violations]


@pandoc_required
def test_pandoc_renders_resume_markdown_to_valid_docx() -> None:
    md = to_markdown(_sample_resume())
    docx_bytes = md_to_docx(md)
    # Smallest valid .docx is ~3KB; pandoc output is typically ~10KB.
    assert len(docx_bytes) > 1000
    assert docx_bytes[:2] == b"PK"  # zip signature


@pandoc_required
def test_pandoc_resume_passes_existing_docx_lint() -> None:
    """The critical compatibility check: pandoc default output must pass
    the existing docx-byte ATS lint. If this fails we need a reference
    template (--reference-doc=...).
    """
    md = to_markdown(_sample_resume())
    docx_bytes = md_to_docx(md)
    result = lint_docx(docx_bytes, document_type="resume")
    assert result.ok, [v.model_dump() for v in result.errors]


@pandoc_required
def test_pandoc_cover_letter_passes_existing_docx_lint() -> None:
    md = to_markdown_cover_letter(_sample_cover_letter())
    docx_bytes = md_to_docx(md)
    result = lint_docx(docx_bytes, document_type="cover_letter")
    assert result.ok, [v.model_dump() for v in result.errors]


def test_md_lint_blocks_tables() -> None:
    md = "# Resume\n\n## Experience\n\n| col1 | col2 |\n|------|------|\n| a    | b    |\n"
    result = lint_markdown(md, document_type="resume")
    codes = {v.code for v in result.errors}
    assert "no_tables" in codes


def test_md_lint_blocks_images() -> None:
    md = "# Resume\n\n## Experience\n\n![logo](https://example.com/logo.png)\n"
    result = lint_markdown(md, document_type="resume")
    codes = {v.code for v in result.errors}
    assert "no_inline_images" in codes


def test_md_lint_requires_experience_heading_for_resume() -> None:
    md = "# Resume\n\n## Summary\n\nA summary.\n"
    result = lint_markdown(md, document_type="resume")
    codes = {v.code for v in result.errors}
    assert "experience_heading" in codes


def test_md_lint_does_not_require_experience_for_cover_letter() -> None:
    md = "# Daniel\n\nDear hiring manager,\n\nI am applying.\n\nSincerely,\n"
    result = lint_markdown(md, document_type="cover_letter")
    assert result.ok, [v.model_dump() for v in result.errors]


def test_md_lint_blocks_empty() -> None:
    result = lint_markdown("", document_type="resume")
    codes = {v.code for v in result.errors}
    assert "empty" in codes
