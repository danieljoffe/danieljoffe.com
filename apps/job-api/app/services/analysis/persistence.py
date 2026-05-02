"""Cache CRUD for analyses table.

The cache key is (job_posting_id, target_id, optimized_doc_id) so that
re-deriving the master doc or switching targets naturally invalidates
prior rows. Each (job, target, optimized version) combination runs the
LLM at most once.
"""

from __future__ import annotations

from typing import Any, cast

from supabase import Client

from app.models.analysis import JobAnalysis, JobAnalysisRecord
from app.models.llm import LLMResult

TABLE = "analyses"


def get_cached(
    supabase: Client,
    job_posting_id: str,
    *,
    target_id: str,
    optimized_doc_id: str,
    user_id: str | None,
) -> JobAnalysisRecord | None:
    """Return the cached analysis for this (job, target, optimized) combo, or None."""
    query = (
        supabase.table(TABLE)
        .select("*")
        .eq("job_posting_id", job_posting_id)
        .eq("target_id", target_id)
        .eq("optimized_doc_id", optimized_doc_id)
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
    target_id: str,
    user_id: str | None,
    optimized_doc_id: str | None,
    analysis: JobAnalysis,
    llm_result: LLMResult,
) -> JobAnalysisRecord:
    """Insert one analyses row."""
    row: dict[str, Any] = {
        "job_posting_id": job_posting_id,
        "target_id": target_id,
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
        raise RuntimeError("Failed to insert analyses row")
    return JobAnalysisRecord.model_validate(rows[0])
