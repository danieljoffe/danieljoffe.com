"""One-time Phase 2 re-grade for promising jobs (#6 ship migration).

When Phase 2 ships, every existing ``scores`` row carries a keyword-
derived score that isn't comparable to the new Sonnet fit scale (see
plan-llm-scoring-migration.md, "Migration risks"). This script re-grades
the promising backlog through ``run_phase2_for_jobs`` so the list shows
LLM scores from day one instead of trickling in over many poll cycles.

For each ACTIVE target it:
  1. resolves the target's owning user + their optimized profile,
  2. collects the target's ``promising=true`` jobs,
  3. hands them to ``run_phase2_for_jobs``, which applies the same gate /
     re-grade contract / progressive batching as the poller.

Idempotent: the re-grade contract skips rows already ``complete`` at the
current ``profile_version``, so a re-run only grades what's still
pending. ``--cap`` defaults high (the daily cap is a poll-cycle guard,
not a backfill one); ``--dry-run`` reports candidate counts without
spending a token.

Usage:
    cd apps/wyrdfold-api && uv run python scripts/backfill_phase2_fit.py --dry-run
    cd apps/wyrdfold-api && uv run python scripts/backfill_phase2_fit.py
    cd apps/wyrdfold-api && uv run python scripts/backfill_phase2_fit.py --target <id> --cap 500
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from typing import Any, cast

from app.models.targets import JobTarget
from app.services.experience.optimized import get_latest as get_latest_optimized
from app.services.fit import run_phase2_for_jobs
from app.services.fit.phase2_runner import _fetch_phase2_state, _needs_phase2
from app.services.llm import get_default_client as get_llm_client
from app.services.targets.crud import get_active as get_active_targets
from app.supabase_pool import get_supabase_pool, init_supabase

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("backfill_phase2")

# Effectively-unbounded default cap: a backfill should grade the whole
# promising backlog, not stop at the per-target daily poll budget.
_BACKFILL_CAP = 100_000
_PAGE = 500


def _promising_job_ids(supabase: Any, target_id: str) -> list[str]:
    """All ``promising=true`` job ids for a target (paginated)."""
    job_ids: list[str] = []
    offset = 0
    while True:
        resp = (
            supabase.table("scores")
            .select("job_posting_id")
            .eq("target_id", target_id)
            .eq("promising", True)
            .range(offset, offset + _PAGE - 1)
            .execute()
        )
        rows = cast(list[dict[str, Any]], resp.data or [])
        if not rows:
            break
        job_ids.extend(r["job_posting_id"] for r in rows)
        if len(rows) < _PAGE:
            break
        offset += _PAGE
    return job_ids


def _fetch_jobs(supabase: Any, job_ids: list[str]) -> list[dict[str, Any]]:
    """Fetch the job rows Phase 2 needs (id, title, JD, first_seen_at)."""
    jobs: list[dict[str, Any]] = []
    for i in range(0, len(job_ids), _PAGE):
        chunk = job_ids[i : i + _PAGE]
        resp = (
            supabase.table("jobs")
            .select("id, title, description_html, first_seen_at")
            .in_("id", chunk)
            .execute()
        )
        jobs.extend(cast(list[dict[str, Any]], resp.data or []))
    return jobs


def _resolve_target_user(
    supabase: Any, target: JobTarget
) -> tuple[str, Any] | None:
    """Return ``(user_id, optimized_payload)`` for an active target.

    Picks the first active owner with a generated optimized profile —
    Phase 2 scores a job against that user's profile, so a target with no
    profiled owner is skipped (nothing to grade against).
    """
    resp = (
        supabase.table("user_targets")
        .select("user_id")
        .eq("target_id", target.id)
        .eq("is_active", True)
        .execute()
    )
    for row in cast(list[dict[str, Any]], resp.data or []):
        doc = get_latest_optimized(supabase, row["user_id"])
        if doc is not None:
            return row["user_id"], doc.payload
    return None


async def backfill(
    *, dry_run: bool, cap: int, target_id: str | None
) -> int:
    init_supabase()
    supabase = get_supabase_pool()
    if supabase is None:
        raise RuntimeError("Supabase not configured — check .env")

    targets = get_active_targets(supabase)
    if target_id:
        targets = [t for t in targets if t.id == target_id]
    logger.info("Re-grading Phase 2 for %d active target(s)", len(targets))

    total = 0
    for target in targets:
        resolved = _resolve_target_user(supabase, target)
        if resolved is None:
            logger.warning(
                "Skipping target %s (%s) — no active owner with a profile",
                target.id,
                target.label,
            )
            continue
        user_id, payload = resolved

        job_ids = _promising_job_ids(supabase, target.id)
        if not job_ids:
            logger.info("%s — no promising jobs", target.label)
            continue
        jobs = _fetch_jobs(supabase, job_ids)

        if dry_run:
            state = _fetch_phase2_state(supabase, target.id, [j["id"] for j in jobs])
            pending = sum(
                1
                for j in jobs
                if j["id"] in state
                # state tuples carry phase1_confidence as a 4th field for
                # ordering; _needs_phase2 only gates on the first three.
                and _needs_phase2(*state[j["id"]][:3], target.profile_version)
            )
            logger.info(
                "%s — %d promising, %d need Phase 2 (dry-run)",
                target.label,
                len(jobs),
                pending,
            )
            total += pending
            continue

        graded = await run_phase2_for_jobs(
            supabase,
            get_llm_client(),
            target=target,
            payload=payload,
            jobs=jobs,
            user_id=user_id,
            cap=cap,
        )
        logger.info("✓ %s — graded %d job(s)", target.label, graded)
        total += graded

    verb = "would grade" if dry_run else "graded"
    logger.info("Done — %s %d job(s) total", verb, total)
    return total


def main() -> None:
    parser = argparse.ArgumentParser(description="One-time Phase 2 fit re-grade")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report candidate counts without calling the LLM.",
    )
    parser.add_argument(
        "--cap",
        type=int,
        default=_BACKFILL_CAP,
        help="Per-target grade ceiling (default: effectively unbounded).",
    )
    parser.add_argument(
        "--target",
        type=str,
        default=None,
        help="Restrict to a single target id.",
    )
    args = parser.parse_args()
    asyncio.run(
        backfill(dry_run=args.dry_run, cap=args.cap, target_id=args.target)
    )


if __name__ == "__main__":
    main()
