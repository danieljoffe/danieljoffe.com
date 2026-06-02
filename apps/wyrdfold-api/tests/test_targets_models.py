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


# ---- Example title pools (Phase 1 LLM triage seed) ------------------------


def test_job_target_defaults_example_title_pools_to_empty():
    """Targets created before the Phase 1 LLM triage migration have NULL
    columns in the DB → JobTarget should fall back to empty lists so
    the Phase 1 grader can run "no examples available" path cleanly.
    """
    raw = {
        "id": "t-1",
        "label": "Director of CX Operations",
        "scoring_profile": {"categories": {}},
        "is_active": True,
        "created_at": "2026-06-01T00:00:00Z",
        "updated_at": "2026-06-01T00:00:00Z",
        # NO example_promising_titles, NO example_unpromising_titles.
    }
    t = JobTarget.model_validate(raw)
    assert t.example_promising_titles == []
    assert t.example_unpromising_titles == []


def test_job_target_round_trips_example_title_pools():
    raw = {
        "id": "t-1",
        "label": "Director of CX Operations",
        "scoring_profile": {"categories": {}},
        "is_active": True,
        "created_at": "2026-06-01T00:00:00Z",
        "updated_at": "2026-06-01T00:00:00Z",
        "example_promising_titles": [
            "Director of Customer Success",
            "Head of CS Operations",
            "VP Customer Experience",
        ],
        "example_unpromising_titles": [
            "Director of Sales Operations",
            "Marketing Director",
        ],
    }
    t = JobTarget.model_validate(raw)
    assert "Director of Customer Success" in t.example_promising_titles
    assert "Marketing Director" in t.example_unpromising_titles


def test_derived_target_defaults_example_title_pools_to_empty():
    """The LLM-output schema: legacy outputs that pre-date the prompt
    extension still validate (fields default to empty lists). Phase 1
    treats empty pools as "fall back to label-only grading"."""
    from app.models.targets import DerivedTarget

    raw = {
        "scoring_profile": {"categories": {}},
        "search_keywords": ["frontend engineer"],
    }
    d = DerivedTarget.model_validate(raw)
    assert d.example_promising_titles == []
    assert d.example_unpromising_titles == []


def test_derived_target_with_example_title_pools():
    from app.models.targets import DerivedTarget

    raw = {
        "scoring_profile": {"categories": {}},
        "search_keywords": ["frontend engineer"],
        "example_promising_titles": ["Senior Frontend Engineer", "Staff Web Engineer"],
        "example_unpromising_titles": ["Senior Product Designer"],
    }
    d = DerivedTarget.model_validate(raw)
    assert len(d.example_promising_titles) == 2
    assert d.example_unpromising_titles == ["Senior Product Designer"]


def test_target_update_passes_through_example_title_pools():
    """``TargetUpdate`` must carry the new fields through so derive →
    update flows can persist them. Both fields are ``None`` by default
    so unrelated updates don't accidentally null out the pool."""
    from app.models.targets import TargetUpdate

    upd = TargetUpdate(
        example_promising_titles=["Senior Frontend Engineer"],
        example_unpromising_titles=["Senior Product Designer"],
    )
    assert upd.example_promising_titles == ["Senior Frontend Engineer"]
    assert upd.example_unpromising_titles == ["Senior Product Designer"]
    # Unrelated update: pools stay None (= "don't touch").
    upd2 = TargetUpdate(label="Renamed Target")
    assert upd2.example_promising_titles is None
    assert upd2.example_unpromising_titles is None
