"""Per-user LLM budget guard (defense-in-depth on cost).

Reads recent rows from ``llm_costs`` for the user and refuses new LLM
calls when the rolling daily or hourly spend exceeds a configured cap.
API-key callers (cron/poller/batch) are NOT checked here — system paths
are trusted and gated separately by the operator.

The guard is advisory: a single in-flight call can still push spend
*past* the cap, since cost is recorded only after the LLM returns. Pair
with provider-side spend alerts for a hard ceiling.
"""

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from supabase import Client

from app.services.llm import cost_log


def check_user_budget(
    supabase: Client,
    *,
    user_id: str,
    daily_limit_usd: float,
    hourly_limit_usd: float,
) -> None:
    """Raise 429 if the user has hit their rolling daily or hourly cap.

    Limits of ``0`` disable that window. Hourly is checked first so a
    spam burst trips the smaller window before exhausting the day.
    """
    now = datetime.now(UTC)

    if hourly_limit_usd > 0:
        spent_hour = cost_log.total_spend(
            supabase, user_id=user_id, since=now - timedelta(hours=1)
        )
        if spent_hour >= hourly_limit_usd:
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "llm_budget_exceeded",
                    "scope": "hourly",
                    "limit_usd": hourly_limit_usd,
                    "spent_usd": spent_hour,
                },
            )

    if daily_limit_usd > 0:
        spent_day = cost_log.total_spend(
            supabase, user_id=user_id, since=now - timedelta(hours=24)
        )
        if spent_day >= daily_limit_usd:
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "llm_budget_exceeded",
                    "scope": "daily",
                    "limit_usd": daily_limit_usd,
                    "spent_usd": spent_day,
                },
            )
