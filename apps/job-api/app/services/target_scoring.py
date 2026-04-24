"""Per-target job scoring (#502).

Stores target-specific scores in `job_target_scores`. The global score
on `job_postings` stays as fallback when no target is selected.

Consumers:
- Poller: scores new jobs against active targets after upsert
- Manual entry: scores the new job on insert
- Re-score endpoint: bulk re-scores when a target's profile changes
- List endpoint: fetches target scores for overlay
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.models.schemas import JobTargetScore, ScoreBreakdown
from app.models.targets import JobTarget
from app.services.scoring import score_job_with_profile, strip_html

logger = logging.getLogger(__name__)

TABLE = "job_target_scores"


def _parse_score(row: dict[str, Any]) -> JobTargetScore:
    return JobTargetScore(
        id=row["id"],
        job_posting_id=row["job_posting_id"],
        target_id=row["target_id"],
        score=row["score"],
        score_breakdown=(
            ScoreBreakdown.model_validate(row["score_breakdown"])
            if row.get("score_breakdown")
            else None
        ),
        matched_keywords=row.get("matched_keywords") or [],
        excluded=row.get("excluded", False),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def score_and_upsert(
    supabase: Client,
    *,
    job_posting_id: str,
    title: str,
    description_html: str,
    target: JobTarget,
) -> JobTargetScore:
    """Score one job against one target and upsert the result."""
    result = score_job_with_profile(title, description_html, target.scoring_profile)

    row: dict[str, Any] = {
        "job_posting_id": job_posting_id,
        "target_id": target.id,
        "score": result.score,
        "score_breakdown": result.breakdown.model_dump(),
        "matched_keywords": result.matched_keywords,
        "excluded": result.excluded,
        "updated_at": datetime.now(UTC).isoformat(),
    }

    resp = (
        supabase.table(TABLE)
        .upsert(row, on_conflict="job_posting_id,target_id")
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to upsert job_target_scores row")
    return _parse_score(rows[0])


def bulk_score_for_target(supabase: Client, target: JobTarget) -> int:
    """Score all job_postings against a target. Returns count scored.

    Fetches jobs in batches to avoid loading everything into memory.
    Used by the re-score endpoint when a target's profile changes.
    """
    batch_size = 500
    offset = 0
    total_scored = 0

    while True:
        resp = (
            supabase.table("job_postings")
            .select("id, title, description_html")
            .range(offset, offset + batch_size - 1)
            .execute()
        )
        jobs = cast(list[dict[str, Any]], resp.data or [])
        if not jobs:
            break

        rows_to_upsert: list[dict[str, Any]] = []
        now = datetime.now(UTC).isoformat()
        for job in jobs:
            description_html = job.get("description_html") or ""
            result = score_job_with_profile(
                job["title"], description_html, target.scoring_profile
            )
            rows_to_upsert.append(
                {
                    "job_posting_id": job["id"],
                    "target_id": target.id,
                    "score": result.score,
                    "score_breakdown": result.breakdown.model_dump(),
                    "matched_keywords": result.matched_keywords,
                    "excluded": result.excluded,
                    "updated_at": now,
                }
            )

        if rows_to_upsert:
            supabase.table(TABLE).upsert(
                rows_to_upsert, on_conflict="job_posting_id,target_id"
            ).execute()
            total_scored += len(rows_to_upsert)

        if len(jobs) < batch_size:
            break
        offset += batch_size

    return total_scored


def get_target_scores(
    supabase: Client,
    target_id: str,
    job_posting_ids: list[str] | None = None,
) -> dict[str, JobTargetScore]:
    """Return target scores keyed by job_posting_id."""
    query = supabase.table(TABLE).select("*").eq("target_id", target_id)
    if job_posting_ids is not None:
        query = query.in_("job_posting_id", job_posting_ids)
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    return {r["job_posting_id"]: _parse_score(r) for r in rows}
