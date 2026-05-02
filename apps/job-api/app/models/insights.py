"""Pydantic response models for insights endpoints (#512)."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel

# ── Pipeline endpoint ────────────────────────────────────────────────────────


class WeeklyCount(BaseModel):
    week_start: date
    resumes_generated: int
    applications_submitted: int


class FunnelStage(BaseModel):
    stage: str
    count: int


class PipelinePeriodKpis(BaseModel):
    """Top-line KPIs for a single time window — emitted twice when the
    request asks for a comparison against the prior period."""

    total_applications: int
    total_interviews: int
    total_offers: int
    response_rate: float | None
    avg_days_to_response: float | None


class PipelineInsights(BaseModel):
    total_applications: int
    total_interviews: int
    total_offers: int
    response_rate: float | None
    avg_days_to_response: float | None
    velocity: list[WeeklyCount]
    funnel: list[FunnelStage]
    # KPIs for the immediately-prior window of the same length. None when
    # period='all' (no meaningful prior) or when the window pre-dates any
    # data.
    previous: PipelinePeriodKpis | None = None


# ── Targets endpoint ─────────────────────────────────────────────────────────


class TargetComparison(BaseModel):
    target_id: str
    target_label: str
    job_count: int
    avg_score: float
    applied_count: int
    interview_count: int
    conversion_rate: float | None


class ScoreBucket(BaseModel):
    bucket: str
    count: int


class ScoreTrendPoint(BaseModel):
    week_start: date
    avg_score: float


class TargetInsights(BaseModel):
    targets: list[TargetComparison]
    score_distribution: list[ScoreBucket]
    score_trend: list[ScoreTrendPoint]
    # Postings without an LLM score yet — surfaced separately so the
    # 0-10 bucket reflects only genuinely-low-scoring jobs, not the
    # backlog of unscored ones.
    unscored_count: int = 0


# ── Skills + Cost endpoint ───────────────────────────────────────────────────


class SkillFrequency(BaseModel):
    skill: str
    matched_count: int
    missing_count: int


class MissingSkill(BaseModel):
    """A skill the user is consistently missing, ranked by impact.

    *priority_score* is the sum of llm_score across jobs missing this skill;
    skills missing in many high-scoring jobs rank highest. When no job has
    a score, the priority falls back to *missing_count* so ranking remains
    stable.
    """

    skill: str
    missing_count: int
    avg_job_score: float | None
    priority_score: float


class CostBucket(BaseModel):
    week_start: date
    total_cost: float
    resume_count: int


class PurposeCost(BaseModel):
    purpose: str
    total_cost: float
    call_count: int


class SkillsCostInsights(BaseModel):
    top_skills: list[SkillFrequency]
    top_missing: list[MissingSkill]
    cost_over_time: list[CostBucket]
    cost_by_purpose: list[PurposeCost]
    total_cost: float
    avg_cost_per_resume: float | None
