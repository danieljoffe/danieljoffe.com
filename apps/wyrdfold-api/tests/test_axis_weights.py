"""Tests for the axis-weights helper (PR E of streamlined-target plan)."""

from __future__ import annotations

import pytest

from app.models.targets import AxisWeights
from app.services.fit.axis_weights import (
    display_score_from_axes,
    display_score_or_passthrough,
)

# ---- AxisWeights model ----------------------------------------------------


def test_axis_weights_defaults_are_equal_quartile() -> None:
    w = AxisWeights()
    assert w.title_fit == 0.25
    assert w.skills_fit == 0.25
    assert w.seniority_fit == 0.25
    assert w.domain_fit == 0.25
    assert w.is_default() is True


def test_axis_weights_is_default_false_when_any_axis_differs() -> None:
    w = AxisWeights(title_fit=0.4, skills_fit=0.3, seniority_fit=0.2, domain_fit=0.1)
    assert w.is_default() is False


def test_axis_weights_rejects_out_of_range() -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        AxisWeights(title_fit=1.5)
    with pytest.raises(ValidationError):
        AxisWeights(title_fit=-0.1)


# ---- display_score_from_axes ---------------------------------------------


def test_default_weights_reproduce_axis_mean() -> None:
    """Equal-quartile weights compute the straight average of the axes."""
    axes = {"title_fit": 80, "skills_fit": 70, "seniority_fit": 60, "domain_fit": 50}
    w = AxisWeights()  # 0.25 each
    # Mean = 65; round(65.0) = 65.
    assert display_score_from_axes(axes, w) == 65


def test_title_heavy_weights_lift_title_dominant_jobs() -> None:
    """User who weights title 0.7: a title=95 job scores higher than the mean."""
    axes = {"title_fit": 95, "skills_fit": 60, "seniority_fit": 60, "domain_fit": 60}
    w = AxisWeights(title_fit=0.7, skills_fit=0.1, seniority_fit=0.1, domain_fit=0.1)
    # Weighted = 0.7*95 + 0.1*60 + 0.1*60 + 0.1*60 = 84.5 → round = 84 or 85
    # (depending on banker's rounding). Either is "noticeably higher than 70 mean".
    out = display_score_from_axes(axes, w)
    assert 84 <= out <= 85


def test_domain_heavy_weights_demote_off_domain_jobs() -> None:
    """User who weights domain 0.6: a strong-but-off-domain job lands lower."""
    axes = {"title_fit": 80, "skills_fit": 80, "seniority_fit": 80, "domain_fit": 30}
    w = AxisWeights(title_fit=0.1, skills_fit=0.15, seniority_fit=0.15, domain_fit=0.6)
    # Weighted = 8 + 12 + 12 + 18 = 50 → round = 50
    assert display_score_from_axes(axes, w) == 50


def test_renormalises_when_weights_dont_sum_to_one() -> None:
    """Weights summing to 2 still produce a 0-100 score, not 0-200."""
    axes = {"title_fit": 80, "skills_fit": 80, "seniority_fit": 80, "domain_fit": 80}
    w = AxisWeights(title_fit=0.5, skills_fit=0.5, seniority_fit=0.5, domain_fit=0.5)
    # Without renormalisation this would be 160 → clipped to 100 or whatever.
    # With renormalisation: 160 / 2.0 = 80.
    assert display_score_from_axes(axes, w) == 80


def test_zero_total_weights_returns_zero() -> None:
    """All-zero weights would divide-by-zero; we return 0 instead."""
    axes = {"title_fit": 80, "skills_fit": 70, "seniority_fit": 60, "domain_fit": 50}
    w = AxisWeights(title_fit=0, skills_fit=0, seniority_fit=0, domain_fit=0)
    assert display_score_from_axes(axes, w) == 0


def test_missing_axes_treated_as_zero() -> None:
    """Phase 1-only rows (no axis_scores) score 0, so the caller's
    passthrough wrapper falls back to the raw score instead."""
    assert display_score_from_axes({}, AxisWeights()) == 0
    assert display_score_from_axes(None, AxisWeights()) == 0


def test_partial_axes_uses_only_present_fields() -> None:
    """Sonnet sometimes omits an axis; missing axes contribute 0."""
    axes = {"title_fit": 100, "skills_fit": 100}  # seniority + domain missing
    w = AxisWeights()
    # (100 + 100 + 0 + 0) / 4 = 50
    assert display_score_from_axes(axes, w) == 50


# ---- display_score_or_passthrough ----------------------------------------


def test_passthrough_when_weights_none() -> None:
    """NULL weights (default state) returns the existing raw score —
    behaviorally neutral until the user opts in."""
    axes = {"title_fit": 80, "skills_fit": 70, "seniority_fit": 60, "domain_fit": 50}
    out = display_score_or_passthrough(axes, fallback_score=72, weights=None)
    assert out == 72


def test_passthrough_when_no_axes_even_with_weights() -> None:
    """Phase 1-only rows pass through their existing score so they
    don't all collapse to 0 the moment a user sets weights."""
    out = display_score_or_passthrough(None, fallback_score=45, weights=AxisWeights())
    assert out == 45
    out2 = display_score_or_passthrough({}, fallback_score=45, weights=AxisWeights())
    assert out2 == 45


def test_weighted_when_both_present() -> None:
    axes = {"title_fit": 90, "skills_fit": 70, "seniority_fit": 70, "domain_fit": 60}
    w = AxisWeights(title_fit=0.5, skills_fit=0.2, seniority_fit=0.2, domain_fit=0.1)
    out = display_score_or_passthrough(axes, fallback_score=72, weights=w)
    # 0.5*90 + 0.2*70 + 0.2*70 + 0.1*60 = 45+14+14+6 = 79
    assert out == 79
