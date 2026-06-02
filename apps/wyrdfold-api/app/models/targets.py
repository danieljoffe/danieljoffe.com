"""Pydantic models for job targets (#495).

ScoringProfile is the target-based scoring schema. Each category has named
keywords with individual integer weights plus a float category multiplier.
This replaces the old TieredKeywords/KeywordConfig for target-aware scoring
while keeping the original intact for backward compatibility.
"""

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

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
    """Per-target scoring profile. Stored as JSONB in targets.scoring_profile."""

    categories: dict[str, CategoryProfile] = Field(default_factory=dict)
    seniority: SeniorityProfile = Field(default_factory=SeniorityProfile)
    domain: DomainProfile = Field(default_factory=DomainProfile)
    negative: NegativeProfile = Field(default_factory=NegativeProfile)


# ---- Row models (DB read shapes) -------------------------------------------


class JobTarget(BaseModel):
    id: str
    label: str
    description: str | None = None
    normalized_label: str | None = None
    scoring_profile: ScoringProfile
    search_keywords: list[str] = Field(
        default_factory=list,
        description=(
            "ATS query keywords (Greenhouse q=, etc.). Distinct from "
            "scoring_profile.categories.*.keywords, which weight JD text "
            "during scoring — these drive which jobs get fetched in the "
            "first place."
        ),
    )
    activation_status: str = Field(
        default="idle",
        description=(
            "Background pipeline state: idle | deriving | polling | ready "
            "| error. Distinct from is_active, the user-facing toggle for "
            "whether jobs should be queried for this target."
        ),
    )
    profile_version: int = 1
    is_active: bool
    # Few-shot title pools for the upcoming Phase 1 LLM triage. Seeded
    # at target creation from the same LLM call that derives the
    # scoring profile; later (Phase 1 PR) augmented from user 👍/👎
    # feedback once enough labels accumulate per target.
    example_promising_titles: list[str] = Field(default_factory=list)
    example_unpromising_titles: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class UserTarget(BaseModel):
    """Junction row linking a user to a shared target."""

    id: str
    user_id: str
    target_id: str
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


class CreateOrLinkResult(BaseModel):
    """Outcome of a from-input flow.

    ``was_matched`` indicates whether the LLM-normalized input collided with
    an existing shared target — useful for the frontend to vary the toast.
    """

    user_target: UserTarget
    target: JobTarget
    was_matched: bool


class TargetsListResponse(BaseModel):
    """Response shape for endpoints returning a list of shared JobTargets."""

    targets: list[JobTarget]


class MyTargetsListResponse(BaseModel):
    """Response shape for the per-user targets list (with link metadata)."""

    targets: list[UserTargetWithTarget]


class TargetStatusResponse(BaseModel):
    """Activation status snapshot for a target — used by the activation pipeline."""

    activation_status: str
    jobs_count: int


class ReferenceJDsListResponse(BaseModel):
    """Response shape for the reference-JDs list endpoint."""

    reference_jds: list[TargetReferenceJD]


class DeleteResponse(BaseModel):
    """Generic 200-with-body delete confirmation. Frontend reads ``deleted``."""

    deleted: bool


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
    example_promising_titles: list[str] | None = None
    example_unpromising_titles: list[str] | None = None


class TargetFromManual(BaseModel):
    """Create a target from user-typed title + description.

    The LLM normalizes the input into a standardized ``TargetSuggestion``
    shape before matching against existing targets, so created and suggested
    targets share the same canonical format.
    """

    label: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


class TargetFromUrl(BaseModel):
    """Create a target from a JD URL.

    The label is optional — when omitted, the job title extracted from the
    page is used. Falls back to "Untitled Target" if neither is available.
    """

    jd_url: str
    label: str | None = Field(default=None, max_length=200)


class ReferenceJDAdd(BaseModel):
    """Add a reference JD to a target. Triggers profile derivation + merge.

    Either `jd_text` (>=50 chars) or `jd_url` must be provided. When only
    `jd_url` is given, the server fetches the page and extracts JD text via
    the same pipeline used by `POST /jobs/manual`.
    """

    jd_text: str | None = Field(default=None, max_length=100_000)
    jd_url: str | None = None

    @model_validator(mode="after")
    def _require_text_or_url(self) -> "ReferenceJDAdd":
        if not self.jd_text and not self.jd_url:
            raise ValueError("Either jd_text or jd_url is required")
        if self.jd_text is not None and len(self.jd_text) < 50:
            raise ValueError("jd_text must be at least 50 characters")
        return self


# ---- Suggestion shapes (LLM output) ----------------------------------------


class DerivedTarget(BaseModel):
    """LLM output: scoring profile + search keywords + few-shot title
    pools derived from a target.

    The example_*_titles lists seed the Phase 1 binary triage prompt:
    promising = positive few-shot anchors, unpromising = negative
    anchors. Both default to empty so legacy LLM outputs that pre-date
    the prompt extension still validate cleanly (the Phase 1 grader
    treats empty lists as "no examples available" and degrades to
    label-only grading).
    """

    scoring_profile: ScoringProfile
    search_keywords: list[str] = Field(default_factory=list)
    example_promising_titles: list[str] = Field(default_factory=list)
    example_unpromising_titles: list[str] = Field(default_factory=list)


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
