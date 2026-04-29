"""Analysis router.

POST /analysis/{job_id}  — run or return cached LLM analysis for a job posting.
"""

from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.dependencies import get_llm_client, get_supabase, verify_api_key_or_session
from app.models.analysis import JobAnalysisRecord
from app.services.analysis import persistence
from app.services.analysis.analyze import DEFAULT_PURPOSE, analyze_job
from app.services.experience import optimized
from app.services.llm import cost_log
from app.services.llm.client import LLMClient

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
    dependencies=[Depends(verify_api_key_or_session)],
)


@router.post("/{job_id}")
async def create_analysis(
    job_id: str,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
) -> JobAnalysisRecord:
    # 1. Check cache
    cached = persistence.get_cached(supabase, job_id, user_id=None)
    if cached is not None:
        return cached

    # 2. Fetch optimized doc
    current_optimized = optimized.get_latest(supabase, user_id=None)
    if current_optimized is None:
        raise HTTPException(
            status_code=404,
            detail="No optimized doc found. Derive one via POST /experience/derive first.",
        )

    # 3. Fetch job posting (existence + description in one round-trip)
    resp = (
        supabase.table("job_postings")
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

    # 4. Run LLM analysis
    analysis, llm_result = await analyze_job(
        llm,
        optimized=current_optimized.payload,
        job_description=description_html,
    )

    # 5. Log cost
    cost_log.record(
        supabase,
        user_id=None,
        purpose=DEFAULT_PURPOSE,
        result=llm_result,
        metadata={
            "job_posting_id": job_id,
            "optimized_doc_id": current_optimized.id,
        },
    )

    # 6. Persist
    record = persistence.persist(
        supabase,
        job_posting_id=job_id,
        user_id=None,
        optimized_doc_id=current_optimized.id,
        analysis=analysis,
        llm_result=llm_result,
    )

    return record
