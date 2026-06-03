"""Backfill the slim target shape onto legacy rows.

PR A (slim target schema) added ``description`` / ``seniority_hint`` /
``domain_hints`` columns to ``targets``. New targets created after PR A
populate them at derivation time, but pre-existing targets still have
NULL slim fields. This script calls ``derive_profile_from_label`` once
per legacy target and writes the slim fields onto the row.

Idempotent: only touches targets where the slim shape is NOT fully
populated (description IS NULL OR seniority_hint IS NULL OR
domain_hints IS '{}'). Safe to re-run after a partial failure.

Cost: one Sonnet call per target. At ~$0.015 per derivation, three
active targets ≈ $0.05 total. The full system is small enough that
this is effectively free.

Once this script runs on all targets, PR C can drop the legacy keyword
scoring code path that Phase 2's prompt builder still falls back to
when slim fields are NULL.

Usage::

    cd apps/wyrdfold-api
    uv run python -m scripts.backfill_slim_target --dry-run
    uv run python -m scripts.backfill_slim_target
    uv run python -m scripts.backfill_slim_target --target <uuid>

Env required: ``SUPABASE_URL`` + ``SUPABASE_SERVICE_ROLE_KEY`` +
``LLM_PROVIDER=anthropic`` + ``ANTHROPIC_API_KEY``.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from typing import Any, cast

from app.config import settings
from app.models.targets import JobTarget, TargetUpdate
from app.services.experience import optimized
from app.services.llm import cost_log
from app.services.llm import get_default_client as get_llm_client
from app.services.targets import crud
from app.services.targets.derive_profile_from_label import (
    DEFAULT_PURPOSE,
    derive_profile_from_label,
)
from app.supabase_pool import get_supabase_pool, init_supabase

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("backfill_slim_target")


def _needs_backfill(target: JobTarget) -> bool:
    """A target needs the slim backfill if ANY slim field is missing.

    We use OR rather than AND so a target derived BEFORE the prompt
    extension fully shipped (e.g. mid-rollout) still gets re-derived to
    fill in whichever slim fields it's missing. ``derive_profile_from_label``
    is the same source of truth either way, so re-running is idempotent.
    """
    return (
        not target.description
        or target.seniority_hint is None
        or not target.domain_hints
    )


def _resolve_owner_payload(
    supabase: Any, target_id: str
) -> tuple[str | None, Any | None]:
    """Find an active owner of the target + their latest optimized payload.

    The derivation prompt grounds the slim shape in the user's actual
    experience, so we need an owner with a profile. Targets without any
    profiled owner are skipped (can't derive a meaningful description).
    """
    resp = (
        supabase.table("user_targets")
        .select("user_id")
        .eq("target_id", target_id)
        .eq("is_active", True)
        .execute()
    )
    for row in cast(list[dict[str, Any]], resp.data or []):
        doc = optimized.get_latest(supabase, row["user_id"])
        if doc is not None:
            return row["user_id"], doc.payload
    return None, None


async def backfill_target(
    supabase: Any, target: JobTarget, llm: Any, *, dry_run: bool
) -> bool:
    """Derive the slim fields for one target. Returns True if updated."""
    if not _needs_backfill(target):
        logger.info("  ✓ %s — already has full slim shape; skipping", target.label)
        return False

    _user_id, payload = _resolve_owner_payload(supabase, target.id)
    if payload is None:
        logger.warning(
            "  ⊘ %s — no profiled owner; can't derive description, skipping",
            target.label,
        )
        return False

    if dry_run:
        missing = []
        if not target.description:
            missing.append("description")
        if target.seniority_hint is None:
            missing.append("seniority_hint")
        if not target.domain_hints:
            missing.append("domain_hints")
        logger.info(
            "  [dry-run] would re-derive %s — missing: %s",
            target.label,
            ", ".join(missing),
        )
        return False

    derived, result = await derive_profile_from_label(
        llm, label=target.label, payload=payload
    )
    cost_log.record(
        supabase,
        user_id=None,
        purpose=DEFAULT_PURPOSE,
        result=result,
        metadata={
            "target_id": target.id,
            "trigger": "slim_target_backfill",
        },
    )

    # Only write slim fields. We deliberately do NOT bump
    # profile_version or rewrite scoring_profile / example pools —
    # those are unchanged by this PR. Phase 2's lazy re-grade contract
    # therefore won't trigger.
    updated = crud.update(
        supabase,
        target.id,
        TargetUpdate(
            description=derived.description,
            seniority_hint=derived.seniority_hint,
            domain_hints=derived.domain_hints or None,
        ),
    )
    if updated is None:
        logger.error("  ✗ %s — update failed", target.label)
        return False

    logger.info(
        "  ✓ %s — description=%dch, seniority=%s, domain_hints=%d",
        target.label,
        len(derived.description or ""),
        derived.seniority_hint or "—",
        len(derived.domain_hints),
    )
    return True


async def backfill(
    *, dry_run: bool, target_id: str | None
) -> int:
    init_supabase()
    supabase = get_supabase_pool()
    if supabase is None:
        raise RuntimeError("Supabase not configured — check .env")

    targets = crud.list_all(supabase)
    if target_id:
        targets = [t for t in targets if t.id == target_id]
    if not targets:
        logger.info("No targets to process.")
        return 0

    needs = [t for t in targets if _needs_backfill(t)]
    logger.info(
        "Found %d target(s); %d need slim backfill", len(targets), len(needs)
    )
    if not needs:
        return 0

    if not dry_run and settings.llm_provider != "anthropic":
        raise RuntimeError(
            f"LLM_PROVIDER must be 'anthropic' for a real backfill "
            f"(currently {settings.llm_provider!r}). Use --dry-run for a "
            f"no-op test."
        )

    llm = None if dry_run else get_llm_client()
    updated = 0
    for target in needs:
        ok = await backfill_target(supabase, target, llm, dry_run=dry_run)
        if ok:
            updated += 1

    verb = "would re-derive" if dry_run else "re-derived"
    logger.info("\nDone — %s %d target(s)", verb, updated if not dry_run else len(needs))
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill slim target shape")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report which targets need backfill without calling the LLM.",
    )
    parser.add_argument(
        "--target",
        type=str,
        default=None,
        help="Restrict to a single target id.",
    )
    args = parser.parse_args()
    asyncio.run(backfill(dry_run=args.dry_run, target_id=args.target))


if __name__ == "__main__":
    main()
