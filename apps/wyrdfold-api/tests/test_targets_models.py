"""Tests for job target Pydantic models (#495)."""

from app.models.targets import (
    CategoryProfile,
    DomainProfile,
    JobTarget,
    NegativeProfile,
    ScoringProfile,
    SeniorityProfile,
    TargetCreate,
    TargetReferenceJD,
    TargetUpdate,
)

# ---- ScoringProfile --------------------------------------------------------


def test_scoring_profile_defaults():
    p = ScoringProfile()
    assert p.categories == {}
    assert p.seniority.level is None
    assert p.seniority.signals == []
    assert p.domain.signals == []
    assert p.domain.weight == 0.5
    assert p.negative.keywords == []
    assert p.negative.weight == -10.0


def test_scoring_profile_full():
    p = ScoringProfile(
        categories={
            "core_skills": CategoryProfile(
                keywords={"React": 3, "TypeScript": 3}, weight=2.0
            ),
            "secondary_skills": CategoryProfile(
                keywords={"Node.js": 2}, weight=1.0
            ),
        },
        seniority=SeniorityProfile(level="senior", signals=["5+ years", "lead"]),
        domain=DomainProfile(signals=["fintech"], weight=0.5),
        negative=NegativeProfile(keywords=["junior", "intern"], weight=-10),
    )
    assert p.categories["core_skills"].keywords["React"] == 3
    assert p.categories["core_skills"].weight == 2.0
    assert p.seniority.level == "senior"
    assert len(p.negative.keywords) == 2


def test_scoring_profile_round_trip():
    p = ScoringProfile(
        categories={
            "core_skills": CategoryProfile(keywords={"React": 3}, weight=2.0),
        },
        seniority=SeniorityProfile(level="senior", signals=["5+ years"]),
        domain=DomainProfile(signals=["fintech"], weight=0.5),
        negative=NegativeProfile(keywords=["junior"], weight=-10),
    )
    dumped = p.model_dump()
    restored = ScoringProfile.model_validate(dumped)
    assert restored == p


def test_scoring_profile_from_json():
    """Validates the exact JSONB shape stored in the database."""
    raw = {
        "categories": {
            "core_skills": {"keywords": {"React": 3}, "weight": 2.0},
        },
        "seniority": {"level": "senior", "signals": ["5+ years"]},
        "domain": {"signals": ["fintech"], "weight": 0.5},
        "negative": {"keywords": ["junior"], "weight": -10},
    }
    p = ScoringProfile.model_validate(raw)
    assert p.categories["core_skills"].keywords["React"] == 3


def test_category_profile_empty_keywords():
    c = CategoryProfile()
    assert c.keywords == {}
    assert c.weight == 1.0


# ---- Request models --------------------------------------------------------


def test_target_create_minimal():
    t = TargetCreate(label="Senior Frontend Engineer")
    assert t.label == "Senior Frontend Engineer"
    assert t.scoring_profile == ScoringProfile()


def test_target_update_partial():
    u = TargetUpdate(label="Staff Engineer")
    assert u.label == "Staff Engineer"
    assert u.scoring_profile is None
    assert u.is_active is None


# ---- Row models ------------------------------------------------------------


def test_job_target_from_dict():
    raw = {
        "id": "abc-123",
        "label": "Frontend",
        "scoring_profile": {"categories": {}},
        "is_active": True,
        "created_at": "2026-04-24T00:00:00Z",
        "updated_at": "2026-04-24T00:00:00Z",
    }
    t = JobTarget.model_validate(raw)
    assert t.id == "abc-123"
    assert t.scoring_profile.categories == {}
    assert t.profile_version == 1


def test_target_reference_jd_from_dict():
    raw = {
        "id": "ref-1",
        "target_id": "abc-123",
        "jd_url": "https://example.com/job",
        "jd_text": "Senior frontend engineer needed...",
        "extracted_profile": {
            "categories": {"core_skills": {"keywords": {"React": 3}, "weight": 2.0}},
        },
        "created_at": "2026-04-24T00:00:00Z",
    }
    jd = TargetReferenceJD.model_validate(raw)
    assert jd.extracted_profile.categories["core_skills"].keywords["React"] == 3
