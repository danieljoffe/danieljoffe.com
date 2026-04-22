"""Cost-log CRUD. Every LLM call writes one row here.

Consumers call `record(...)` right after `client.complete(...)` with the
resulting `LLMResult` + a `purpose` label. Spend queries (`total_spend`,
`spend_by_purpose`) power the dashboard and any future budget guards.
"""

from datetime import datetime
from typing import Any, cast

from supabase import Client

from app.models.llm import LLMCallRecord, LLMResult

TABLE = "llm_cost_log"


def record(
    supabase: Client,
    user_id: str | None,
    purpose: str,
    result: LLMResult,
    metadata: dict[str, str | int | float | bool] | None = None,
) -> LLMCallRecord:
    row = {
        "user_id": user_id,
        "model": result.model,
        "purpose": purpose,
        "input_tokens": result.usage.input_tokens,
        "output_tokens": result.usage.output_tokens,
        "cache_read_input_tokens": result.usage.cache_read_input_tokens,
        "cache_creation_input_tokens": result.usage.cache_creation_input_tokens,
        "cost_usd": result.cost_usd,
        "latency_ms": result.latency_ms,
        "metadata": metadata or {},
    }
    resp = supabase.table(TABLE).insert(row).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to insert llm_cost_log row")
    return LLMCallRecord.model_validate(rows[0])


def list_recent(
    supabase: Client,
    user_id: str | None,
    limit: int = 100,
) -> list[LLMCallRecord]:
    query = supabase.table(TABLE).select("*").order("created_at", desc=True).limit(limit)
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    return [LLMCallRecord.model_validate(r) for r in rows]


def total_spend(
    supabase: Client,
    user_id: str | None,
    since: datetime | None = None,
) -> float:
    query = supabase.table(TABLE).select("cost_usd")
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    if since is not None:
        query = query.gte("created_at", since.isoformat())
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    return round(sum(float(r["cost_usd"]) for r in rows), 6)


def spend_by_purpose(
    supabase: Client,
    user_id: str | None,
    since: datetime | None = None,
) -> dict[str, float]:
    query = supabase.table(TABLE).select("purpose, cost_usd")
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    if since is not None:
        query = query.gte("created_at", since.isoformat())
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    totals: dict[str, float] = {}
    for r in rows:
        totals[r["purpose"]] = totals.get(r["purpose"], 0.0) + float(r["cost_usd"])
    return {k: round(v, 6) for k, v in totals.items()}
