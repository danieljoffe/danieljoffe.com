"""Resume style presets: reference-doc building, render, and cache key.

The pandoc-backed render tests are skipped automatically when the binary is
missing (CI without pandoc); the pure model/hash tests always run.
"""

from __future__ import annotations

import hashlib
import itertools
import shutil

import pytest

from app.models.user_profile import ResumeStyleSettings
from app.services.docx.pandoc_render import md_payload_hash, md_to_docx
from app.services.docx.style import (
    ACCENT_HEX,
    PRESET_SPECS,
    build_reference_docx,
)

pandoc_required = pytest.mark.skipif(
    shutil.which("pandoc") is None,
    reason="pandoc binary not installed",
)

_MD = "# Daniel Joffe\n\n## Summary\n\nSenior engineer.\n\n## Skills\n\nReact\n"

_ALL_COMBOS = list(itertools.product(PRESET_SPECS, ACCENT_HEX))


# -- cache key --------------------------------------------------------------


def test_hash_none_matches_legacy_markdown_only_hash() -> None:
    """A NULL style must hash identically to the pre-feature markdown-only key
    so existing cached docx entries stay valid (no forced re-render)."""
    legacy = hashlib.sha256(_MD.encode("utf-8")).hexdigest()
    assert md_payload_hash(_MD) == legacy
    assert md_payload_hash(_MD, None) == legacy


def test_hash_changes_when_style_is_set() -> None:
    styled = md_payload_hash(_MD, ResumeStyleSettings(preset="classic", accent="navy"))
    assert styled != md_payload_hash(_MD)


def test_hash_differs_per_preset_and_accent() -> None:
    base = ResumeStyleSettings(preset="modern", accent="slate")
    other_preset = ResumeStyleSettings(preset="executive", accent="slate")
    other_accent = ResumeStyleSettings(preset="modern", accent="forest")
    assert md_payload_hash(_MD, base) != md_payload_hash(_MD, other_preset)
    assert md_payload_hash(_MD, base) != md_payload_hash(_MD, other_accent)


def test_hash_is_stable() -> None:
    s = ResumeStyleSettings(preset="compact", accent="black")
    assert md_payload_hash(_MD, s) == md_payload_hash(_MD, s)


# -- reference doc building -------------------------------------------------


@pandoc_required
@pytest.mark.parametrize(("preset", "accent"), _ALL_COMBOS)
def test_every_combo_builds_a_valid_reference_docx(preset: str, accent: str) -> None:
    ref = build_reference_docx(ResumeStyleSettings(preset=preset, accent=accent))
    assert ref[:2] == b"PK"  # zip signature
    assert len(ref) > 1000


@pandoc_required
def test_reference_docx_is_cached() -> None:
    """Same combo returns the identical cached object (no rebuild)."""
    s = ResumeStyleSettings(preset="modern", accent="slate")
    assert build_reference_docx(s) is build_reference_docx(s)


# -- styled render ----------------------------------------------------------


@pandoc_required
def test_styled_render_produces_valid_docx() -> None:
    out = md_to_docx(_MD, ResumeStyleSettings(preset="classic", accent="burgundy"))
    assert out[:2] == b"PK"
    assert len(out) > 1000


@pandoc_required
def test_unstyled_render_still_works() -> None:
    out = md_to_docx(_MD)
    assert out[:2] == b"PK"


@pandoc_required
def test_styled_output_passes_ats_lint() -> None:
    """Styling must not break the Greenhouse-floor docx ATS rules."""
    from app.services.ats_lint.linter import lint_docx

    md = (
        "# Daniel Joffe\n\n## Summary\n\nSenior engineer.\n\n"
        "## Experience\n\n### Eng — Acme\n\n- Shipped things.\n\n## Skills\n\nReact\n"
    )
    for preset in PRESET_SPECS:
        out = md_to_docx(md, ResumeStyleSettings(preset=preset, accent="navy"))
        result = lint_docx(out, document_type="resume")
        assert result.ok, (preset, [v.model_dump() for v in result.errors])
