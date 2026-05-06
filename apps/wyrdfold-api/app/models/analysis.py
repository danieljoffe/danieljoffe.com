"""Pydantic models for the job analysis feature (#501).

The LLM grades the user's OptimizedPayload against a job description,
producing a structured scorecard and one-line recommendation. Results
are cached in the `analyses` table.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class SkillMatch(BaseModel):
    name: str
    matched: bool
    confidence: Literal["high", "medium", "low"]
    evidence: str | None = None


class Scorecard(BaseModel):
    skills_matched: list[SkillMatch]
    skills_missing: list[str]
    nice_to_haves: list[str]
    seniority_fit: Literal["strong", "moderate", "weak"]
    seniority_rationale: str
    domain_fit: Literal["strong", "moderate", "weak"]
    domain_rationale: str


class JobAnalysis(BaseModel):
    """LLM output shape: scorecard + recommendation."""

    scorecard: Scorecard
    recommendation: str


class JobAnalysisRecord(BaseModel):
    """DB read shape for analyses rows."""

    id: str
    job_posting_id: str
    target_id: str
    user_id: str | None
    optimized_doc_id: str | None
    scorecard: Scorecard
    recommendation: str
    model: str
    cost_usd: float
    latency_ms: int
    created_at: datetime
