"""Backfill LLM fit scores for pre-Phase 4 user_targets rows.

Phase 4 added LLM-derived fit scores to the user-target junction. Targets
linked before that landed have ``fit_score IS NULL`` and show no badge in
the UI. This script finds those rows, derives a score against the user's
optimized profile, and writes it back.

Idempotent: only touches rows where fit_score IS NULL. Safe to re-run.

Usage:
    cd apps/wyrdfold-api && uv run python scripts/backfill_fit_scores.py
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any, cast

from app.services.experience import optimized
from app.services.llm import cost_log
from app.services.llm import get_default_client as get_llm_client
from app.services.targets.crud import (
    TARGETS_TABLE,
    USER_TARGETS_TABLE,
    _parse_target,
)
from app.services.targets.fit_score import DEFAULT_PURPOSE, derive_fit_score
from app.supabase_pool import get_supabase_pool, init_supabase

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("backfill")


async def backfill() -> int:
    init_supabase()
    supabase = get_supabase_pool()
    if supabase is None:
        raise RuntimeError("Supabase not configured — check .env")

    rows_resp = (
        supabase.table(USER_TARGETS_TABLE)
        .select("id, user_id, target_id")
        .is_("fit_score", "null")
        .execute()
    )
    rows = cast(list[dict[str, Any]], rows_resp.data or [])
    logger.info("Found %d user_targets row(s) with NULL fit_score", len(rows))
    if not rows:
        return 0

    llm = get_llm_client()
    payload_cache: dict[str, Any] = {}
    updated = 0

    for row in rows:
        user_id = row["user_id"]
        target_id = row["target_id"]

        # Cache the optimized payload per user_id; legacy single-admin rows
        # ("tools-admin" or the older "__system__" sentinel) all map to the
        # NULL-user_id experience_optimized_docs row from before multi-user.
        cache_key = user_id
        if cache_key not in payload_cache:
            legacy_admin_ids = {"tools-admin", "__system__"}
            lookup_user = None if user_id in legacy_admin_ids else user_id
            doc = optimized.get_latest(supabase, user_id=lookup_user)
            payload_cache[cache_key] = doc.payload if doc else None

        payload = payload_cache[cache_key]
        if payload is None:
            logger.warning(
                "Skipping target %s for user %s — no optimized profile",
                target_id,
                user_id,
            )
            continue

        target_resp = (
            supabase.table(TARGETS_TABLE).select("*").eq("id", target_id).execute()
        )
        target_rows = cast(list[dict[str, Any]], target_resp.data or [])
        if not target_rows:
            logger.warning("Target %s not found, skipping", target_id)
            continue
        target = _parse_target(target_rows[0])

        fit_result, llm_result = await derive_fit_score(
            llm, payload=payload, target=target
        )
        cost_log.record(
            supabase,
            user_id=None,
            purpose=DEFAULT_PURPOSE,
            result=llm_result,
            metadata={"target_id": target_id, "user_id": user_id, "backfill": True},
        )

        supabase.table(USER_TARGETS_TABLE).update(
            {
                "fit_score": fit_result.fit_score,
                "fit_score_reasoning": fit_result.reasoning,
                "updated_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", row["id"]).execute()

        logger.info(
            "✓ %s — score %d (%s)",
            target.label,
            fit_result.fit_score,
            fit_result.reasoning[:80] + ("…" if len(fit_result.reasoning) > 80 else ""),
        )
        updated += 1

    logger.info("Backfilled %d row(s)", updated)
    return updated


if __name__ == "__main__":
    asyncio.run(backfill())
