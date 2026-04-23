"""Pydantic models for the tailor layer.

The LLM produces a TailoredResume — a structured representation the
`.docx` renderer consumes. Every claim made in this structure must
trace back to something in the OptimizedPayload; source refs are
mandatory for bullets and roles so a post-hoc hallucination check can
verify them.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.ats_lint import LintViolation

ResumeType = Literal["senior-frontend", "fullstack", "frontend-lead", "generic"]


class ContactInfo(BaseModel):
    """Header fields. Lives outside the experience doc — passed in by
    the caller (profile store or request body; TBD in P3d).
    """

    name: str
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    website: str | None = None
    linkedin: str | None = None


class TailoredBullet(BaseModel):
    """A single achievement line under a role.

    `source_outcome_ref` ties back to an `Outcome.description` or an
    explicit fact the role summary already stated. If the LLM can't
    produce one, the bullet is suspect.
    """

    text: str = Field(min_length=1, max_length=400)
    source_outcome_ref: str | None = None


class TailoredRole(BaseModel):
    company: str
    title: str
    location: str | None = None
    start: str
    end: str | None = None
    bullets: list[TailoredBullet] = Field(default_factory=list)
    source_role_ref: str
    """Must equal a Role.id from the OptimizedPayload."""


class TailoredEducation(BaseModel):
    school: str
    degree: str | None = None
    dates: str | None = None


class TailoredResume(BaseModel):
    """The structured resume the docx renderer consumes."""

    summary: str = Field(min_length=1, max_length=600)
    contact: ContactInfo
    experience: list[TailoredRole]
    skills: list[str]
    education: list[TailoredEducation] = Field(default_factory=list)

    resume_type: ResumeType = "generic"
    jd_snippet: str = Field(default="", max_length=800)
    preferences_applied: list[str] = Field(default_factory=list)


class TailorRequest(BaseModel):
    """Router input shape for POST /tailor/resume."""

    job_description: str = Field(min_length=1, max_length=20_000)
    contact: ContactInfo
    critique: str | None = Field(default=None, max_length=5_000)
    resume_type: ResumeType | None = None
    page_budget: Literal[1, 2] = 2
    job_posting_id: str | None = None
    """Optional link to a jobs pipeline row (#184)."""


class TailoredResumeRecord(BaseModel):
    """Read shape for a tailored_resumes row."""

    id: str
    user_id: str | None
    job_posting_id: str | None
    resume_type: str
    jd_snapshot: str
    jd_snapshot_hash: str
    payload: TailoredResume
    storage_path: str | None
    warnings: list[str]
    model: str | None
    input_tokens: int
    output_tokens: int
    cost_usd: float
    latency_ms: int
    created_at: datetime


class TailorResponse(BaseModel):
    """Router output for POST /tailor/resume on success."""

    record: TailoredResumeRecord
    lint_warnings: list[LintViolation] = Field(default_factory=list)


class TailorLintFailureResponse(BaseModel):
    """Router output when the linter finds blocking errors."""

    ok: Literal[False] = False
    violations: list[LintViolation]
