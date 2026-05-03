"""Analysis router.

POST /analysis/{job_id}?target_id=...  — run or return cached LLM
analysis for a job posting against a specific target. Cache key is
(job_posting_id, target_id, optimized_doc_id).
"""

from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.dependencies import (
    get_current_user_id_optional,
    get_llm_client,
    get_supabase,
    verify_api_key_or_jwt,
)
from app.models.analysis import JobAnalysisRecord
from app.services.analysis import persistence
from app.services.analysis.analyze import DEFAULT_PURPOSE, analyze_job
from app.services.experience import optimized
from app.services.llm import cost_log
from app.services.llm.client import LLMClient
from app.services.targets import crud as targets_crud

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
    dependencies=[Depends(verify_api_key_or_jwt)],
)


@router.post("/{job_id}")
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

    return record
