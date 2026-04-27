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
    label: str
    description: str | None = None
    normalized_label: str | None = None
    scoring_profile: ScoringProfile
    search_keywords: list[str] = Field(default_factory=list)
    activation_status: str = "idle"
    profile_version: int = 1
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserTarget(BaseModel):
    """Junction row linking a user to a shared target."""

    id: str
    user_id: str
    target_id: str
    resume_emphasis: ResumeEmphasis
    is_active: bool
    fit_score: int | None = None
    fit_score_reasoning: str | None = None
    created_at: datetime
    updated_at: datetime


class TargetReferenceJD(BaseModel):
    id: str
    target_id: str
    jd_url: str | None = None
    jd_text: str
    extracted_profile: ScoringProfile
    created_at: datetime


# ---- Response shapes ---------------------------------------------------------


class UserTargetWithTarget(BaseModel):
    """A user's link to a target, paired with the full target data."""

    user_target: UserTarget
    target: JobTarget


# ---- Request shapes (router inputs) ----------------------------------------


class TargetCreate(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    description: str | None = None
    scoring_profile: ScoringProfile = Field(default_factory=ScoringProfile)
    search_keywords: list[str] = Field(default_factory=list)


class TargetUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    scoring_profile: ScoringProfile | None = None
    search_keywords: list[str] | None = None
    activation_status: str | None = None
    is_active: bool | None = None
    profile_version: int | None = None


class ReferenceJDAdd(BaseModel):
    """Add a reference JD to a target. Triggers profile derivation + merge."""

    jd_text: str = Field(min_length=50, max_length=100_000)
    jd_url: str | None = None


# ---- Suggestion shapes (LLM output) ----------------------------------------


class DerivedTarget(BaseModel):
    """LLM output: scoring profile + search keywords derived from a target."""

    scoring_profile: ScoringProfile
    search_keywords: list[str] = Field(default_factory=list)


class TargetSuggestion(BaseModel):
    """A single suggested target derived from the user's experience profile."""

    label: str = Field(min_length=1, max_length=200)
    description: str = Field(max_length=500)
    core_skills: list[str] = Field(default_factory=list)


class TargetSuggestions(BaseModel):
    """LLM response containing 2-3 suggested targets."""

    suggestions: list[TargetSuggestion] = Field(default_factory=list)


# ---- Match result shapes (suggest_and_match output) --------------------------


class MatchedSuggestion(BaseModel):
    """A suggestion that was matched to an existing target or flagged as new."""

    suggestion: TargetSuggestion
    matched_target: JobTarget | None = None
    is_new: bool = True


class MatchedSuggestions(BaseModel):
    """Result of suggest_and_match: suggestions with match info."""

    matches: list[MatchedSuggestion] = Field(default_factory=list)
