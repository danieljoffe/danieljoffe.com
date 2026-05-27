"""Analysis router.

POST /analysis/{job_id}?target_id=...  — run or return cached LLM
analysis for a job posting against a specific target. Cache key is
(job_posting_id, target_id, optimized_doc_id).
"""

import logging
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.dependencies import (
    enforce_llm_budget,
    get_current_user_id_optional,
    get_llm_client,
    get_supabase,
    verify_api_key_or_jwt,
)
from app.models.analysis import JobAnalysisRecord
from app.services.analysis import persistence
from app.services.analysis.analyze import DEFAULT_PURPOSE, analyze_job
from app.services.analysis.scoring import blend_scores, scorecard_to_numeric
from app.services.experience import optimized
from app.services.llm import cost_log
from app.services.llm.client import LLMClient
from app.services.targets import crud as targets_crud

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
    dependencies=[Depends(verify_api_key_or_jwt)],
)


@router.post("/{job_id}", dependencies=[Depends(enforce_llm_budget)])
async def create_analysis(
    job_id: str,
    target_id: str = Query(..., description="Target the user is viewing the job under"),
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> JobAnalysisRecord:
    # 1. Fetch optimized doc (needed for cache key)
    current_optimized = optimized.get_latest(supabase, user_id=user_id)
    if current_optimized is None:
        raise HTTPException(
            status_code=404,
            detail="No optimized doc found. Derive one via POST /experience/derive first.",
        )

    # 2. Check cache — keyed on (job, target, optimized version)
    cached = persistence.get_cached(
        supabase,
        job_id,
        target_id=target_id,
        optimized_doc_id=current_optimized.id,
        user_id=user_id,
    )
    if cached is not None:
        return cached

    # 3. Fetch target (existence check + context for the LLM)
    target = targets_crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found.")

    # 4. Fetch job posting (existence + description in one round-trip)
    resp = (
        supabase.table("jobs")
        .select("id, description_html")
        .eq("id", job_id)
        .limit(1)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise HTTPException(status_code=404, detail="Job posting not found.")
    description_html = rows[0].get("description_html") or ""
    if not description_html.strip():
        raise HTTPException(
            status_code=422,
            detail="Job posting has no description to analyze.",
        )

    # 5. Run LLM analysis with target context
    target_context = (
        f"Target: {target.label}"
        + (f"\nDescription: {target.description}" if target.description else "")
    )
    analysis, llm_result = await analyze_job(
        llm,
        optimized=current_optimized.payload,
        job_description=description_html,
        target_context=target_context,
    )

    # 6. Log cost
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=DEFAULT_PURPOSE,
        result=llm_result,
        metadata={
            "job_posting_id": job_id,
            "target_id": target_id,
            "optimized_doc_id": current_optimized.id,
        },
    )

    # 7. Persist
    record = persistence.persist(
        supabase,
        job_posting_id=job_id,
        target_id=target_id,
        user_id=user_id,
        optimized_doc_id=current_optimized.id,
        analysis=analysis,
        llm_result=llm_result,
    )

    # 8. Blend the LLM-derived numeric score into the per-target ``scores``
    # row + flip scoring_status to 'complete' so the list view ranking
    # reflects the LLM's correction. Previously this only happened on the
    # cron poller path — user-initiated analyses left the row at
    # stage2/keyword-only, so e.g. a posting with a 61 keyword score that
    # the LLM rated "Skip" (domain mismatch) stayed ranked at 61 in
    # ``/jobs?target_id=...`` ordering.
    _apply_llm_blend(
        supabase,
        job_posting_id=job_id,
        target_id=target_id,
        scorecard=analysis.scorecard,
        analysis_id=record.id,
    )

    return record


def _apply_llm_blend(
    supabase: Client,
    *,
    job_posting_id: str,
    target_id: str,
    scorecard: Any,
    analysis_id: str,
) -> None:
    """Blend the LLM scorecard into the per-target ``scores`` row.

    Reads the current keyword score, blends with the LLM numeric, writes
    back score + scoring_status='complete'. Best-effort: failures are
    swallowed so an LLM blend hiccup doesn't fail the user's request.
    """
    try:
        cur_resp = (
            supabase.table("scores")
            .select("score")
            .eq("job_posting_id", job_posting_id)
            .eq("target_id", target_id)
            .limit(1)
            .execute()
        )
        rows = cast(list[dict[str, Any]], cur_resp.data or [])
        keyword_score = int(rows[0]["score"]) if rows else 0
        llm_score = scorecard_to_numeric(scorecard)
        blended = blend_scores(keyword_score, llm_score)
        supabase.table("scores").update(
            {
                "score": blended,
                "scoring_status": "complete",
            }
        ).eq("job_posting_id", job_posting_id).eq(
            "target_id", target_id
        ).execute()
        # Also stamp the analysis id on the jobs row so the poller's
        # cache lookup (keyed on llm_analysis_id) can still hit on a
        # future re-score without re-running the LLM.
        supabase.table("jobs").update({"llm_analysis_id": analysis_id}).eq(
            "id", job_posting_id
        ).execute()
    except Exception:
        # Best-effort: a stale write here doesn't fail the user's
        # request (the analysis itself succeeded + was returned), but
        # the list ranking won't reflect the LLM blend until the next
        # cron pass. Log via WARNING so the spike is detectable.
        logger.warning(
            "Failed to blend LLM score for job=%s target=%s",
            job_posting_id,
            target_id,
            exc_info=True,
        )
