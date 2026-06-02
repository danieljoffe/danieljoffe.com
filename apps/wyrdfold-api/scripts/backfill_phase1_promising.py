"""Retroactive Phase 1 LLM title triage for existing scores rows.

Phase 1 (PR #790) gates ingestion going forward — every new job goes
through the Haiku binary classifier. But rows that existed BEFORE
Phase 1 shipped have ``scores.promising = NULL`` and skip the gate
entirely (legacy fail-open). This script back-fills them: groups them
by target, batches 250 titles per LLM call, writes the verdict back to
each row.

Idempotent: only touches rows where ``promising IS NULL``. Re-running
after a partial failure picks up where it left off.

Fail-open: rows whose batch hit an LLM error stay ``NULL`` (caller
treats as admit). Re-run later to grade them.

Usage::

    cd apps/wyrdfold-api
    uv run python scripts/backfill_phase1_promising.py --dry-run
    uv run python scripts/backfill_phase1_promising.py --target-id <uuid>
    uv run python scripts/backfill_phase1_promising.py

Env required: ``SUPABASE_URL`` + ``SUPABASE_SERVICE_ROLE_KEY`` +
``LLM_PROVIDER=anthropic`` + ``ANTHROPIC_API_KEY``.

Cost
- ~50 input tokens per title + ~10 output tokens per verdict.
- 250 titles per batch = ~12.5K input + ~2.5K output = ~$0.025 per
  batch at Haiku 4.5 pricing.
- For 8k titles per active target × 2 active targets = ~16k titles
  = ~64 batches = ~$1.60 worst case for a full backfill across both
  targets. Cheaper if some titles overlap across targets (they do —
  the same job has scores rows for multiple targets).
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from typing import Any, cast

from supabase import Client

from app.config import settings
from app.models.targets import JobTarget
from app.services.llm import get_default_client as get_llm
from app.services.llm.cost_log import record as record_llm_cost
from app.services.relevance.title_triage import (
    PHASE1_BATCH_SIZE,
    PHASE1_PURPOSE,
    triage_titles,
)
from app.services.targets import crud
from app.supabase_pool import get_supabase_pool, init_supabase

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("backfill_phase1")

# Page size for Supabase ``range()`` reads. PostgREST caps per-row
# response size; 1000 is well within limits.
PAGE_SIZE = 1000


async def _fetch_ungraded_jobs_for_target(
    supabase: Client, target_id: str
) -> list[dict[str, Any]]:
    """Return ``[{score_id, job_posting_id, title}, ...]`` for rows whose
    ``promising IS NULL`` for this target.

    Paginated through ``range()`` so the query doesn't blow up on
    targets with tens of thousands of legacy rows. Jobs are joined in
    via a second pass keyed on ``job_posting_id`` to avoid PostgREST's
    nested-select size limits on big batches.
    """
    score_rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        resp = (
            supabase.table("scores")
            .select("id, job_posting_id")
            .eq("target_id", target_id)
            .is_("promising", "null")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        page = cast(list[dict[str, Any]], resp.data or [])
        score_rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    if not score_rows:
        return []

    # Fetch titles in chunks. ``in_("id", chunk)`` URL-encodes at ~36
    # bytes per UUID; 100 chunks keeps the URL well under typical proxy
    # limits (lesson from the prior cosine backfill PR).
    job_titles: dict[str, str] = {}
    job_ids = [r["job_posting_id"] for r in score_rows]
    in_chunk = 100
    for i in range(0, len(job_ids), in_chunk):
        batch = job_ids[i : i + in_chunk]
        resp2 = (
            supabase.table("jobs")
            .select("id, title")
            .in_("id", batch)
            .execute()
        )
        for j in cast(list[dict[str, Any]], resp2.data or []):
            job_titles[j["id"]] = j.get("title") or ""

    out: list[dict[str, Any]] = []
    for sr in score_rows:
        title = job_titles.get(sr["job_posting_id"], "")
        if not title.strip():
            # Skip rows whose job has no title. Phase 1 can't grade
            # them; the row stays promising=NULL (fail-open).
            continue
        out.append(
            {
                "score_id": sr["id"],
                "job_posting_id": sr["job_posting_id"],
                "title": title,
            }
        )
    return out


async def _grade_and_persist_target(
    supabase: Client,
    target: JobTarget,
    dry_run: bool,
) -> dict[str, int]:
    """Run Phase 1 against every promising=NULL row for this target.

    Returns ``{evaluated, promising, unpromising, fail_open}`` counts.
    """
    logger.info(">> target %s (%s)", target.id[:8], target.label)
    ungraded = await _fetch_ungraded_jobs_for_target(supabase, target.id)
    logger.info("  %d ungraded rows", len(ungraded))
    if not ungraded:
        return {"evaluated": 0, "promising": 0, "unpromising": 0, "fail_open": 0}

    if not target.example_promising_titles or not target.example_unpromising_titles:
        # Phase 1 still works with empty pools, just less discriminating.
        # Warn loudly so the operator can decide whether to re-derive
        # the target first (see derive-profile endpoint).
        logger.warning(
            "  target has empty example pools — Phase 1 quality will be "
            "degraded. Consider POST /targets/%s/derive-profile first.",
            target.id,
        )

    llm = get_llm()
    promising_count = 0
    unpromising_count = 0
    fail_open_count = 0

    for start in range(0, len(ungraded), PHASE1_BATCH_SIZE):
        chunk = ungraded[start : start + PHASE1_BATCH_SIZE]
        titles = [c["title"] for c in chunk]

        if dry_run:
            logger.info(
                "  [dry-run] would grade batch of %d (start=%d)", len(chunk), start
            )
            continue

        verdicts, result = await triage_titles(llm, target=target, titles=titles)

        # Cost logging matches the inline Phase 1 path in the poller.
        if result is not None:
            try:
                record_llm_cost(
                    supabase,
                    user_id=None,
                    purpose=PHASE1_PURPOSE,
                    result=result,
                    metadata={
                        "target_id": target.id,
                        "batch_size": len(chunk),
                        "source": "phase1_backfill",
                    },
                )
            except Exception:
                logger.exception("cost log failed")

        # Persist per-row. Use individual UPDATEs (no batch upsert)
        # because each row has a unique score_id and we want to set
        # both promising AND excluded based on the verdict.
        for batch_idx_zero, row in enumerate(chunk):
            batch_idx = batch_idx_zero + 1  # Phase 1 ids are 1-based
            promising = verdicts.get(batch_idx)
            if promising is None:
                # No verdict (LLM omitted or fail-open from triage call).
                # Leave the row untouched (promising stays NULL).
                fail_open_count += 1
                continue

            update_payload: dict[str, Any] = {"promising": promising}
            # When Phase 1 rejects a row, also mark excluded=true so
            # the row drops out of the list view immediately. We don't
            # un-exclude on promising=true because the scorer may have
            # set excluded=true for a separate reason (e.g., negative
            # keyword match — preserves PR #783's contract).
            if not promising:
                update_payload["excluded"] = True

            try:
                supabase.table("scores").update(update_payload).eq(
                    "id", row["score_id"]
                ).execute()
                if promising:
                    promising_count += 1
                else:
                    unpromising_count += 1
            except Exception:
                logger.exception(
                    "failed to persist phase1 verdict for score %s",
                    row["score_id"],
                )

        logger.info(
            "  graded %d/%d (running: %d promising, %d unpromising, %d fail-open)",
            min(start + len(chunk), len(ungraded)),
            len(ungraded),
            promising_count,
            unpromising_count,
            fail_open_count,
        )

    return {
        "evaluated": len(ungraded),
        "promising": promising_count,
        "unpromising": unpromising_count,
        "fail_open": fail_open_count,
    }


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Count ungraded rows without calling the LLM or writing.",
    )
    parser.add_argument(
        "--target-id",
        help="Restrict to one target. Default: all active targets.",
    )
    args = parser.parse_args()

    if settings.llm_provider != "anthropic" and not args.dry_run:
        raise SystemExit(
            "ERROR: LLM_PROVIDER must be 'anthropic' for a real backfill "
            f"(currently {settings.llm_provider!r}). Aborting to avoid "
            "writing mock verdicts to the DB. Use --dry-run for a count-only run."
        )

    init_supabase()
    supabase = get_supabase_pool()
    if supabase is None:
        raise SystemExit(
            "ERROR: Supabase not configured — check SUPABASE_URL + "
            "SUPABASE_SERVICE_ROLE_KEY in apps/wyrdfold-api/.env"
        )

    if args.target_id:
        target = crud.get(supabase, args.target_id)
        if target is None:
            raise SystemExit(f"target not found: {args.target_id}")
        targets = [target]
    else:
        targets = crud.get_active(supabase)

    logger.info("dry_run=%s targets=%d", args.dry_run, len(targets))
    logger.info("---")

    totals = {"evaluated": 0, "promising": 0, "unpromising": 0, "fail_open": 0}
    for target in targets:
        per_target = await _grade_and_persist_target(supabase, target, args.dry_run)
        for k, v in per_target.items():
            totals[k] += v

    logger.info("---")
    logger.info("TOTALS: %s", totals)


if __name__ == "__main__":
    asyncio.run(main())
