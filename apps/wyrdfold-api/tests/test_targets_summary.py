"""Tests for the targets list-summary projection (#863).

``_summarize_target`` derives ``keyword_count`` / ``category_count`` from the
``scoring_profile`` JSONB so list endpoints can ship the counts without the
heavy column itself.
"""

from app.models.targets import JobTargetSummary
from app.services.targets.crud import _summarize_target


def _row(scoring_profile: object) -> dict[str, object]:
    return {
        "id": "t-1",
        "label": "Senior Frontend Engineer",
        "description": "desc",
        "normalized_label": "senior frontend engineer",
        "scoring_profile": scoring_profile,
        "activation_status": "ready",
        "profile_version": 2,
        "is_active": True,
        "seniority_hint": "senior",
        "created_at": "2026-04-24T00:00:00Z",
        "updated_at": "2026-04-30T00:00:00Z",
    }


def test_sums_keywords_across_categories():
    summary = _summarize_target(
        _row(
            {
                "categories": {
                    "core_skills": {
                        "keywords": {"React": 3, "TypeScript": 2},
                        "weight": 2.0,
                    },
                    "tooling": {"keywords": {"Vite": 1}, "weight": 0.5},
                }
            }
        )
    )
    assert summary.keyword_count == 3
    assert summary.category_count == 2


def test_empty_categories_collapse_to_zero():
    summary = _summarize_target(_row({"categories": {}}))
    assert summary.keyword_count == 0
    assert summary.category_count == 0


def test_legacy_null_profile_collapses_to_zero():
    """Legacy rows can have NULL scoring_profile (pre-derivation). The
    projection must not blow up — it reports 0/0."""
    summary = _summarize_target(_row(None))
    assert summary.keyword_count == 0
    assert summary.category_count == 0


def test_carries_light_fields():
    summary = _summarize_target(_row({"categories": {}}))
    assert summary.id == "t-1"
    assert summary.label == "Senior Frontend Engineer"
    assert summary.activation_status == "ready"
    assert summary.profile_version == 2
    assert summary.seniority_hint == "senior"


def test_summary_model_omits_heavy_fields():
    """The wire shape (#863) must not carry the heavy JSONB columns."""
    fields = JobTargetSummary.model_fields
    assert "scoring_profile" not in fields
    assert "search_keywords" not in fields
    assert "example_promising_titles" not in fields
