"""Canonical markdown serialization for TailoredResume / TailoredCoverLetter.

The tailor pipeline produces structured Pydantic models (LLM tool_use
guarantees the schema). Those structured outputs are immediately
serialized to markdown via the helpers here, and markdown becomes the
source of truth for editing + DOCX rendering.

Goals:
- Stable: same input → same bytes. Lets us hash markdown for the docx
  cache key and detect "no real change" edits.
- ATS-friendly: single-column, no tables, no images, plain headings.
- Pandoc-compatible: renders cleanly via `pandoc -f markdown -t docx`.
"""

from __future__ import annotations

from app.models.tailor import (
    ContactInfo,
    TailoredCoverLetter,
    TailoredResume,
    TailoredRole,
)

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
    """`YYYY-MM` -> `MMM YYYY`. None -> `Present`. Invalid input echoes back."""
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
    return " · ".join(pieces)


def _role_dates(role: TailoredRole) -> str:
    return f"{format_date(role.start)} – {format_date(role.end)}"


def _role_block(role: TailoredRole) -> list[str]:
    lines = [f"### {role.title} — {role.company}"]
    meta = _role_dates(role)
    if role.location:
        meta = f"{meta} · {role.location}"
    lines.append(f"*{meta}*")
    if role.bullets:
        lines.append("")
        for bullet in role.bullets:
            lines.append(f"- {bullet.text}")
    return lines


def to_markdown(resume: TailoredResume) -> str:
    """Render a TailoredResume to canonical markdown."""
    out: list[str] = []
    out.append(f"# {resume.contact.name}")
    contact = _contact_line(resume.contact)
    if contact:
        out.append("")
        out.append(contact)

    if resume.summary:
        out.append("")
        out.append("## Summary")
        out.append("")
        out.append(resume.summary)

    if resume.skills:
        out.append("")
        out.append("## Skills")
        out.append("")
        out.append(", ".join(resume.skills))

    if resume.experience:
        out.append("")
        out.append("## Experience")
        for role in resume.experience:
            out.append("")
            out.extend(_role_block(role))

    if resume.education:
        out.append("")
        out.append("## Education")
        out.append("")
        for edu in resume.education:
            label = edu.school
            if edu.degree:
                label = f"**{edu.school}**, {edu.degree}"
            else:
                label = f"**{edu.school}**"
            if edu.dates:
                label = f"{label} ({edu.dates})"
            out.append(f"- {label}")

    return "\n".join(out).rstrip() + "\n"


def to_markdown_cover_letter(letter: TailoredCoverLetter) -> str:
    """Render a TailoredCoverLetter to canonical markdown."""
    out: list[str] = []
    out.append(f"# {letter.contact.name}")
    contact = _contact_line(letter.contact)
    if contact:
        out.append("")
        out.append(contact)

    if letter.recipient_role:
        out.append("")
        out.append(f"Re: {letter.recipient_role}")
    out.append("")
    out.append(letter.recipient_company)

    out.append("")
    out.append(letter.salutation)

    for paragraph in letter.paragraphs:
        out.append("")
        out.append(paragraph.text)

    out.append("")
    out.append(letter.closing)
    out.append("")
    out.append(letter.signature)

    return "\n".join(out).rstrip() + "\n"
