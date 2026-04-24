"""Cache CRUD for job_analyses table.

One analysis per (user, job_posting) pair. Subsequent requests for the
same pair return the cached row without re-running the LLM.
"""

from __future__ import annotations

from typing import Any, cast

from supabase import Client

from app.models.analysis import JobAnalysis, JobAnalysisRecord
from app.models.llm import LLMResult

TABLE = "job_analyses"


def get_cached(
    supabase: Client,
    job_posting_id: str,
    user_id: str | None,
) -> JobAnalysisRecord | None:
    """Return the most recent analysis for this job+user, or None."""
    query = (
        supabase.table(TABLE)
        .select("*")
        .eq("job_posting_id", job_posting_id)
        .order("created_at", desc=True)
        .limit(1)
    )
    query = (
        query.is_("user_id", "null")
        if user_id is None
        else query.eq("user_id", user_id)
    )
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        return None
    return JobAnalysisRecord.model_validate(rows[0])


def persist(
    supabase: Client,
    *,
    job_posting_id: str,
    user_id: str | None,
    optimized_doc_id: str | None,
    analysis: JobAnalysis,
    llm_result: LLMResult,
) -> JobAnalysisRecord:
    """Insert one job_analyses row."""
    row: dict[str, Any] = {
        "job_posting_id": job_posting_id,
        "user_id": user_id,
        "optimized_doc_id": optimized_doc_id,
        "scorecard": analysis.scorecard.model_dump(mode="json"),
        "recommendation": analysis.recommendation,
        "model": llm_result.model,
        "cost_usd": llm_result.cost_usd,
        "latency_ms": llm_result.latency_ms,
    }
    resp = supabase.table(TABLE).insert(row).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to insert job_analyses row")
    return JobAnalysisRecord.model_validate(rows[0])
