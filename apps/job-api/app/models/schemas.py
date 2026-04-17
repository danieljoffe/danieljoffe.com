from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

BOARD_TOKEN_PATTERN = r"^[a-z0-9][a-z0-9-]{1,80}$"


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


Provider = Literal["greenhouse", "lever", "ashby"]


class JobPosting(BaseModel):
    id: str
    external_id: str
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
    provider: Provider = "greenhouse"
    enabled: bool
    last_polled_at: datetime | None
    job_count: int


class PollResult(BaseModel):
    sources_polled: int
    new_jobs: int
    updated_jobs: int
    archived_jobs: int = 0
    errors: list[str]


class StatusUpdate(BaseModel):
    status: Literal["new", "saved", "applied", "rejected", "archived"]
    note: str | None = Field(default=None, max_length=1000)


class SourceAction(BaseModel):
    action: Literal["add", "remove", "toggle"]
    board_token: str = Field(pattern=BOARD_TOKEN_PATTERN, max_length=80)
    company_name: str | None = Field(default=None, max_length=200)
    provider: Provider = "greenhouse"


class PaginatedResponse(BaseModel):
    postings: list[JobPosting]
    total: int
    page: int
    page_size: int
