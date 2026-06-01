"""Resume style presets -> a pandoc ``--reference-doc``.

Users pick a curated ``ResumeStyleSettings`` (preset + accent); this module
turns that choice into a styled Word reference document that pandoc copies its
styles from. We do NOT revive the structured python-docx renderer — pandoc
stays the renderer, we just hand it a styled template.

The base template is pandoc's own default reference doc (so every style pandoc
emits — Title, Heading N, Body Text, Compact bullets — already exists); we open
it with python-docx and mutate the font / size / color / spacing of the styles
that matter, keyed by preset. The result is cached per (preset, accent): there
are only ``len(presets) * len(accents)`` combinations and each is built at most
once per process.
"""

from __future__ import annotations

import io
import subprocess
import tempfile
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from docx import Document
from docx.shared import Pt, RGBColor

from app.models.user_profile import (
    ResumeStyleAccent,
    ResumeStylePreset,
    ResumeStyleSettings,
)

# Heading styles pandoc applies to ``#``/``##``/``###`` markdown headings.
_HEADING_STYLES = ("Heading 1", "Heading 2", "Heading 3")


@dataclass(frozen=True)
class PresetSpec:
    """Server-side typography for a preset. Never exposed to the client."""

    font: str
    body_pt: float
    name_pt: float  # the document Title (resume owner's name)
    heading_pt: float  # section headings (Summary / Experience / ...)
    line_spacing: float
    space_after_pt: float  # paragraph spacing — drives compact vs airy feel


# Keyed by ResumeStylePreset. Tuned so each look is distinct but all stay
# single-column, system-font, ATS-safe.
PRESET_SPECS: dict[ResumeStylePreset, PresetSpec] = {
    "modern": PresetSpec("Calibri", 10.5, 20, 12, 1.12, 6),
    "classic": PresetSpec("Georgia", 10.5, 22, 13, 1.15, 6),
    "compact": PresetSpec("Calibri", 10, 18, 11, 1.0, 3),
    "executive": PresetSpec("Helvetica", 11, 24, 13, 1.2, 8),
}

# Accent applies to the name + section headings only. Hex values are dark
# enough to stay legible when printed mono / read by ATS (which ignores color).
ACCENT_HEX: dict[ResumeStyleAccent, str] = {
    "slate": "#1F2937",
    "navy": "#1E3A5F",
    "black": "#000000",
    "burgundy": "#6B1F2A",
    "forest": "#1E4034",
}


def _rgb(hex_str: str) -> RGBColor:
    return RGBColor.from_string(hex_str.lstrip("#").upper())


@lru_cache(maxsize=1)
def _default_reference_bytes() -> bytes:
    """Pandoc's built-in reference.docx as bytes (cached for the process).

    ``--print-default-data-file`` writes to the ``-o`` target, so we route it
    through a temp file rather than stdout (stdout is not a clean binary
    stream for this flag).
    """
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        subprocess.run(  # noqa: S603
            ["pandoc", "-o", str(tmp_path), "--print-default-data-file", "reference.docx"],  # noqa: S607
            check=True,
            capture_output=True,
            timeout=30,
        )
        return tmp_path.read_bytes()
    finally:
        tmp_path.unlink(missing_ok=True)


def _apply_font(style: Any, *, name: str, size_pt: float) -> None:
    style.font.name = name
    style.font.size = Pt(size_pt)


def _apply_accent(style: Any, color: RGBColor, *, size_pt: float) -> None:
    style.font.color.rgb = color
    style.font.size = Pt(size_pt)
    style.font.bold = True


@lru_cache(maxsize=64)
def _build_reference_docx_cached(
    preset: ResumeStylePreset, accent: ResumeStyleAccent
) -> bytes:
    spec = PRESET_SPECS[preset]
    color = _rgb(ACCENT_HEX[accent])

    doc = Document(io.BytesIO(_default_reference_bytes()))
    style_names = {s.name for s in doc.styles}

    # Body text: font + size + line/paragraph spacing inherit from Normal.
    normal = doc.styles["Normal"]
    _apply_font(normal, name=spec.font, size_pt=spec.body_pt)
    pf = normal.paragraph_format
    pf.line_spacing = spec.line_spacing
    pf.space_after = Pt(spec.space_after_pt)

    # Title = the resume owner's name (pandoc maps the top-level ``#``).
    if "Title" in style_names:
        title = doc.styles["Title"]
        title.font.name = spec.font
        _apply_accent(title, color, size_pt=spec.name_pt)

    # Section headings.
    for heading in _HEADING_STYLES:
        if heading in style_names:
            h = doc.styles[heading]
            h.font.name = spec.font
            _apply_accent(h, color, size_pt=spec.heading_pt)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def build_reference_docx(style: ResumeStyleSettings) -> bytes:
    """Return styled reference-doc bytes for ``style`` (cached per combo)."""
    return _build_reference_docx_cached(style.preset, style.accent)
