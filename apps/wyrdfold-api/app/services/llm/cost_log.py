"""Cost-log CRUD. Every LLM completion or embedding call writes one row here.

Consumers call `record(...)` right after `client.complete(...)` (LLM) or
`record_embedding(...)` after `embed_client.embed(...)` with the result
+ a `purpose` label. Spend queries (`total_spend`, `spend_by_purpose`)
power the dashboard and any future budget guards.

The model column holds either a Claude ID or a Voyage ID — disambiguated
by the caller, opaque at the read layer.
"""

import logging
from datetime import datetime
from typing import Any, cast

from supabase import Client

from app.models.embeddings import EmbeddingResult
from app.models.llm import LLMCallRecord, LLMResult

TABLE = "llm_costs"

_log = logging.getLogger(__name__)


def _insert_row(supabase: Client, row: dict[str, Any]) -> LLMCallRecord:
    resp = supabase.table(TABLE).insert(row).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to insert llm_costs row")
    return LLMCallRecord.model_validate(rows[0])


def record(
    supabase: Client,
    user_id: str | None,
    purpose: str,
    result: LLMResult,
    metadata: dict[str, str | int | float | bool] | None = None,
) -> LLMCallRecord:
    return _insert_row(
        supabase,
        {
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
        },
    )


def record_embedding(
    supabase: Client,
    user_id: str | None,
    purpose: str,
    result: EmbeddingResult,
    metadata: dict[str, str | int | float | bool] | None = None,
) -> LLMCallRecord:
    return _insert_row(
        supabase,
        {
            "user_id": user_id,
            "model": result.model,
            "purpose": purpose,
            "input_tokens": result.usage.input_tokens,
            "output_tokens": 0,
            "cache_read_input_tokens": 0,
            "cache_creation_input_tokens": 0,
            "cost_usd": result.cost_usd,
            "latency_ms": result.latency_ms,
            "metadata": metadata or {},
        },
    )


def _row_for(
    *,
    user_id: str | None,
    purpose: str,
    result: LLMResult,
    metadata: dict[str, str | int | float | bool] | None,
) -> dict[str, Any]:
    return {
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


def enqueue(
    user_id: str | None,
    purpose: str,
    result: LLMResult,
    metadata: dict[str, str | int | float | bool] | None = None,
) -> None:
    """Async cost-log path for cron callers.

    Appends the row to the in-memory `cost_log_buffer.buffer` instead of
    issuing a synchronous INSERT. The buffer's background task batches
    rows into a single bulk INSERT every few seconds. Use this anywhere
    the call is system-driven (poller, batch endpoints) where the spend
    record doesn't need to be queryable immediately.

    Interactive paths (analysis, tailor, conversation) should keep using
    `record(...)` so the budget guard sees fresh totals on the next call.
    """
    # Imported here to avoid a circular import: the buffer module
    # imports `Client` from supabase, which is fine, but importing
    # `cost_log_buffer` at the top of `cost_log` would tie module
    # initialization order across services unnecessarily.
    from app.services.llm.cost_log_buffer import buffer

    buffer.enqueue(
        _row_for(user_id=user_id, purpose=purpose, result=result, metadata=metadata)
    )


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


def _total_spend_python(
    supabase: Client,
    user_id: str | None,
    since: datetime | None,
) -> float:
    """Fallback used when the Postgres RPC is unavailable (e.g. mid-deploy
    before the migration lands). Selects every row in the window and sums
    in Python — O(rows) on the wire and in memory."""
    query = supabase.table(TABLE).select("cost_usd")
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    if since is not None:
        query = query.gte("created_at", since.isoformat())
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    return round(sum(float(r["cost_usd"]) for r in rows), 6)


def total_spend(
    supabase: Client,
    user_id: str | None,
    since: datetime | None = None,
) -> float:
    """Sum of `cost_usd` over the window for this user.

    Tries the `total_spend_since` RPC first — Postgres returns a single
    `numeric` regardless of usage volume. Falls back to a client-side
    select+sum if the RPC isn't deployed yet, so the budget guard never
    fails closed during a partial deploy.
    """
    try:
        resp = supabase.rpc(
            "total_spend_since",
            {
                "p_user_id": user_id,
                "p_since": since.isoformat() if since is not None else None,
            },
        ).execute()
    except Exception:
        _log.debug("total_spend_since RPC unavailable, falling back to client-side sum")
        return _total_spend_python(supabase, user_id, since)

    # PostgREST returns scalar function results as the bare value (or in
    # `data` depending on client version). Numeric → str | int | float.
    raw = resp.data
    if raw is None:
        return 0.0
    return round(float(cast(Any, raw)), 6)


def _spend_by_purpose_python(
    supabase: Client,
    user_id: str | None,
    since: datetime | None,
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


def spend_by_purpose(
    supabase: Client,
    user_id: str | None,
    since: datetime | None = None,
) -> dict[str, float]:
    """Per-purpose spend breakdown over the window.

    Same RPC-first / client-fallback pattern as `total_spend`.
    """
    try:
        resp = supabase.rpc(
            "spend_by_purpose_since",
            {
                "p_user_id": user_id,
                "p_since": since.isoformat() if since is not None else None,
            },
        ).execute()
    except Exception:
        _log.debug(
            "spend_by_purpose_since RPC unavailable, falling back to client-side group"
        )
        return _spend_by_purpose_python(supabase, user_id, since)

    raw = resp.data
    if not raw:
        return {}
    return {k: round(float(v), 6) for k, v in cast(dict[str, Any], raw).items()}
