"""Batch resume generation service (#503).

Processes multiple job postings sequentially through the existing
`run_tailor_pipeline`. Progress is tracked in the `batch_runs` table
so the frontend can poll for status.

#504 adds a reuse check: before generating a fresh resume, check if
the target already has a similar-enough resume that can be cloned.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.models.batch import BatchItem, BatchJob
from app.models.experience import OptimizedDoc, PreferencesPayload
from app.models.tailor import ContactInfo, ResumeType
from app.models.targets import ScoringProfile
from app.services.llm.client import LLMClient
from app.services.tailor import PipelineSuccess, persistence, run_tailor_pipeline
from app.services.tailor.reuse import (
    clone_resume_for_job,
    extract_profile_keywords,
    find_reusable_resume,
)

TABLE = "batch_runs"


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------


def create_batch(
    supabase: Client,
    *,
    user_id: str | None,
    job_posting_ids: list[str],
) -> BatchJob:
    """Insert a new batch_runs row with all items pending."""
    items = [
        BatchItem(job_posting_id=jid).model_dump(mode="json")
        for jid in job_posting_ids
    ]
    row: dict[str, Any] = {
        "user_id": user_id,
        "status": "pending",
        "total": len(job_posting_ids),
        "completed": 0,
        "failed": 0,
        "items": items,
    }
    resp = supabase.table(TABLE).insert(row).execute()
    data = cast(dict[str, Any], resp.data[0])
    return BatchJob.model_validate(data)


def get_batch(
    supabase: Client, batch_id: str, *, user_id: str | None
) -> BatchJob | None:
    """Fetch a batch by ID, scoped to the caller.

    Filters by both ``id`` AND ``user_id`` so a JWT caller can't poll
    another user's batch by guessing the UUID — the service-role
    client used by the route bypasses RLS. ``user_id=None`` matches
    legacy single-tenant rows (api-key / background paths that
    create batches without a user_id), mirroring the convention used
    by ``persistence.get`` and ``list_recent``.

    Returns ``None`` both when the row doesn't exist AND when it
    belongs to another user — same response so existence isn't
    leaked.
    """
    query = supabase.table(TABLE).select("*").eq("id", batch_id)
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    resp = query.execute()
    if not resp.data:
        return None
    return BatchJob.model_validate(resp.data[0])


def _update_batch(
    supabase: Client,
    batch_id: str,
    *,
    status: str | None = None,
    completed: int | None = None,
    failed: int | None = None,
    items: list[dict[str, Any]] | None = None,
) -> None:
    """Partial update of a batch row."""
    updates: dict[str, Any] = {"updated_at": datetime.now(UTC).isoformat()}
    if status is not None:
        updates["status"] = status
    if completed is not None:
        updates["completed"] = completed
    if failed is not None:
        updates["failed"] = failed
    if items is not None:
        updates["items"] = items
    supabase.table(TABLE).update(updates).eq("id", batch_id).execute()


# ---------------------------------------------------------------------------
# Core processing loop
# ---------------------------------------------------------------------------


async def process_batch(
    supabase: Client,
    llm: LLMClient,
    *,
    batch_id: str,
    user_id: str | None,
    optimized: OptimizedDoc,
    jobs: list[dict[str, Any]],
    contact: ContactInfo,
    preferences: PreferencesPayload | None,
    resume_type: ResumeType,
    page_budget: int,
    force_fresh: bool = False,
    target_id: str | None = None,
) -> None:
    """Process all items in a batch sequentially.

    Called as a FastAPI BackgroundTask. Updates the batch row after
    each item so the frontend can poll for progress.

    When ``target_id`` is set and ``force_fresh`` is False, each job
    checks for a reusable resume in the same target before running the
    full tailor pipeline (#504).
    """
    batch = get_batch(supabase, batch_id, user_id=user_id)
    if batch is None:
        return

    items = [item.model_dump(mode="json") for item in batch.items]
    completed = 0
    failed = 0

    # Load target scoring keywords for reuse checks (#504)
    scoring_keywords: set[str] | None = None
    if target_id and not force_fresh:
        target_resp = (
            supabase.table("targets")
            .select("scoring_profile")
            .eq("id", target_id)
            .execute()
        )
        if target_resp.data:
            target_row = cast(dict[str, Any], target_resp.data[0])
            profile = ScoringProfile.model_validate(
                target_row["scoring_profile"]
            )
            scoring_keywords = extract_profile_keywords(profile)

    _update_batch(supabase, batch_id, status="processing")

    for i, posting in enumerate(jobs):
        job_posting_id = posting["id"]
        description_html = posting.get("description_html", "") or ""

        try:
            # Reuse check (#504)
            if scoring_keywords and target_id and not force_fresh:
                reusable = find_reusable_resume(
                    supabase,
                    target_id=target_id,
                    job_description=description_html,
                    profile_keywords=scoring_keywords,
                )
                if reusable is not None:
                    cloned = clone_resume_for_job(
                        supabase,
                        source=reusable,
                        job_posting_id=job_posting_id,
                        job_description=description_html,
                        user_id=user_id,
                    )
                    items[i]["status"] = "completed"
                    items[i]["resume_record_id"] = cloned.id
                    items[i]["reused_from"] = reusable.id
                    completed += 1

                    persistence.mark_job_resume_draft(supabase, job_posting_id)

                    _update_batch(
                        supabase,
                        batch_id,
                        completed=completed,
                        failed=failed,
                        items=items,
                    )
                    continue

            # Full generation
            result = await run_tailor_pipeline(
                supabase,
                llm,
                user_id=user_id,
                optimized=optimized,
                job_description=description_html,
                contact=contact,
                preferences=preferences,
                resume_type=resume_type,
                page_budget=page_budget,
                job_posting_id=job_posting_id,
            )

            if isinstance(result, PipelineSuccess):
                items[i]["status"] = "completed"
                items[i]["resume_record_id"] = result.record.id
                completed += 1

                persistence.mark_job_resume_draft(supabase, job_posting_id)
            else:
                # Lint failure
                violations = [v.message for v in result.lint.violations]
                items[i]["status"] = "failed"
                items[i]["error"] = f"lint: {'; '.join(violations)}"
                failed += 1

        except Exception as exc:
            items[i]["status"] = "failed"
            items[i]["error"] = str(exc)[:500]
            failed += 1

        _update_batch(
            supabase,
            batch_id,
            completed=completed,
            failed=failed,
            items=items,
        )

    final_status = "completed" if completed > 0 else "failed"
    _update_batch(supabase, batch_id, status=final_status)
