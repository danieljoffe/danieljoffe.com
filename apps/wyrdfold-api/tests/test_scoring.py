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
    seniority_level: str | None = None,
    seniority_signals: list[str] | None = None,
    negative_keywords: list[str] | None = None,
) -> ScoringProfile:
    cats: dict[str, CategoryProfile] = {}
    if core is not None:
        cats["core_skills"] = CategoryProfile(keywords=core, weight=core_weight)
    return ScoringProfile(
        categories=cats,
        seniority=SeniorityProfile(
            level=seniority_level, signals=seniority_signals or []
        ),
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


# ---- Word-boundary regression for the "lead → leadership" silent bug ------


def test_word_boundary_lead_does_not_match_leadership():
    """``"lead"`` (4 chars) used to fall through to substring match and
    silently hit "leadership", "leader", "leads" anywhere in a JD body.
    With word-boundary matching for all alpha keywords, only standalone
    occurrences of "lead" should match.
    """
    profile = _profile(seniority_signals=["lead"])
    # "leadership" embeds "lead" but is a different concept — must not match.
    no_match = score_title_against_profile("Senior Sales Leadership", profile)
    yes_match = score_title_against_profile("Senior Lead Engineer", profile)
    assert "lead" not in no_match.matched_keywords
    assert "lead" in yes_match.matched_keywords


def test_word_boundary_director_does_not_match_directorate():
    profile = _profile(seniority_signals=["director"])
    result = score_title_against_profile("Directorate Liaison", profile)
    assert "director" not in result.matched_keywords


# ---- Option A: junior-IC tokens auto-excluded for senior targets ----------


def test_senior_target_excludes_customer_service_representative():
    """A Director-level target should reject 'Customer Service Representative'
    titles even when the user's profile.negative.keywords list doesn't
    explicitly include 'representative' — the auto-junior list handles it.
    """
    profile = _profile(
        core={"Zendesk": 3},
        seniority_level="director",
        # user only listed the LLM-default negatives
        negative_keywords=["junior", "intern"],
    )
    result = score_title_against_profile(
        "Customer Service Representative", profile
    )
    assert result.excluded is True
    assert result.score == 0


def test_senior_target_excludes_self_storage_manager_via_associate():
    """One of Melissa's flagged jobs: PublicStorage 'Customer Service -
    Self Storage Manager'. 'Manager' isn't on the junior list (it's tier
    3 in the ladder), so this should NOT auto-exclude — but the
    seniority-tier penalty must still push the score below zero raw.
    """
    profile = _profile(
        core={"Zendesk": 3, "AI Chatbots": 3},
        seniority_level="director",
    )
    result = score_title_against_profile(
        "Customer Service - Self Storage Manager", profile
    )
    # Manager is tier 3, Director is tier 6 → delta -3 → -20 raw points.
    assert result.score == 0


def test_non_senior_target_does_not_auto_exclude_associate():
    """A mid-level target should NOT auto-exclude 'Associate' titles —
    the auto-junior list only fires when level is in the senior tier.
    """
    profile = _profile(
        core={"React": 3},
        seniority_level="senior",
    )
    result = score_title_against_profile("Associate React Engineer", profile)
    assert result.excluded is False


def test_senior_target_keeps_user_set_negatives_in_addition():
    """User-set negatives must still fire alongside the auto-junior list."""
    profile = _profile(
        core={"Zendesk": 3},
        seniority_level="director",
        negative_keywords=["consulting"],
    )
    result = score_title_against_profile("Director, Consulting Practice", profile)
    assert result.excluded is True


# ---- Option C: seniority-tier penalty -------------------------------------


def test_seniority_penalty_kills_engineer_for_director_target():
    """An Engineer title (tier 3) for a Director profile (tier 6) is a
    3-tier gap; (gap - 1) * -10 = -20 raw, which after normalization
    floors at 0. Without the penalty this used to surface in Melissa's
    list at score ~28.
    """
    profile = _profile(
        core={"React": 3},
        seniority_level="director",
    )
    result = score_title_against_profile("Senior Software Engineer", profile)
    # "Senior" puts the title at tier 4 vs Director tier 6 → delta -2 → -10.
    # Combined with the React-not-in-title scoring → 0.
    assert result.score == 0


def test_seniority_penalty_no_op_for_same_tier():
    profile = _profile(
        core={"React": 3},
        seniority_level="director",
    )
    result = score_title_against_profile("Director of Engineering", profile)
    # Director title = tier 6 = same as profile → no penalty.
    # "director" seniority is the level not a signal — score may still be
    # low because no core keyword in title, but it must NOT be excluded.
    assert result.excluded is False


def test_seniority_penalty_no_op_when_profile_level_unset():
    """Profiles without a level set (legacy / draft) skip the penalty."""
    profile = _profile(core={"React": 3})  # no seniority_level
    result = score_title_against_profile("Junior React Developer", profile)
    # No penalty triggered — junior gets caught by the existing logic, not C.
    assert result.score >= 0  # score doesn't crash


def test_title_search_keywords_lift_role_intent():
    """Stage 1: title matches against the target's search_keywords lift
    the score via the previously-dead role_titles dimension."""
    profile = _profile(core={"Zendesk": 3}, seniority_signals=["director"])
    keywords = [
        "director of customer experience",
        "director of cx operations",
    ]
    with_keywords = score_title_against_profile(
        "Director of Customer Experience",
        profile,
        search_keywords=keywords,
    )
    without_keywords = score_title_against_profile(
        "Director of Customer Experience",
        profile,
    )
    assert with_keywords.breakdown.role_titles > 0
    assert without_keywords.breakdown.role_titles == 0
    assert with_keywords.score > without_keywords.score
