"""Pydantic models for the tailor layer (#185 P3a).

The LLM produces a TailoredResume — a structured representation the
`.docx` renderer (P3b) will consume. Every claim made in this structure
must trace back to something in the OptimizedPayload; source refs are
mandatory for bullets and roles so a post-hoc hallucination check can
verify them.
"""

from typing import Literal

from pydantic import BaseModel, Field

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
    """Router input shape (consumed in P3d)."""

    job_description: str = Field(min_length=1, max_length=20_000)
    critique: str | None = Field(default=None, max_length=5_000)
    resume_type: ResumeType | None = None
    page_budget: Literal[1, 2] = 2
