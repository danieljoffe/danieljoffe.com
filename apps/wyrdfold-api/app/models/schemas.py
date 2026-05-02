from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

BOARD_TOKEN_PATTERN = r"^[a-zA-Z0-9][a-zA-Z0-9_.:/|@-]{1,250}$"


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


Provider = Literal[
    "greenhouse", "lever", "ashby", "workday", "smartrecruiters", "jsonld", "crawl", "manual"
]


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
    target_id: str | None = None
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
    status: Literal[
        "new",
        "saved",
        "resume_draft",
        "resume_ready",
        "applied",
        "interviewing",
        "offer",
        "rejected",
        "archived",
    ]
    note: str | None = Field(default=None, max_length=1000)


class SourceAction(BaseModel):
    action: Literal["add", "remove", "toggle"]
    board_token: str = Field(pattern=BOARD_TOKEN_PATTERN, max_length=250)
    company_name: str | None = Field(default=None, max_length=200)
    provider: Provider = "greenhouse"


class PaginatedResponse(BaseModel):
    postings: list[JobPosting]
    total: int
    page: int
    page_size: int


class UrlValidateRequest(BaseModel):
    url: str = Field(max_length=2048)


class UrlValidateResponse(BaseModel):
    is_valid: bool
    final_url: str
    warnings: list[str]
    rejection_reason: str | None


class ManualJobRequest(BaseModel):
    url: str = Field(max_length=2048)
    title: str | None = Field(default=None, max_length=500)
    company_name: str | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=200)


class ManualJobResponse(BaseModel):
    success: bool
    posting_id: str | None = None
    extracted: dict[str, str | None]
    extraction_tier: str
    warnings: list[str]
    needs_manual_fields: bool


ScoringStatus = Literal["stage1", "stage2", "complete"]


class JobTargetScore(BaseModel):
    """DB read shape for scores rows."""

    id: str
    job_posting_id: str
    target_id: str
    score: int
    score_breakdown: ScoreBreakdown | None
    matched_keywords: list[str]
    excluded: bool
    scoring_status: ScoringStatus = "stage1"
    scored_profile_version: int = 1
    created_at: datetime
    updated_at: datetime
