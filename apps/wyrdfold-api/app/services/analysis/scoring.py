"""Numeric scoring helpers for LLM analysis output.

Converts a Scorecard (from LLM analysis) to a 0-100 numeric score,
and blends it with the keyword score for a final composite score.
"""

from __future__ import annotations

from app.models.analysis import Scorecard

# Blend weights: 60% keyword, 40% LLM
_KEYWORD_WEIGHT = 0.6
_LLM_WEIGHT = 0.4


def scorecard_to_numeric(scorecard: Scorecard) -> float:
    """Convert a Scorecard to a 0-100 numeric score."""
    score = 0.0

    # Skills (up to 40 points)
    high = sum(1 for s in scorecard.skills_matched if s.confidence == "high" and s.matched)
    med = sum(1 for s in scorecard.skills_matched if s.confidence == "medium" and s.matched)
    low = sum(1 for s in scorecard.skills_matched if s.confidence == "low" and s.matched)
    score += min(40, high * 5 + med * 3 + low * 1)

    # Penalize missing skills
    score -= min(15, len(scorecard.skills_missing) * 2)

    # Seniority fit (up to 30 points)
    seniority_map = {"strong": 30, "moderate": 15, "weak": 0}
    score += seniority_map.get(scorecard.seniority_fit, 0)

    # Domain fit (up to 30 points)
    domain_map = {"strong": 30, "moderate": 15, "weak": 0}
    score += domain_map.get(scorecard.domain_fit, 0)

    return max(0, min(100, score))


def blend_scores(keyword_score: int, llm_score: float) -> int:
    """Blend keyword and LLM scores. 60% keyword, 40% LLM."""
    return round(_KEYWORD_WEIGHT * keyword_score + _LLM_WEIGHT * llm_score)
