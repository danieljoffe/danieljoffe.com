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


def effective_monthly_cap(
    supabase: Client, *, user_id: str, default_usd: float
) -> float:
    """Resolve the user's monthly allowance: per-user override or default.

    ``user_profiles.llm_monthly_budget_usd`` is the manual "add credits"
    lever — NULL (or no profile row) means the global default applies.
    """
    rows = cast(
        list[dict[str, Any]],
        supabase.table("user_profiles")
        .select("llm_monthly_budget_usd")
        .eq("user_id", user_id)
        .execute()
        .data
        or [],
    )
    override = rows[0].get("llm_monthly_budget_usd") if rows else None
    return float(cast(float, override)) if override is not None else default_usd


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
