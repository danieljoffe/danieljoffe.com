"""Pydantic models for user profile — notification + identity fields."""

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

# E.164: leading '+', country code starting 1-9, then up to 14 more digits.
# Twilio rejects malformed numbers at send time and the failure is swallowed
# in the poller — validate here so the user gets immediate feedback.
_E164_RE = re.compile(r"^\+[1-9]\d{1,14}$")


def _normalize_phone(value: str | None) -> str | None:
    """Normalize and validate an E.164 phone number. Empty/whitespace → None
    (treated as "clear the field"). Otherwise must match E.164 after stripping
    spaces/hyphens/parentheses for forgiving input."""
    if value is None:
        return None
    stripped = value.strip()
    if not stripped:
        return None
    cleaned = re.sub(r"[\s\-()]", "", stripped)
    if not _E164_RE.match(cleaned):
        raise ValueError(
            "Phone number must be in E.164 format "
            "(e.g. +14155552671 — country code, no spaces/dashes)"
        )
    return cleaned


class NotificationPreferences(BaseModel):
    """Read model for notification + jobs-list preferences.

    ``list_min_score`` is intentionally separate from
    ``job_score_threshold`` (email) and ``sms_score_threshold`` —
    historically the email threshold was reused as the list filter, but
    the email/SMS UIs are disabled until SMTP + Twilio are configured,
    leaving users no way to control the list view. NULL means "no
    auto-filter" — caller must pass ``min_score`` explicitly via chip.
    """

    job_notifications_enabled: bool = False
    job_score_threshold: int = 100
    sms_notifications_enabled: bool = False
    sms_score_threshold: int = 100
    sms_daily_limit: int = 5
    list_min_score: int | None = None
    phone_number: str | None = None
    email: str | None = None
    # Server-derived: false when the operator hasn't configured the
    # corresponding provider credentials. The frontend uses these to
    # disable the toggles; the PATCH handler rejects attempts to enable
    # a channel whose backend isn't reachable.
    email_available: bool = True
    sms_available: bool = True


class NotificationPreferencesUpdate(BaseModel):
    """Write model — all fields optional so callers can patch individual settings."""

    job_notifications_enabled: bool | None = None
    job_score_threshold: int | None = Field(default=None, ge=0, le=200)
    sms_notifications_enabled: bool | None = None
    sms_score_threshold: int | None = Field(default=None, ge=0, le=200)
    sms_daily_limit: int | None = Field(default=None, ge=1, le=50)
    # 0..100 matches the score range. ``None`` here means "don't touch
    # the column" (default for partial PATCH); to clear an existing
    # value the caller passes 0 (semantically "no floor").
    list_min_score: int | None = Field(default=None, ge=0, le=100)
    phone_number: str | None = Field(default=None, max_length=20)

    @field_validator("phone_number", mode="before")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        return _normalize_phone(value)


class IdentityFields(BaseModel):
    """Read model for resume / cover-letter identity. Backend sources contact
    info from here so the frontend never has to send it (F3-A).
    """

    name: str | None = None
    email: str | None = None
    phone_number: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    website_url: str | None = None


class IdentityFieldsUpdate(BaseModel):
    """Write model — all fields optional. Empty strings clear the field."""

    name: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    phone_number: str | None = Field(default=None, max_length=20)
    location: str | None = Field(default=None, max_length=200)
    linkedin_url: str | None = Field(default=None, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)

    @field_validator("phone_number", mode="before")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        return _normalize_phone(value)


# ---------------------------------------------------------------------------
# Resume style (docx typography presets — see app/services/docx/style.py)
# ---------------------------------------------------------------------------

# Curated, author-owned looks. Users pick from this closed set rather than
# tuning fonts/sizes individually — every combination is designer-vetted, so a
# user cannot produce a broken resume. The typography behind each preset lives
# server-side in app/services/docx/style.py and is intentionally NOT exposed.
ResumeStylePreset = Literal["modern", "classic", "compact", "executive"]

# Applied to the name + section headings only (ATS parsers ignore color).
# "black" is the no-accent option for conservative / regulated audiences.
ResumeStyleAccent = Literal["slate", "navy", "black", "burgundy", "forest"]


class ResumeStyleSettings(BaseModel):
    """A user's resume style choice. Two enums, nothing free-form.

    Stored as JSONB on ``user_profiles.resume_style_settings`` (the default)
    and ``documents.style_settings`` (per-record override, deferred UI). A
    NULL column means "no choice yet" and renders today's unstyled pandoc
    default — see ``download_tailored_resume``.
    """

    preset: ResumeStylePreset = "modern"
    accent: ResumeStyleAccent = "slate"


class ResumeStyleSettingsUpdate(BaseModel):
    """Write model — both optional so the UI can PATCH one axis at a time."""

    preset: ResumeStylePreset | None = None
    accent: ResumeStyleAccent | None = None


# ---------------------------------------------------------------------------
# Onboarding completion + step tracking
# ---------------------------------------------------------------------------

# Mirrors the Step union in apps/wyrdfold/src/app/onboarding/OnboardingWizard.tsx.
# Step names are hyphenated by FE convention (CSS-class friendly) — keep
# parity rather than enforcing snake_case at the schema boundary.
OnboardingStep = Literal[
    "path-chooser",
    "identity",
    "upload-resume",
    "add-job",
    "pick-targets",
    "conversation",
    "completion",
]

# Three onboarding paths (see STEPS_BY_PATH in OnboardingWizard.tsx).
# A = full setup (resume + JD + targets); B = resume + targets;
# C = conversation + targets.
OnboardingPath = Literal["A", "B", "C"]


class OnboardingStatus(BaseModel):
    """Read model for the user's onboarding progress.

    A user is considered "onboarded" when ``completed_at`` is non-null.
    Until then, the dashboard redirects them to the wizard. The wizard
    consumes ``current_step`` + ``path`` to resume mid-flow (Stage 2
    of plan-wyrdfold-onboarding-completion-tracking.md; for now the
    fields are populated but not yet read by the wizard).
    """

    completed_at: datetime | None = None
    path: OnboardingPath | None = None
    current_step: OnboardingStep | None = None


class OnboardingStepUpdate(BaseModel):
    """Write model for PATCH /profile/onboarding/step.

    Both fields are optional — most transitions only update ``current_step``,
    but ``path`` is set once on the PathChooser → Identity transition.
    Server treats unset fields as "leave the column alone."
    """

    path: OnboardingPath | None = None
    current_step: OnboardingStep | None = None


class LlmUsageWindow(BaseModel):
    """One budget window: dollars spent vs the cap (0 cap = disabled)."""

    spent_usd: float
    limit_usd: float


class LlmUsageResponse(BaseModel):
    """Read model for GET /profile/llm-usage — the user's allowance state.

    ``monthly_resets_at`` approximates when capacity starts freeing: the
    oldest cost row in the rolling 30-day window plus 30 days. Null when
    the user has no spend in the window.
    """

    hourly: LlmUsageWindow
    daily: LlmUsageWindow
    monthly: LlmUsageWindow
    monthly_resets_at: datetime | None = None
    analysis_daily_used: int
    analysis_daily_limit: int
