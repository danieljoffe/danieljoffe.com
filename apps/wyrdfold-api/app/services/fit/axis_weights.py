"""Apply user-tunable axis weights to a Phase 2 axis_scores row.

PR E of plan-wyrdfold-streamlined-target.md. The /jobs router uses
this helper to translate ``(axis_scores, weights)`` into a
``display_score`` at read time. No DB writes, no LLM calls.

Default-quartile weights (0.25 each) reproduce a simple axis-mean,
which is close to but not identical to Sonnet's holistic
``score`` — the equality only holds in expectation. For the
no-weights case the router passes the raw ``score`` through unchanged
(see ``display_score_or_passthrough`` below). Adjusting weights only
takes effect AFTER the user explicitly opts in.
"""

from __future__ import annotations

from app.models.targets import AxisWeights

# The four axes in their canonical order. Keep in sync with the
# ``AxisScores`` model in ``fit/job_fit.py`` — the same names are
# used everywhere.
_AXES = ("title_fit", "skills_fit", "seniority_fit", "domain_fit")


def display_score_from_axes(
    axes: dict[str, int] | None, weights: AxisWeights
) -> int:
    """Weighted average of the four axes, rescaled to a 0-100 integer.

    Weights are renormalised at read time so the user can't accidentally
    inflate or deflate the score by entering values that sum to > 1 or
    < 1. The output is rounded for display.

    Returns 0 when ``axes`` is None or empty (no Phase 2 data yet) —
    the caller falls back to the legacy ``score`` in that case.
    """
    if not axes:
        return 0
    w_vec = (
        weights.title_fit,
        weights.skills_fit,
        weights.seniority_fit,
        weights.domain_fit,
    )
    total_w = sum(w_vec)
    if total_w <= 0:
        # User set everything to zero — refuse to divide by zero;
        # return 0 so the row sinks to the bottom of the list. The
        # frontend should disallow this anyway, but defend in depth.
        return 0
    weighted = sum(
        int(axes.get(axis, 0)) * w
        for axis, w in zip(_AXES, w_vec, strict=True)
    )
    return round(weighted / total_w)


def display_score_or_passthrough(
    axes: dict[str, int] | None,
    fallback_score: int,
    weights: AxisWeights | None,
) -> int:
    """Convenience for the /jobs router.

    Returns the weighted score when ``weights`` is non-None and the row
    has an ``axes`` payload; otherwise returns the raw ``fallback_score``
    (the existing ``scores.score`` value). NULL weights == "use
    defaults", which for v1 means "no override" — i.e. don't recompute,
    just return Sonnet's holistic score.

    Note: even when weights ARE provided, we only override IF the row
    has axis_scores. Phase 1-only rows (no Phase 2 grade yet) keep
    their raw score so they don't all collapse to 0.
    """
    if weights is None or not axes:
        return fallback_score
    return display_score_from_axes(axes, weights)
