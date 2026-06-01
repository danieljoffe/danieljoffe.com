"""Pydantic shapes for the per-(user, target) job feedback loop.

Mirrors the ``job_feedback`` table created in
``supabase/migrations/20260601130000_job_feedback.sql``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

FeedbackSignal = Literal["irrelevant", "relevant"]


class FeedbackCreate(BaseModel):
    """Body for ``POST /jobs/{job_id}/feedback``.

    ``target_id`` is mandatory because the signal is about the user's
    *lens* on the job, not the job in the abstract.
    """

    signal: FeedbackSignal
    reason: str | None = Field(default=None, max_length=500)
    target_id: str


class FeedbackRow(BaseModel):
    """One ``job_feedback`` row as the API returns it."""

    id: str
    user_id: str
    job_posting_id: str
    target_id: str
    signal: FeedbackSignal
    reason: str | None = None
    applied_at: datetime | None = None
    applied_run_id: str | None = None
    created_at: datetime
    updated_at: datetime


class FeedbackCreateResponse(BaseModel):
    feedback: FeedbackRow
    # True when the unapplied-signal threshold tripped and the learner
    # was kicked off (BackgroundTasks). The caller doesn't need to wait
    # — score lists refresh on the next read after the patch lands.
    queued_learn_run: bool


class FeedbackList(BaseModel):
    rows: list[FeedbackRow]
    total: int


class LearnerPatchSummary(BaseModel):
    """What ``maybe_run_learner`` mutated.

    v1 only extends ``negative.keywords``; v2 will support full
    ``ProfilePatch`` (add/remove/demote across multiple buckets).
    """

    target_id: str
    applied_run_id: str | None = None
    added_negative_keywords: list[str]
    signals_consumed: int
    profile_version_after: int | None = None
