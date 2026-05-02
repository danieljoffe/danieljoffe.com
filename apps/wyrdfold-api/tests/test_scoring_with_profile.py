"""Tests for target-based scoring (#495)."""

from app.models.targets import (
    CategoryProfile,
    DomainProfile,
    NegativeProfile,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.scoring import score_job_with_profile


def _profile(
    *,
    core: dict[str, int] | None = None,
    core_weight: float = 2.0,
    secondary: dict[str, int] | None = None,
    secondary_weight: float = 1.0,
    seniority_level: str | None = "senior",
    seniority_signals: list[str] | None = None,
    domain_signals: list[str] | None = None,
    domain_weight: float = 0.5,
    negative_keywords: list[str] | None = None,
    negative_weight: float = -10.0,
) -> ScoringProfile:
    cats: dict[str, CategoryProfile] = {}
    if core is not None:
        cats["core_skills"] = CategoryProfile(keywords=core, weight=core_weight)
    if secondary is not None:
        cats["secondary_skills"] = CategoryProfile(
            keywords=secondary, weight=secondary_weight
        )
    return ScoringProfile(
        categories=cats,
        seniority=SeniorityProfile(
            level=seniority_level, signals=seniority_signals or []
        ),
        domain=DomainProfile(signals=domain_signals or [], weight=domain_weight),
        negative=NegativeProfile(
            keywords=negative_keywords or [], weight=negative_weight
        ),
    )


def test_high_score_for_ideal_match():
    profile = _profile(
        core={"React": 3, "TypeScript": 3, "Next.js": 3},
        seniority_signals=["5+ years", "lead"],
        domain_signals=["fintech"],
    )
    result = score_job_with_profile(
        "Senior Frontend Engineer",
        "<p>We need a senior engineer with 5+ years of React and TypeScript "
        "experience. Next.js required. Fintech domain. Must lead a team.</p>",
        profile,
    )
    assert result.score > 50
    assert not result.excluded
    assert len(result.matched_keywords) > 0


def test_low_score_for_poor_match():
    profile = _profile(
        core={"React": 3, "TypeScript": 3},
    )
    result = score_job_with_profile(
        "Data Scientist",
        "<p>Looking for a data scientist with Python and SQL skills.</p>",
        profile,
    )
    assert result.score == 0
    assert len(result.matched_keywords) == 0


def test_excluded_for_negative_keyword():
    profile = _profile(
        core={"React": 3},
        negative_keywords=["junior", "intern"],
    )
    result = score_job_with_profile(
        "Junior Frontend Developer",
        "<p>Looking for a junior React developer.</p>",
        profile,
    )
    assert result.excluded
    assert result.score == 0


def test_per_keyword_weights_respected():
    profile = _profile(
        core={"React": 3, "jQuery": 1},
    )
    # Only React matches
    result_react = score_job_with_profile(
        "Frontend Engineer",
        "<p>Must know React.</p>",
        profile,
    )
    # Only jQuery matches
    result_jquery = score_job_with_profile(
        "Frontend Engineer",
        "<p>Must know jQuery.</p>",
        profile,
    )
    # React (weight 3) should contribute more than jQuery (weight 1)
    assert result_react.score > result_jquery.score


def test_category_weight_multiplier():
    # A core_skills match (high category weight) should contribute more to
    # the score than a secondary_skills match (low category weight) when
    # both categories are present in the same profile.
    profile = _profile(
        core={"React": 3},
        core_weight=2.0,
        secondary={"Docker": 3},
        secondary_weight=0.5,
    )

    # Only core matches → large fraction of max possible
    result_core = score_job_with_profile(
        "Engineer", "<p>React developer.</p>", profile
    )
    # Only secondary matches → small fraction of max possible
    result_secondary = score_job_with_profile(
        "Engineer", "<p>Docker expert.</p>", profile
    )

    assert result_core.score > result_secondary.score


def test_seniority_signals_contribute():
    profile = _profile(
        core={"React": 3},
        seniority_signals=["5+ years", "lead", "mentor"],
    )
    result = score_job_with_profile(
        "Senior Engineer",
        "<p>React. 5+ years experience. Must mentor junior engineers and lead projects.</p>",
        profile,
    )
    assert result.breakdown.seniority_signals > 0


def test_domain_signals_contribute():
    profile = _profile(
        core={"React": 3},
        domain_signals=["fintech", "payments"],
        domain_weight=1.0,
    )
    result = score_job_with_profile(
        "Frontend Engineer",
        "<p>React engineer for our fintech payments platform.</p>",
        profile,
    )
    assert result.breakdown.domain_skills > 0


def test_score_clamped_to_100():
    # Lots of high-weight keywords to push score over 100
    profile = _profile(
        core={f"skill{i}": 3 for i in range(20)},
        core_weight=3.0,
    )
    html = "<p>" + " ".join(f"skill{i}" for i in range(20)) + "</p>"
    result = score_job_with_profile("Engineer", html, profile)
    assert result.score <= 100


def test_score_clamped_to_zero():
    profile = _profile(
        core={"React": 1},
        negative_keywords=["java required", "c#"],
        negative_weight=-50,
    )
    result = score_job_with_profile(
        "Java Developer",
        "<p>Java required. C# experience a plus.</p>",
        profile,
    )
    assert result.score == 0


def test_empty_profile_scores_zero():
    result = score_job_with_profile(
        "Senior Engineer",
        "<p>React TypeScript Next.js</p>",
        ScoringProfile(),
    )
    assert result.score == 0
    assert not result.excluded


def test_matched_keywords_deduplicated():
    profile = _profile(core={"React": 3})
    result = score_job_with_profile(
        "React Engineer",
        "<p>React React React everywhere.</p>",
        profile,
    )
    assert result.matched_keywords.count("React") == 1
