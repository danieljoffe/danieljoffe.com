"""Tests for scoring functions (title-only and full JD)."""

from app.models.targets import (
    CategoryProfile,
    NegativeProfile,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.scoring import score_title_against_profile, strip_html


def test_strip_html_removes_tags():
    assert strip_html("<p>Hello <strong>world</strong></p>") == "Hello world"


def test_strip_html_handles_empty():
    assert strip_html("") == ""


def test_strip_html_preserves_plain_text():
    assert strip_html("no tags here") == "no tags here"


# ---- score_title_against_profile tests ------------------------------------


def _profile(
    *,
    core: dict[str, int] | None = None,
    core_weight: float = 2.0,
    seniority_signals: list[str] | None = None,
    negative_keywords: list[str] | None = None,
) -> ScoringProfile:
    cats: dict[str, CategoryProfile] = {}
    if core is not None:
        cats["core_skills"] = CategoryProfile(keywords=core, weight=core_weight)
    return ScoringProfile(
        categories=cats,
        seniority=SeniorityProfile(signals=seniority_signals or []),
        negative=NegativeProfile(keywords=negative_keywords or []),
    )


def test_title_matches_core_keywords():
    profile = _profile(core={"React": 3, "TypeScript": 3})
    result = score_title_against_profile("Senior React Engineer", profile)
    assert result.score > 0
    assert "React" in result.matched_keywords


def test_title_no_match_returns_zero():
    profile = _profile(core={"React": 3, "TypeScript": 3})
    result = score_title_against_profile("Data Scientist", profile)
    assert result.score == 0
    assert len(result.matched_keywords) == 0


def test_title_matches_seniority_signals():
    profile = _profile(
        core={"React": 3},
        seniority_signals=["senior", "lead"],
    )
    result = score_title_against_profile("Senior React Lead", profile)
    assert result.breakdown.seniority_signals > 0
    assert "senior" in result.matched_keywords or "lead" in result.matched_keywords


def test_title_excluded_by_negative():
    profile = _profile(
        core={"React": 3},
        negative_keywords=["junior", "intern"],
    )
    result = score_title_against_profile("Junior React Developer", profile)
    assert result.excluded
    assert result.score == 0


def test_title_alias_expansion():
    """Aliases like 'reactjs' should match 'React'."""
    profile = _profile(core={"react": 3})
    result = score_title_against_profile("Senior ReactJS Engineer", profile)
    assert result.score > 0
    assert "react" in result.matched_keywords


def test_title_score_clamped_to_100():
    profile = _profile(
        core={f"skill{i}": 3 for i in range(20)},
        core_weight=5.0,
    )
    title = " ".join(f"skill{i}" for i in range(20))
    result = score_title_against_profile(title, profile)
    assert result.score <= 100


def test_title_empty_profile_scores_zero():
    result = score_title_against_profile("Senior Frontend Engineer", ScoringProfile())
    assert result.score == 0
    assert not result.excluded


def test_title_multiple_keywords():
    profile = _profile(core={"React": 3, "TypeScript": 3, "Next.js": 2})
    result = score_title_against_profile("React TypeScript Engineer", profile)
    assert len(result.matched_keywords) >= 2
    assert result.score > 0
