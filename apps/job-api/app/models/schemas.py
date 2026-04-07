from datetime import datetime

from pydantic import BaseModel


class ScoreBreakdown(BaseModel):
    role_titles: float = 0
    technologies: float = 0
    domain_skills: float = 0
    seniority_signals: float = 0
    negative: float = 0


class ScoreResult(BaseModel):
    score: int
    breakdown: ScoreBreakdown
    matched_keywords: list[str]
    excluded: bool


class JobPosting(BaseModel):
    id: str
    greenhouse_id: int
    source_id: str
    title: str
    company_name: str
    location: str | None
    department: str | None
    absolute_url: str | None
    score: int
    score_breakdown: ScoreBreakdown | None
    status: str
    first_seen_at: datetime
    created_at: datetime


class JobSource(BaseModel):
    id: str
    board_token: str
    company_name: str
    enabled: bool
    last_polled_at: datetime | None
    job_count: int


class PollResult(BaseModel):
    sources_polled: int
    new_jobs: int
    updated_jobs: int
    errors: list[str]


class StatusUpdate(BaseModel):
    status: str
    note: str | None = None


class SourceAction(BaseModel):
    action: str  # "add", "remove", "toggle"
    board_token: str
    company_name: str | None = None


class PaginatedResponse(BaseModel):
    postings: list[JobPosting]
    total: int
    page: int
    page_size: int
