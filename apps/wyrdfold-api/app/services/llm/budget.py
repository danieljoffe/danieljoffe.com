"""Per-user LLM budget guard (defense-in-depth on cost).

Reads recent rows from ``llm_costs`` for the user and refuses new LLM
calls when a rolling hourly/daily/monthly spend cap is exceeded. API-key
callers (cron/poller/batch) are NOT checked here — background work is
charged to the target's activator and gated in the poller against the
same monthly allowance.

The guard is advisory: a single in-flight call can still push spend
*past* the cap, since cost is recorded only after the LLM returns. The
hourly window bounds the worst-case overshoot.
"""

from datetime import UTC, datetime, timedelta
from typing import Any, cast

from fastapi import HTTPException
from supabase import Client

from app.services.llm import cost_log

MONTHLY_WINDOW_DAYS = 30
"""Rolling window for the monthly allowance. Rolling beats calendar-month:
no first-of-month reset stampede, and it matches how Claude's own usage
limits behave."""


def get_llm_account(
    supabase: Client, *, user_id: str, default_usd: float
) -> tuple[float, bool]:
    """One profile read → (effective monthly cap, llm_enabled).

    ``llm_monthly_budget_usd`` is the manual "add credits" lever — NULL
    (or no profile row) means the global default. ``llm_enabled`` is the
    operator kill-switch; missing rows default to enabled.
    """
    rows = cast(
        list[dict[str, Any]],
        supabase.table("user_profiles")
        .select("llm_monthly_budget_usd,llm_enabled")
        .eq("user_id", user_id)
        .execute()
        .data
        or [],
    )
    override = rows[0].get("llm_monthly_budget_usd") if rows else None
    enabled = bool(rows[0].get("llm_enabled", True)) if rows else True
    cap = float(cast(float, override)) if override is not None else default_usd
    return cap, enabled


def effective_monthly_cap(
    supabase: Client, *, user_id: str, default_usd: float
) -> float:
    """Back-compat wrapper around :func:`get_llm_account` (cap only)."""
    cap, _ = get_llm_account(supabase, user_id=user_id, default_usd=default_usd)
    return cap


def raise_if_llm_disabled(enabled: bool) -> None:
    """403 when the operator kill-switch is off for this account."""
    if not enabled:
        raise HTTPException(
            status_code=403,
            detail={"code": "llm_disabled"},
        )


def _raise_budget_429(scope: str, limit_usd: float, spent_usd: float) -> None:
    raise HTTPException(
        status_code=429,
        detail={
            "code": "llm_budget_exceeded",
            "scope": scope,
            "limit_usd": limit_usd,
            "spent_usd": spent_usd,
        },
    )


def check_user_budget(
    supabase: Client,
    *,
    user_id: str,
    daily_limit_usd: float,
    hourly_limit_usd: float,
    monthly_limit_usd: float = 0.0,
) -> None:
    """Raise 429 if the user has hit a rolling hourly/daily/monthly cap.

    Limits of ``0`` disable that window. Hourly is checked first so a
    spam burst trips the smaller window before exhausting the day; the
    monthly allowance is the overall ceiling.
    """
    now = datetime.now(UTC)

    if hourly_limit_usd > 0:
        spent_hour = cost_log.total_spend(
            supabase, user_id=user_id, since=now - timedelta(hours=1)
        )
        if spent_hour >= hourly_limit_usd:
            _raise_budget_429("hourly", hourly_limit_usd, spent_hour)

    if daily_limit_usd > 0:
        spent_day = cost_log.total_spend(
            supabase, user_id=user_id, since=now - timedelta(hours=24)
        )
        if spent_day >= daily_limit_usd:
            _raise_budget_429("daily", daily_limit_usd, spent_day)

    if monthly_limit_usd > 0:
        spent_month = cost_log.total_spend(
            supabase,
            user_id=user_id,
            since=now - timedelta(days=MONTHLY_WINDOW_DAYS),
        )
        if spent_month >= monthly_limit_usd:
            _raise_budget_429("monthly", monthly_limit_usd, spent_month)


def check_daily_count(
    supabase: Client,
    *,
    user_id: str,
    purpose: str,
    limit: int,
) -> None:
    """Raise 429 if the user already has ``limit`` llm_costs rows for
    ``purpose`` in the rolling 24h window.

    Count-based companion to the $-budget: bounds chatty features (deep
    job analysis) regardless of per-call price. Cache hits never write a
    cost row, so they neither count nor get blocked. ``limit=0`` disables.
    """
    if limit <= 0:
        return
    since = (datetime.now(UTC) - timedelta(hours=24)).isoformat()
    used = (
        supabase.table("llm_costs")
        .select("id", count="exact")  # type: ignore[arg-type]
        .eq("user_id", user_id)
        .eq("purpose", purpose)
        .gte("created_at", since)
        .execute()
        .count
        or 0
    )
    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "analysis_daily_limit",
                "purpose": purpose,
                "limit": limit,
                "used": used,
            },
        )
