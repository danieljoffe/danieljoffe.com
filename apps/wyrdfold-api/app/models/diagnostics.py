"""Diagnostic response models for the target-funnel debugger (#845).

These shapes are deliberately verbose: an operator reading the JSON
should be able to spot the collapse stage without cross-referencing
table names.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class FunnelNomenclature(BaseModel):
    """The target's own config — the "nomenclature" suspect from #845."""

    target_id: str
    label: str
    normalized_label: str | None
    is_active: bool
    activation_status: str
    profile_version: int
    seniority_hint: str | None
    domain_hints: list[str]
    example_promising_titles: list[str]
    example_unpromising_titles: list[str]
    search_keywords: list[str]
    # Full scoring profile as JSONB — operators eyeball it directly.
    scoring_profile: dict[str, Any]


class FunnelScoreBuckets(BaseModel):
    """Histogram of ``scores.score`` for not-excluded rows.

    Buckets are inclusive-low, exclusive-high: ``"0-9"`` covers 0..9,
    ``"90-100"`` covers 90..100 (upper bound inclusive on the final bucket).
    """

    buckets: dict[str, int]
    total: int
    max_score: int | None
    floor: int = Field(
        ..., description="user_profiles.list_min_score for the owning user."
    )
    above_floor: int = Field(
        ..., description="Count of not-excluded scores ≥ floor — what the UI sees."
    )


class FunnelStageCounts(BaseModel):
    """Counts at each *DB-visible* stage.

    Pre-DB drops (non-US, title pre-match, Phase 1 unpromising) leave
    no rows; see ``pre_db_hint`` for guidance on capturing those.
    """

    scores_total: int = Field(
        ..., description="All score rows for this target (including excluded)."
    )
    promising_true: int
    promising_false: int
    promising_null: int = Field(
        ..., description="Pre-Phase-1 rows or rows where the gate was off."
    )
    by_status: dict[str, int] = Field(
        ..., description="scoring_status → count: stage1, stage2, complete."
    )
    excluded_true: int
    excluded_false: int
    graded: int = Field(
        ...,
        description=(
            "promising=True AND scoring_status != 'stage1' — the "
            "candidate pool that actually reached Phase 2."
        ),
    )
    complete: int
    stuck_in_stage1: int = Field(
        ...,
        description=(
            "promising=True AND scoring_status='stage1' — Phase-2 "
            "starvation suspects (daily cap, or never-grader-touched)."
        ),
    )


class FunnelUserContext(BaseModel):
    """Per-user context for the target — list-floor, daily-cap state."""

    user_id: str
    list_min_score: int | None = Field(
        ...,
        description=(
            "Score floor the FE list applies (NULL → server default)."
        ),
    )
    phase2_quota_remaining: int = Field(
        ...,
        description=(
            "Sonnet calls left this UTC day for this (target, user)."
        ),
    )


class FunnelSourceStaleness(BaseModel):
    """One row per polled source for this workspace.

    Not target-scoped (the source pool is global), but listed so the
    operator can spot a stalled poller in the same response.
    """

    id: str
    company_name: str
    provider: str
    enabled: bool
    last_polled_at: datetime | None
    hours_since_polled: float | None
    job_count: int | None


class TargetFunnelResponse(BaseModel):
    """The full funnel report for one target."""

    generated_at: datetime
    nomenclature: FunnelNomenclature
    stages: FunnelStageCounts
    scores_histogram: FunnelScoreBuckets
    users: list[FunnelUserContext]
    sources: list[FunnelSourceStaleness]
    pre_db_hint: str = Field(
        ...,
        description=(
            "Where to look for the pre-DB drops (non-US, title "
            "pre-match, Phase 1 unpromising) — they don't leave rows."
        ),
    )
