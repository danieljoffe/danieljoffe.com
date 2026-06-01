"""Feedback endpoints — per-(user, target) signal capture + learner triggers.

Routes:
- ``POST   /jobs/{job_id}/feedback`` — upsert a signal
- ``DELETE /jobs/{job_id}/feedback`` — undo (used by toast Undo)
- ``GET    /targets/{target_id}/feedback`` — list a user's rows
- ``POST   /targets/{target_id}/learn`` — deterministic learner (v1)
- ``POST   /targets/{target_id}/learn-llm`` — LLM ProfilePatch learner (v2)
- ``GET    /targets/{target_id}/learning-log`` — audit list for settings UI
- ``POST   /targets/{target_id}/learn/{run_id}/apply`` — accept a staged patch
- ``POST   /targets/{target_id}/learn/{run_id}/reject`` — reject a staged patch

Auth: JWT (``get_current_user_id``). API-key only callers are not
expected here — feedback is fundamentally per-user.
"""

from __future__ import annotations

from typing import Any, cast

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from supabase import Client

from app.dependencies import get_current_user_id, get_llm_client, get_supabase
from app.models.feedback import (
    FeedbackCreate,
    FeedbackCreateResponse,
    FeedbackList,
    LearnerPatchSummary,
)
from app.models.learning import LearningRunResult, TargetLearningLogRow
from app.services.feedback import (
    delete_feedback,
    list_for_target,
    maybe_run_learner,
    upsert_feedback,
)
from app.services.llm.client import LLMClient
from app.services.llm_learner import (
    apply_staged_patch,
    reject_staged_patch,
    run_llm_learner,
)

router = APIRouter(tags=["feedback"])


def _job_exists(supabase: Client, job_id: str) -> bool:
    resp = supabase.table("jobs").select("id").eq("id", job_id).execute()
    return bool(resp.data)


def _target_exists_for_user(
    supabase: Client, user_id: str, target_id: str
) -> bool:
    resp = (
        supabase.table("user_targets")
        .select("target_id")
        .eq("user_id", user_id)
        .eq("target_id", target_id)
        .execute()
    )
    return bool(resp.data)


@router.post("/jobs/{job_id}/feedback", response_model=FeedbackCreateResponse)
async def create_feedback(
    job_id: str,
    body: FeedbackCreate,
    background: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> FeedbackCreateResponse:
    if not _job_exists(supabase, job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    if not _target_exists_for_user(supabase, user_id, body.target_id):
        # Don't leak whether the target exists for someone else — same 404.
        raise HTTPException(status_code=404, detail="Target not found for user")

    row = upsert_feedback(
        supabase,
        user_id=user_id,
        job_posting_id=job_id,
        target_id=body.target_id,
        signal=body.signal,
        reason=body.reason,
    )

    # Only ``irrelevant`` signals feed the v1 learner — positive feedback
    # routes to ``secondary_skills`` in v2 (LLM only, since the heuristic
    # for "which positive token to weight" is harder).
    queued = body.signal == "irrelevant"
    if queued:
        background.add_task(
            _safe_run_learner, supabase, user_id, body.target_id
        )

    return FeedbackCreateResponse(feedback=row, queued_learn_run=queued)


@router.delete("/jobs/{job_id}/feedback", status_code=204)
async def remove_feedback(
    job_id: str,
    target_id: str = Query(...),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> None:
    delete_feedback(
        supabase,
        user_id=user_id,
        job_posting_id=job_id,
        target_id=target_id,
    )


@router.get("/targets/{target_id}/feedback", response_model=FeedbackList)
async def list_feedback(
    target_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> FeedbackList:
    if not _target_exists_for_user(supabase, user_id, target_id):
        raise HTTPException(status_code=404, detail="Target not found for user")
    rows, total = list_for_target(
        supabase,
        user_id=user_id,
        target_id=target_id,
        limit=limit,
        offset=offset,
    )
    return FeedbackList(rows=rows, total=total)


@router.post(
    "/targets/{target_id}/learn",
    response_model=LearnerPatchSummary | None,
)
async def run_learner_now(
    target_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> Any:
    if not _target_exists_for_user(supabase, user_id, target_id):
        raise HTTPException(status_code=404, detail="Target not found for user")
    return maybe_run_learner(supabase, user_id=user_id, target_id=target_id)


@router.post(
    "/targets/{target_id}/learn-llm",
    response_model=LearningRunResult | None,
)
async def run_llm_learner_now(
    target_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
) -> Any:
    """Force-run the LLM ProfilePatch learner.

    Returns ``None`` if there's nothing to learn from (below threshold).
    Returns a result with ``applied=True`` when the patch was auto-applied
    (confidence ≥ 0.6), or ``applied=False`` when it was staged for review.
    """
    if not _target_exists_for_user(supabase, user_id, target_id):
        raise HTTPException(status_code=404, detail="Target not found for user")
    return await run_llm_learner(
        supabase, llm, user_id=user_id, target_id=target_id
    )


@router.get(
    "/targets/{target_id}/learning-log",
    response_model=list[TargetLearningLogRow],
)
async def list_learning_log(
    target_id: str,
    status: str | None = Query(
        default=None, pattern="^(applied|staged|rejected)$"
    ),
    limit: int = Query(50, ge=1, le=200),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> list[TargetLearningLogRow]:
    if not _target_exists_for_user(supabase, user_id, target_id):
        raise HTTPException(status_code=404, detail="Target not found for user")
    query = (
        supabase.table("target_learning_log")
        .select("*")
        .eq("user_id", user_id)
        .eq("target_id", target_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    if status:
        query = query.eq("status", status)
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    return [TargetLearningLogRow.model_validate(r) for r in rows]


@router.post(
    "/targets/{target_id}/learn/{run_id}/apply",
    response_model=LearningRunResult,
)
async def apply_learning_run(
    target_id: str,
    run_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> Any:
    if not _target_exists_for_user(supabase, user_id, target_id):
        raise HTTPException(status_code=404, detail="Target not found for user")
    result = apply_staged_patch(supabase, user_id=user_id, run_id=run_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No staged patch with that run_id for this user",
        )
    return result


@router.post(
    "/targets/{target_id}/learn/{run_id}/reject",
    response_model=LearningRunResult,
)
async def reject_learning_run(
    target_id: str,
    run_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> Any:
    if not _target_exists_for_user(supabase, user_id, target_id):
        raise HTTPException(status_code=404, detail="Target not found for user")
    result = reject_staged_patch(supabase, user_id=user_id, run_id=run_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No staged patch with that run_id for this user",
        )
    return result


# ---- BackgroundTasks wrapper ----------------------------------------------


def _safe_run_learner(supabase: Client, user_id: str, target_id: str) -> None:
    """BackgroundTasks consumes exceptions but logs them poorly. Wrap so
    a learner failure can't surface as an opaque 500 on a subsequent
    request, while still emitting a usable traceback in logs."""
    import logging

    logger = logging.getLogger("app.routers.feedback")
    try:
        maybe_run_learner(supabase, user_id=user_id, target_id=target_id)
    except Exception:
        logger.exception(
            "Feedback learner failed for (user=%s, target=%s)",
            user_id,
            target_id,
        )
