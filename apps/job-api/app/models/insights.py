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


class PipelineInsights(BaseModel):
    total_applications: int
    total_interviews: int
    total_offers: int
    response_rate: float | None
    avg_days_to_response: float | None
    velocity: list[WeeklyCount]
    funnel: list[FunnelStage]


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


# ── Skills + Cost endpoint ───────────────────────────────────────────────────


class SkillFrequency(BaseModel):
    skill: str
    matched_count: int
    missing_count: int


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
    top_missing: list[str]
    cost_over_time: list[CostBucket]
    cost_by_purpose: list[PurposeCost]
    total_cost: float
    avg_cost_per_resume: float | None
