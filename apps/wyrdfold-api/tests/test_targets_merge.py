"""Tests for scoring profile merge logic (#495)."""

from app.models.targets import (
    CategoryProfile,
    DomainProfile,
    NegativeProfile,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.targets.merge import merge_profiles


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
    """Helper to build profiles concisely."""
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


def test_merge_empty_list():
    result = merge_profiles([])
    assert result == ScoringProfile()


def test_merge_single_profile():
    p = _profile(core={"React": 3, "TypeScript": 3})
    result = merge_profiles([p])
    assert result.categories["core_skills"].keywords == {"React": 3, "TypeScript": 3}
    assert result.categories["core_skills"].weight == 2.0


def test_merge_single_is_deep_copy():
    p = _profile(core={"React": 3})
    result = merge_profiles([p])
    # Mutating the result should not affect the original
    result.categories["core_skills"].keywords["React"] = 99
    assert p.categories["core_skills"].keywords["React"] == 3


def test_merge_two_disjoint_keywords():
    a = _profile(core={"React": 3})
    b = _profile(core={"Vue": 2})
    result = merge_profiles([a, b])
    kw = result.categories["core_skills"].keywords
    assert kw["React"] == 3
    assert kw["Vue"] == 2


def test_merge_overlapping_keywords_averaged():
    a = _profile(core={"React": 3})
    b = _profile(core={"React": 1})
    result = merge_profiles([a, b])
    # avg(3,1) = 2.0, rounded = 2
    assert result.categories["core_skills"].keywords["React"] == 2


def test_merge_overlapping_keywords_min_one():
    a = _profile(core={"Bash": 1})
    b = _profile(core={"Bash": 1})
    result = merge_profiles([a, b])
    # avg(1,1) = 1, rounded = 1, min enforced
    assert result.categories["core_skills"].keywords["Bash"] == 1


def test_merge_category_weights_averaged():
    a = _profile(core={"React": 3}, core_weight=2.0)
    b = _profile(core={"React": 3}, core_weight=1.0)
    result = merge_profiles([a, b])
    assert result.categories["core_skills"].weight == 1.5


def test_merge_disjoint_categories():
    a = _profile(core={"React": 3})
    b = _profile(secondary={"Node.js": 2})
    result = merge_profiles([a, b])
    assert "core_skills" in result.categories
    assert "secondary_skills" in result.categories
    assert result.categories["core_skills"].keywords == {"React": 3}
    assert result.categories["secondary_skills"].keywords == {"Node.js": 2}


def test_merge_seniority_mode():
    a = _profile(seniority_level="senior")
    b = _profile(seniority_level="staff")
    c = _profile(seniority_level="senior")
    result = merge_profiles([a, b, c])
    assert result.seniority.level == "senior"  # mode


def test_merge_seniority_signals_union():
    a = _profile(seniority_signals=["5+ years", "lead"])
    b = _profile(seniority_signals=["lead", "mentor"])
    result = merge_profiles([a, b])
    assert "5+ years" in result.seniority.signals
    assert "lead" in result.seniority.signals
    assert "mentor" in result.seniority.signals
    # No duplicates
    assert len(result.seniority.signals) == 3


def test_merge_domain_signals_union():
    a = _profile(domain_signals=["fintech"])
    b = _profile(domain_signals=["fintech", "b2b-saas"])
    result = merge_profiles([a, b])
    assert "fintech" in result.domain.signals
    assert "b2b-saas" in result.domain.signals
    assert len(result.domain.signals) == 2


def test_merge_domain_weight_averaged():
    a = _profile(domain_weight=0.5)
    b = _profile(domain_weight=1.0)
    result = merge_profiles([a, b])
    assert result.domain.weight == 0.75


def test_merge_negative_keywords_union():
    a = _profile(negative_keywords=["junior"])
    b = _profile(negative_keywords=["junior", "intern"])
    result = merge_profiles([a, b])
    assert "junior" in result.negative.keywords
    assert "intern" in result.negative.keywords
    assert len(result.negative.keywords) == 2


def test_merge_negative_keeps_most_negative_weight():
    a = _profile(negative_weight=-10)
    b = _profile(negative_weight=-15)
    result = merge_profiles([a, b])
    assert result.negative.weight == -15
