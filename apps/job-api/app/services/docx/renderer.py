"""TailoredResume -> .docx bytes.

Greenhouse-floor ATS constraints:
- Single column. No tables. No text boxes. No images.
- System font: Calibri (python-docx default).
- Standard section headings: Summary / Experience / Skills / Education.
- Plain bullet style via python-docx's built-in "List Bullet" paragraph style.
- Selectable text (the default — we do not touch text-frame or image behavior).

Deterministic for a given input: no random IDs, no timestamps in the body.
The `core.xml` metadata python-docx writes has timestamps; tests that care
inspect document.xml structurally rather than comparing bytes.
"""

from __future__ import annotations

import io

from docx import Document

from app.models.tailor import (
    ContactInfo,
    TailoredCoverLetter,
    TailoredResume,
    TailoredRole,
)

SECTION_SUMMARY = "Summary"
SECTION_EXPERIENCE = "Experience"
SECTION_SKILLS = "Skills"
SECTION_EDUCATION = "Education"

_MONTH_ABBR = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]


def format_date(date_str: str | None) -> str:
    """`YYYY-MM` -> `MMM YYYY`. None -> `Present`. Invalid input -> echo."""
    if date_str is None:
        return "Present"
    parts = date_str.split("-")
    if len(parts) != 2:
        return date_str
    try:
        month_i = int(parts[1])
    except ValueError:
        return date_str
    if not 1 <= month_i <= 12:
        return date_str
    return f"{_MONTH_ABBR[month_i]} {parts[0]}"


def _contact_line(contact: ContactInfo) -> str:
    pieces: list[str] = []
    if contact.location:
        pieces.append(contact.location)
    if contact.email:
        pieces.append(contact.email)
    if contact.phone:
        pieces.append(contact.phone)
    if contact.linkedin:
        pieces.append(contact.linkedin)
    if contact.website:
        pieces.append(contact.website)
    return "  |  ".join(pieces)


def _role_header(role: TailoredRole) -> str:
    dates = f"{format_date(role.start)} - {format_date(role.end)}"
    if role.location:
        return f"{role.title}, {role.company}  ·  {dates}  ·  {role.location}"
    return f"{role.title}, {role.company}  ·  {dates}"


def render_docx(resume: TailoredResume) -> bytes:
    """Render a TailoredResume to Greenhouse-friendly `.docx` bytes."""
    doc = Document()

    # ---- Contact header -------------------------------------------------
    title = doc.add_heading(resume.contact.name, level=0)
    for run in title.runs:
        run.font.name = "Calibri"
    contact_line = _contact_line(resume.contact)
    if contact_line:
        doc.add_paragraph(contact_line)

    # ---- Summary --------------------------------------------------------
    if resume.summary:
        doc.add_heading(SECTION_SUMMARY, level=1)
        doc.add_paragraph(resume.summary)

    # ---- Experience -----------------------------------------------------
    if resume.experience:
        doc.add_heading(SECTION_EXPERIENCE, level=1)
        for role in resume.experience:
            header_p = doc.add_paragraph()
            header_run = header_p.add_run(_role_header(role))
            header_run.bold = True
            for bullet in role.bullets:
                doc.add_paragraph(bullet.text, style="List Bullet")

    # ---- Skills ---------------------------------------------------------
    if resume.skills:
        doc.add_heading(SECTION_SKILLS, level=1)
        doc.add_paragraph(", ".join(resume.skills))

    # ---- Education ------------------------------------------------------
    if resume.education:
        doc.add_heading(SECTION_EDUCATION, level=1)
        for edu in resume.education:
            header = edu.school
            if edu.degree:
                header = f"{edu.degree}, {edu.school}"
            header_p = doc.add_paragraph()
            header_p.add_run(header).bold = True
            if edu.dates:
                doc.add_paragraph(edu.dates)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Cover letter renderer
# ---------------------------------------------------------------------------


def render_cover_letter_docx(letter: TailoredCoverLetter) -> bytes:
    """Render a TailoredCoverLetter to ATS-friendly `.docx` bytes.

    Simpler structure than a resume: contact header, recipient, salutation,
    paragraphs, closing, signature. Single column, Calibri, plain paragraphs.
    No headings (cover letters don't use them).
    """
    doc = Document()

    # Contact header: name + contact line
    title = doc.add_paragraph()
    name_run = title.add_run(letter.contact.name)
    name_run.bold = True
    contact_line = _contact_line(letter.contact)
    if contact_line:
        doc.add_paragraph(contact_line)

    doc.add_paragraph()  # blank line before recipient

    # Recipient block
    recipient = letter.recipient_company
    if letter.recipient_role:
        doc.add_paragraph(f"Re: {letter.recipient_role}")
    doc.add_paragraph(recipient)

    doc.add_paragraph()  # blank line before salutation

    # Salutation
    doc.add_paragraph(letter.salutation)

    # Body paragraphs
    for paragraph in letter.paragraphs:
        doc.add_paragraph(paragraph.text)

    # Closing
    doc.add_paragraph()
    doc.add_paragraph(letter.closing)
    doc.add_paragraph(letter.signature)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
