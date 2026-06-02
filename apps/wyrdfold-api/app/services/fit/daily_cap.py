"""Per-target daily cap on Phase 2 LLM calls.

Phase 2 (Sonnet at ~$0.0035 per call) is the dominant cost line in the
LLM scoring pipeline. With 5 active targets × ~100 promising jobs per
poll cycle × ~12 polls/day, an uncapped Phase 2 would burn ~$21/day
worst case. The cap holds each active target to a sustainable daily
budget; rows that don't fit stay ``promising=true, score=NULL`` and
either get scored on the next day's quota or on user click-through.

The counter sources its truth from ``llm_costs`` so we don't need a
separate counter table — every Phase 2 call already writes a row
there with ``purpose='fit.job'`` + ``metadata.target_id``. UTC midnight
is the rollover.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, time

from supabase import Client

from app.services.fit.job_fit import JOB_FIT_PURPOSE

logger = logging.getLogger(__name__)

DEFAULT_DAILY_CAP = 100
"""Default per-target Phase 2 quota per UTC day.

Tuned for: 5 active targets * 100 calls/day * $0.0035 = ~$1.75/day
ceiling on Phase 2 spend across the system. Per-target quota matches
"first page renders fast + rest defer" semantics — the user always
gets some fresh Phase 2 grades, even when a high-volume poll cycle
would otherwise blow the entire budget on one target.
"""


def _utc_day_start() -> str:
    """ISO-8601 UTC midnight of today."""
    return datetime.combine(
        datetime.now(UTC).date(), time.min, tzinfo=UTC
    ).isoformat()


def phase2_quota_remaining(
    supabase: Client,
    target_id: str,
    cap: int = DEFAULT_DAILY_CAP,
) -> int:
    """Return how many more Phase 2 calls this target can issue today.

    Counts ``llm_costs`` entries with ``purpose='fit.job'`` and
    ``metadata.target_id`` matching, since UTC midnight. Returns
    ``max(0, cap - used)``.

    On any DB error returns ``0`` (refuse to spend rather than risk
    blowing past the cap). Logged so an operator sees the refusal.
    """
    try:
        resp = (
            supabase.table("llm_costs")
            .select("id", count="exact")  # type: ignore[arg-type]
            .eq("purpose", JOB_FIT_PURPOSE)
            .eq("metadata->>target_id", target_id)
            .gte("created_at", _utc_day_start())
            .limit(1)
            .execute()
        )
    except Exception:
        logger.exception(
            "phase2_quota_remaining: count failed for target %s; "
            "refusing to spend",
            target_id,
        )
        return 0
    used = resp.count or 0
    return max(0, cap - used)
