"""Pydantic shapes for the LLM-driven feedback learner (Doc 2 v2).

``ProfilePatch`` is what the LLM returns; ``TargetLearningLogRow`` mirrors
the ``target_learning_log`` table for read/list endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

LearningStatus = Literal["applied", "staged", "rejected"]

# Below this confidence the patch is staged for review rather than
# auto-applied. Tuned conservatively for v2: the LLM is good at producing
# plausible negatives but occasionally over-generalizes from a single bad
# example, so we want a human in the loop until we have a feedback log to
# validate against.
CONFIDENCE_AUTO_APPLY: float = 0.6


class ProfilePatch(BaseModel):
    """LLM-emitted diff against a scoring profile.

    All four collection fields are optional and default to empty so the
    LLM can emit just the slice that matches the signal. ``confidence`` and
    ``rationale`` are required so the staging gate and audit log always
    have something to render.
    """

    add_negative: list[str] = Field(
        default_factory=list,
        description="Keywords to append to scoring_profile.negative.keywords",
    )
    remove_negative: list[str] = Field(
        default_factory=list,
        description="Keywords to drop from scoring_profile.negative.keywords",
    )
    add_secondary: dict[str, int] = Field(
        default_factory=dict,
        description=(
            "Keyword → weight (1-3) to add to "
            "scoring_profile.categories.secondary_skills.keywords. "
            "Promote to core_skills happens manually for now."
        ),
    )
    demote_keywords: list[str] = Field(
        default_factory=list,
        description=(
            "Keywords to remove from any category — typically used when "
            "positive feedback contradicts an existing secondary skill."
        ),
    )
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str = Field(min_length=1, max_length=2000)


class TargetLearningLogRow(BaseModel):
    """One ``target_learning_log`` row as the API returns it."""

    id: str
    user_id: str
    target_id: str
    status: LearningStatus
    prev_profile: dict[str, Any]
    next_profile: dict[str, Any]
    diff: dict[str, Any]
    confidence: float
    rationale: str | None = None
    signals_consumed: int
    applied_run_id: str | None = None
    created_at: datetime
    updated_at: datetime


class LearningRunResult(BaseModel):
    """Return shape for ``POST /targets/{id}/learn-llm`` and the apply/reject endpoints."""

    log: TargetLearningLogRow
    applied: bool
    profile_version_after: int | None = None
