"""Per-target job scoring (#502).

Three-stage scoring pipeline:
  Stage 1: Title-only match (fast, inline during poll)
  Stage 2: Full JD match (async, after stage 1 passes)
  Stage 3: LLM analysis (async, for top stage-2 scores)

Stores target-specific scores in `scores`. The global score
on `jobs` = average across active targets (updated after each stage).

Consumers:
- Poller: stage 1 title scoring during poll, stage 2+3 async after
- Manual entry: stages 1+2 on insert
- Re-score endpoint: bulk re-scores when a target's profile changes
- List endpoint: fetches target scores for overlay
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.models.schemas import JobTargetScore, ScoreBreakdown, ScoringStatus
from app.models.targets import JobTarget
from app.services.jd_parser import ParsedJD, parse_jd
from app.services.scoring import score_job_with_profile, score_title_against_profile
from app.services.supabase_retry import execute_with_retry_sync

logger = logging.getLogger(__name__)

TABLE = "scores"


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
        scoring_status=row.get("scoring_status", "stage1"),
        scored_profile_version=row.get("scored_profile_version", 1),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _upsert_score(
    supabase: Client,
    *,
    job_posting_id: str,
    target_id: str,
    score: int,
    breakdown: ScoreBreakdown,
    matched_keywords: list[str],
    excluded: bool,
    scoring_status: ScoringStatus,
    scored_profile_version: int = 1,
    promising: bool | None = None,
) -> JobTargetScore:
    """Upsert a score row and return the parsed result.

    ``promising`` is the Phase 1 LLM triage verdict for this (job, target)
    pair (see ``app/services/relevance/title_triage.py``). Pass ``None``
    to leave the column untouched on re-upserts; pass ``True`` / ``False``
    to set explicitly. The default ``None`` means legacy keyword-scoring
    callsites don't need to know about Phase 1.
    """
    row: dict[str, Any] = {
        "job_posting_id": job_posting_id,
        "target_id": target_id,
        "score": score,
        "score_breakdown": breakdown.model_dump(),
        "matched_keywords": matched_keywords,
        "excluded": excluded,
        "scoring_status": scoring_status,
        "scored_profile_version": scored_profile_version,
        # Initialise recency_score to the raw fit score (fresh-posting,
        # decay multiplier 1.0). Correct as-is when RECENCY_DECAY_ENABLED
        # is off; when on, the poller's ``refresh_recency_scores`` pass
        # overwrites it with the age-decayed value later in the cycle.
        # Keeping it non-NULL means a flag flip is a pure sort change.
        "recency_score": score,
        "updated_at": datetime.now(UTC).isoformat(),
    }
    if promising is not None:
        row["promising"] = promising
    # Idempotent upsert (`on_conflict` matches the unique constraint), so
    # retrying on a Supabase HTTP/2 stream drop is safe.
    resp = execute_with_retry_sync(
        supabase.table(TABLE)
        .upsert(row, on_conflict="job_posting_id,target_id")
        .execute,
        label="scores upsert",
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to upsert scores row")
    return _parse_score(rows[0])


# ---- Stage 1: Title-only scoring ------------------------------------------


def score_title_and_upsert(
    supabase: Client,
    *,
    job_posting_id: str,
    title: str,
    target: JobTarget,
) -> JobTargetScore | None:
    """Stage 1: Score a job title against a target and upsert if any match.

    Returns the upserted score, or None if no keywords matched (skip).
    """
    result = score_title_against_profile(
        title,
        target.scoring_profile,
        search_keywords=target.search_keywords,
    )
    if not result.matched_keywords and not result.excluded:
        return None

    return _upsert_score(
        supabase,
        job_posting_id=job_posting_id,
        target_id=target.id,
        score=result.score,
        breakdown=result.breakdown,
        matched_keywords=result.matched_keywords,
        excluded=result.excluded,
        scoring_status="stage1",
        scored_profile_version=target.profile_version,
    )


# ---- Stage 2: Full JD scoring (existing) ----------------------------------


def score_and_upsert(
    supabase: Client,
    *,
    job_posting_id: str,
    title: str,
    description_html: str,
    target: JobTarget,
    parsed_jd: ParsedJD | None = None,
    excluded_by_prefilter: bool = False,
    promising: bool | None = None,
) -> JobTargetScore:
    """Stage 2: Score one job's full JD against one target and upsert.

    Pass ``parsed_jd`` to reuse a pre-parsed JD across multiple targets.

    ``excluded_by_prefilter`` is OR-ed with the scorer's own ``excluded``
    flag. The poller pre-computes the Phase 1 LLM verdict per
    (target, job) pair and passes it through here so a re-score triggered
    by anything (cron, deploy, learner) preserves the gate the same way
    the ingestion path does. Without this, the scorer's negative-keyword-
    only ``excluded`` overwrites prefilter exclusions on every re-score
    and the noise floor walks back up.

    ``promising`` mirrors the same verdict for persistence on
    ``scores.promising`` — Stage 2 candidate selection in Phase 2 reads
    that column. Pass ``None`` to leave the column unchanged on re-
    upserts (the default — keyword-only callers don't need to know about
    Phase 1).
    """
    result = score_job_with_profile(
        title,
        description_html,
        target.scoring_profile,
        parsed_jd=parsed_jd,
        search_keywords=target.search_keywords,
    )

    return _upsert_score(
        supabase,
        job_posting_id=job_posting_id,
        target_id=target.id,
        score=result.score,
        breakdown=result.breakdown,
        matched_keywords=result.matched_keywords,
        excluded=result.excluded or excluded_by_prefilter,
        scoring_status="stage2",
        scored_profile_version=target.profile_version,
        promising=promising,
    )


def bulk_score_for_target(supabase: Client, target: JobTarget) -> int:
    """Re-score stale jobs for this target. Returns count scored.

    Only fetches jobs with existing ``scores`` rows whose
    ``scored_profile_version`` is less than the target's current
    ``profile_version`` (lazy re-scoring). Used by the re-score endpoint
    when a target's profile changes.

    Skips inactive targets entirely. The ``targets.is_active`` flag is
    the OR across all users via the user_targets trigger; if it's
    ``False`` nobody currently has this target enabled, so the
    re-score would just burn LLM/CPU on rows nobody will see.
    """
    if not target.is_active:
        logger.info(
            "bulk_score_for_target: skipping inactive target %s (%s)",
            target.id,
            target.label,
        )
        return 0

    batch_size = 500
    offset = 0
    total_scored = 0

    # Fetch job IDs with stale scores for this target
    all_job_ids: list[str] = []
    while True:
        resp = (
            supabase.table(TABLE)
            .select("job_posting_id")
            .eq("target_id", target.id)
            .lt("scored_profile_version", target.profile_version)
            .range(offset, offset + batch_size - 1)
            .execute()
        )
        rows = cast(list[dict[str, Any]], resp.data or [])
        if not rows:
            break
        all_job_ids.extend(r["job_posting_id"] for r in rows)
        if len(rows) < batch_size:
            break
        offset += batch_size

    if not all_job_ids:
        return 0

    # Pre-load existing ``promising`` verdicts so the rescore preserves
    # the Phase 1 verdict instead of overwriting it via scorer-only
    # ``excluded``. Without this, a target's ``profile_version`` bump
    # (feedback learner, manual /rescore) would re-admit jobs that
    # Phase 1 previously dropped. Keyed by job_posting_id (per-target
    # row already filtered by ``eq("target_id", ...)`` above).
    existing_promising_by_job: dict[str, bool | None] = {}
    for i in range(0, len(all_job_ids), batch_size):
        batch_ids = all_job_ids[i : i + batch_size]
        resp = (
            supabase.table(TABLE)
            .select("job_posting_id, promising")
            .eq("target_id", target.id)
            .in_("job_posting_id", batch_ids)
            .execute()
        )
        for existing_row in cast(list[dict[str, Any]], resp.data or []):
            existing_promising_by_job[existing_row["job_posting_id"]] = (
                existing_row.get("promising")
            )

    # Score those jobs in batches
    for i in range(0, len(all_job_ids), batch_size):
        batch_ids = all_job_ids[i : i + batch_size]
        resp = (
            supabase.table("jobs")
            .select("id, title, description_html")
            .in_("id", batch_ids)
            .execute()
        )
        jobs = cast(list[dict[str, Any]], resp.data or [])
        if not jobs:
            continue

        rows_to_upsert: list[dict[str, Any]] = []
        now = datetime.now(UTC).isoformat()
        for job in jobs:
            description_html = job.get("description_html") or ""
            parsed = parse_jd(description_html)
            result = score_job_with_profile(
                job["title"],
                description_html,
                target.scoring_profile,
                parsed_jd=parsed,
                search_keywords=target.search_keywords,
            )
            # Preserve the Phase 1 verdict from the existing row:
            # promising=False -> excluded=True regardless of scorer.
            # promising=True or None -> rely on scorer's own excluded.
            existing_promising = existing_promising_by_job.get(job["id"])
            excluded_by_prefilter = existing_promising is False
            row: dict[str, Any] = {
                "job_posting_id": job["id"],
                "target_id": target.id,
                "score": result.score,
                "score_breakdown": result.breakdown.model_dump(),
                "matched_keywords": result.matched_keywords,
                "excluded": result.excluded or excluded_by_prefilter,
                "scoring_status": "stage2",
                "scored_profile_version": target.profile_version,
                # Reset recency_score to the new raw score; the next poll
                # cycle's refresh pass re-applies age decay (see
                # ``_upsert_score`` and ``app/services/recency.py``).
                "recency_score": result.score,
                "updated_at": now,
            }
            # Pass-through ``promising`` only when it's set on the
            # existing row; ``None`` leaves the column unchanged on
            # this upsert (preserving the legacy/null state).
            if existing_promising is not None:
                row["promising"] = existing_promising
            rows_to_upsert.append(row)

        if rows_to_upsert:
            supabase.table(TABLE).upsert(
                rows_to_upsert, on_conflict="job_posting_id,target_id"
            ).execute()
            total_scored += len(rows_to_upsert)

            scored_ids = [r["job_posting_id"] for r in rows_to_upsert]
            batch_update_global_scores(supabase, scored_ids)

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


# ---- Global score aggregation ----------------------------------------------


def update_global_score(supabase: Client, job_posting_id: str) -> None:
    """Recompute jobs.score as average of active-target scores.

    Called after any stage updates a target score. Uses a single query
    to average all non-excluded target scores for this job.
    """
    resp = (
        supabase.table(TABLE)
        .select("score, excluded, target_id")
        .eq("job_posting_id", job_posting_id)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        return

    scores = [r["score"] for r in rows if not r.get("excluded", False)]
    avg_score = round(sum(scores) / len(scores)) if scores else 0

    supabase.table("jobs").update({"score": avg_score}).eq(
        "id", job_posting_id
    ).execute()


_BATCH_CHUNK_SIZE = 100


def batch_update_global_scores(
    supabase: Client, job_posting_ids: list[str]
) -> None:
    """Recompute jobs.score for many jobs in fewer DB round-trips.

    Fetches all target scores for the given IDs in one query (chunked to
    avoid URL length limits), computes averages in Python, then writes
    every new score in a single `bulk_update_scores` RPC instead of
    one UPDATE per job.
    """
    if not job_posting_ids:
        return

    # Deduplicate
    unique_ids = list(set(job_posting_ids))

    # Fetch all target scores in chunks
    all_score_rows: list[dict[str, Any]] = []
    for i in range(0, len(unique_ids), _BATCH_CHUNK_SIZE):
        chunk = unique_ids[i : i + _BATCH_CHUNK_SIZE]
        resp = (
            supabase.table(TABLE)
            .select("job_posting_id, score, excluded")
            .in_("job_posting_id", chunk)
            .execute()
        )
        all_score_rows.extend(cast(list[dict[str, Any]], resp.data or []))

    # Group by job_posting_id and compute averages
    from collections import defaultdict

    scores_by_job: dict[str, list[int]] = defaultdict(list)
    for row in all_score_rows:
        if not row.get("excluded", False):
            scores_by_job[row["job_posting_id"]].append(row["score"])

    updates: list[dict[str, Any]] = [
        {
            "id": job_id,
            "score": round(sum(scs) / len(scs)) if (scs := scores_by_job.get(job_id, [])) else 0,
        }
        for job_id in unique_ids
    ]
    if updates:
        supabase.rpc("bulk_update_scores", {"p_updates": updates}).execute()


def mark_complete(supabase: Client, job_posting_id: str) -> None:
    """Mark all target scores for a job as scoring_status='complete'.

    Called after stage 3 (LLM scoring) finishes for a job.
    """
    supabase.table(TABLE).update({"scoring_status": "complete"}).eq(
        "job_posting_id", job_posting_id
    ).execute()
