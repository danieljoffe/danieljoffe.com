"""Idle-account lifecycle sweep.

Two cleanups, run from the poll cycle (throttled in the caller):

1. **Auto-deactivate idle users' targets** — users unseen for
   ``idle_deactivate_days`` get their active ``user_targets`` flipped
   inactive (the DB trigger syncs ``targets.is_active``), stamped with
   ``auto_deactivated_at``, and receive one "target paused" email. Only
   rows transitioned in THIS run are emailed, so at-most-once holds
   without a dedup table.

2. **Batch reaper** — ``batch_runs`` stuck in ``processing`` beyond
   ``BATCH_STUCK_HOURS`` flip to ``failed`` so they stop looking alive.

Idempotent by construction: both steps only transition rows, so re-runs
(e.g. after a restart loses the throttle marker) are no-ops.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Any, cast

from supabase import Client

from app.config import settings
from app.services import notify

logger = logging.getLogger(__name__)

BATCH_STUCK_HOURS = 2


async def run_lifecycle_sweep(supabase: Client) -> dict[str, int]:
    """Run both cleanups; returns counts for logging/tests."""
    deactivated = await _deactivate_idle_targets(supabase)
    reaped = await _reap_stuck_batches(supabase)
    if deactivated or reaped:
        logger.info(
            "lifecycle sweep: deactivated=%d stuck_batches_failed=%d",
            deactivated,
            reaped,
        )
    return {"deactivated": deactivated, "batches_reaped": reaped}


async def _deactivate_idle_targets(supabase: Client) -> int:
    if settings.idle_deactivate_days <= 0:
        return 0
    cutoff = (
        datetime.now(UTC) - timedelta(days=settings.idle_deactivate_days)
    ).isoformat()

    idle_resp = await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .select("user_id")
        .lt("last_seen_at", cutoff)
        .execute()
    )
    idle_ids = [
        r["user_id"]
        for r in cast(list[dict[str, Any]], idle_resp.data or [])
        if r.get("user_id")
    ]
    if not idle_ids:
        return 0

    total = 0
    now_iso = datetime.now(UTC).isoformat()
    for uid in idle_ids:
        # Flip + stamp in one filtered update; the returned rows are
        # exactly the links transitioned in this run.
        def _flip(user_id: str = uid) -> Any:
            return (
                supabase.table("user_targets")
                .update(
                    {
                        "is_active": False,
                        "auto_deactivated_at": now_iso,
                        "updated_at": now_iso,
                    }
                )
                .eq("user_id", user_id)
                .eq("is_active", True)
                .execute()
            )

        flip_resp = await asyncio.to_thread(_flip)
        flipped = cast(list[dict[str, Any]], flip_resp.data or [])
        if not flipped:
            continue
        total += len(flipped)

        target_ids = [r["target_id"] for r in flipped if r.get("target_id")]
        labels = await _target_labels(supabase, target_ids)
        try:
            await notify.send_target_paused_email(
                supabase, user_id=uid, target_labels=labels
            )
        except Exception:
            # The deactivation already happened; a lost email is the
            # accepted trade (mirrors job-alert semantics).
            logger.exception("target-paused email failed for user %s", uid)
    return total


async def _target_labels(supabase: Client, target_ids: list[str]) -> list[str]:
    if not target_ids:
        return []
    resp = await asyncio.to_thread(
        lambda: supabase.table("targets")
        .select("label")
        .in_("id", target_ids)
        .execute()
    )
    return [
        str(r.get("label") or "")
        for r in cast(list[dict[str, Any]], resp.data or [])
    ]


async def _reap_stuck_batches(supabase: Client) -> int:
    cutoff = (datetime.now(UTC) - timedelta(hours=BATCH_STUCK_HOURS)).isoformat()
    resp = await asyncio.to_thread(
        lambda: supabase.table("batch_runs")
        .update({"status": "failed", "updated_at": datetime.now(UTC).isoformat()})
        .eq("status", "processing")
        .lt("updated_at", cutoff)
        .execute()
    )
    return len(cast(list[dict[str, Any]], resp.data or []))
