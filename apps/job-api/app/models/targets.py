"""Pydantic models for job targets (#495).

ScoringProfile is the target-based scoring schema. Each category has named
keywords with individual integer weights plus a float category multiplier.
This replaces the old TieredKeywords/KeywordConfig for target-aware scoring
while keeping the original intact for backward compatibility.
"""

from datetime import datetime

from pydantic import BaseModel, Field

# ---- Scoring Profile schema ------------------------------------------------


class CategoryProfile(BaseModel):
    """One scoring category (e.g., core_skills, secondary_skills)."""

    keywords: dict[str, int] = Field(default_factory=dict)  # keyword -> weight 1-3
    weight: float = 1.0  # category multiplier


class SeniorityProfile(BaseModel):
    level: str | None = None  # e.g. "senior", "staff"
    signals: list[str] = Field(default_factory=list)


class DomainProfile(BaseModel):
    signals: list[str] = Field(default_factory=list)
    weight: float = 0.5


class NegativeProfile(BaseModel):
    keywords: list[str] = Field(default_factory=list)
    weight: float = -10.0


class ScoringProfile(BaseModel):
    """Per-target scoring profile. Stored as JSONB in job_targets.scoring_profile."""

    categories: dict[str, CategoryProfile] = Field(default_factory=dict)
    seniority: SeniorityProfile = Field(default_factory=SeniorityProfile)
    domain: DomainProfile = Field(default_factory=DomainProfile)
    negative: NegativeProfile = Field(default_factory=NegativeProfile)


class ResumeEmphasis(BaseModel):
    """Hints for the tailor about what to emphasize for this target."""

    focus_skills: list[str] = Field(default_factory=list)
    focus_outcomes: list[str] = Field(default_factory=list)
    tone: str | None = None


# ---- Row models (DB read shapes) -------------------------------------------


class JobTarget(BaseModel):
    id: str
    user_id: str | None = None
    label: str
    scoring_profile: ScoringProfile
    resume_emphasis: ResumeEmphasis
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TargetReferenceJD(BaseModel):
    id: str
    target_id: str
    jd_url: str | None = None
    jd_text: str
    extracted_profile: ScoringProfile
    created_at: datetime


# ---- Request shapes (router inputs) ----------------------------------------


class TargetCreate(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    scoring_profile: ScoringProfile = Field(default_factory=ScoringProfile)
    resume_emphasis: ResumeEmphasis = Field(default_factory=ResumeEmphasis)


class TargetUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=200)
    scoring_profile: ScoringProfile | None = None
    resume_emphasis: ResumeEmphasis | None = None
    is_active: bool | None = None


class ReferenceJDAdd(BaseModel):
    """Add a reference JD to a target. Triggers profile derivation + merge."""

    jd_text: str = Field(min_length=50, max_length=100_000)
    jd_url: str | None = None
