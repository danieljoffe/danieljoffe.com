"""Audit Phase 1 (Haiku) false negatives by re-grading a sample with Sonnet.

Phase 1's contract is "lean PROMISING on close calls" — its false-negative
rate must be low for Phase 2 to ever see the right jobs. This script:

  1. Samples N rows per active target where ``promising = false``.
  2. Re-runs the EXACT same Phase 1 prompt + few-shot pools against each
     title using ``claude-sonnet-4-6`` (instead of Haiku) — a stronger
     reader on the same task, with the same contract.
  3. Reports the rate at which Sonnet says PROMISING where Haiku said
     UNPROMISING. That's an upper-bound estimate of Phase 1's FN rate.

Target FN rate: < 5%. Above that, Phase 1 is dropping jobs that Phase 2
would have caught; the title-triage prompt or the example pools need
tightening.

Cost guardrail: the script enforces a hard ceiling of 100 calls per run
(~$0.50 at Sonnet pricing) regardless of how many ungraded rows exist.
Override with ``--sample-per-target`` if you really want a deeper audit.

Usage::

    cd apps/wyrdfold-api
    uv run python -m scripts.audit_phase1_fn --dry-run
    uv run python -m scripts.audit_phase1_fn --sample-per-target 30
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import random
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

from app.config import settings
from app.models.llm import ModelId
from app.models.targets import JobTarget
from app.services.llm import get_default_client as get_llm
from app.services.relevance.title_triage import (
    PHASE1_BATCH_SIZE,
    triage_titles,
)
from app.services.targets.crud import get_active as get_active_targets
from app.supabase_pool import get_supabase_pool, init_supabase

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("audit_phase1_fn")

# Hard ceilings — defense in depth on cost.
_MAX_CALLS_PER_RUN = 100
_DEFAULT_SAMPLE_PER_TARGET = 33  # ~100 total across 3 active targets
_AUDIT_MODEL: ModelId = "claude-sonnet-4-6"
_AUDIT_PURPOSE = "audit.phase1_fn"
_LOG_DIR = Path(__file__).parent / ".audit-logs"


def _sample_unpromising(
    sb: Any, target_id: str, k: int, *, rng: random.Random
) -> list[tuple[str, str]]:
    """Return up to ``k`` ``(job_posting_id, title)`` rows where the
    existing Phase 1 verdict is False.

    Reservoir-sample over a single page query (no streaming randomization
    — we'd need to scan everything otherwise, which defeats the cost cap).
    For a target with thousands of unpromising rows, this is fine: random
    is random regardless of the slice.
    """
    resp = (
        sb.table("scores")
        .select("job_posting_id")
        .eq("target_id", target_id)
        .eq("promising", False)
        .limit(1000)  # cap the random pool — 1000 is plenty for variety
        .execute()
    )
    pool = cast(list[dict[str, Any]], resp.data or [])
    if not pool:
        return []
    rng.shuffle(pool)
    chosen = pool[:k]
    # Hydrate titles in one query.
    ids = [r["job_posting_id"] for r in chosen]
    jobs_resp = (
        sb.table("jobs").select("id, title").in_("id", ids).execute()
    )
    titles_by_id = {
        r["id"]: r["title"]
        for r in cast(list[dict[str, Any]], jobs_resp.data or [])
    }
    return [(jid, titles_by_id.get(jid, "")) for jid in ids if jid in titles_by_id]


async def _audit_target(
    sb: Any,
    llm: Any,
    target: JobTarget,
    sample_size: int,
    rng: random.Random,
) -> dict[str, Any]:
    pairs = _sample_unpromising(sb, target.id, sample_size, rng=rng)
    if not pairs:
        return {
            "target_id": target.id,
            "label": target.label,
            "sampled": 0,
            "fns": 0,
            "fn_rate": 0.0,
            "fn_examples": [],
        }
    titles = [t for _, t in pairs]
    fn_examples: list[str] = []
    fns = 0
    # triage_titles caps at PHASE1_BATCH_SIZE per call; loop just in case.
    for start in range(0, len(titles), PHASE1_BATCH_SIZE):
        batch = titles[start : start + PHASE1_BATCH_SIZE]
        verdicts, _ = await triage_titles(
            llm,
            target=target,
            titles=batch,
            model=_AUDIT_MODEL,
            purpose=_AUDIT_PURPOSE,
        )
        for batch_idx, verdict in verdicts.items():
            # batch_idx is 1-based; map to original (job_id, title).
            orig_idx = start + batch_idx - 1
            if 0 <= orig_idx < len(pairs) and verdict.promising is True:
                fns += 1
                fn_examples.append(pairs[orig_idx][1])
    rate = fns / len(pairs) if pairs else 0.0
    return {
        "target_id": target.id,
        "label": target.label,
        "sampled": len(pairs),
        "fns": fns,
        "fn_rate": rate,
        "fn_examples": fn_examples[:15],  # cap the on-disk noise
    }


async def main_async(*, sample_per_target: int, dry_run: bool, seed: int) -> int:
    init_supabase()
    sb = get_supabase_pool()
    if sb is None:
        raise RuntimeError("Supabase not configured — check .env")
    targets = get_active_targets(sb)
    if not targets:
        logger.info("No active targets. Nothing to audit.")
        return 0

    # Hard cost cap regardless of CLI flag.
    total_budget = min(sample_per_target * len(targets), _MAX_CALLS_PER_RUN)
    per_target = max(1, total_budget // len(targets))
    logger.info(
        "Auditing %d target(s); %d titles per target (= %d total, hard cap %d).",
        len(targets),
        per_target,
        per_target * len(targets),
        _MAX_CALLS_PER_RUN,
    )
    if dry_run:
        logger.info("--dry-run: would issue Sonnet calls but not actually doing it.")
        return 0
    if settings.llm_provider != "anthropic":
        raise RuntimeError(
            f"LLM_PROVIDER must be 'anthropic' for a real audit (currently "
            f"{settings.llm_provider!r}). Use --dry-run for a no-op test."
        )

    # Sampling RNG — not cryptographic; reproducible seed is the goal.
    rng = random.Random(seed)
    llm = get_llm()
    results: list[dict[str, Any]] = []
    for target in targets:
        logger.info(">> %s (%s)", target.label, target.id[:8])
        r = await _audit_target(sb, llm, target, per_target, rng)
        logger.info(
            "   sampled=%d  fns=%d  fn_rate=%.1f%%",
            r["sampled"],
            r["fns"],
            r["fn_rate"] * 100,
        )
        if r["fn_examples"]:
            logger.info("   sample FN titles:")
            for t in r["fn_examples"][:5]:
                logger.info("     - %s", t)
        results.append(r)

    # Write to a timestamped JSONL for re-analysis.
    _LOG_DIR.mkdir(parents=True, exist_ok=True)
    out = _LOG_DIR / f"audit_{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}.json"
    out.write_text(json.dumps(results, indent=2))
    logger.info("\nResults written to %s", out)

    overall_n = sum(int(r["sampled"]) for r in results)
    overall_fns = sum(int(r["fns"]) for r in results)
    if overall_n:
        logger.info(
            "\nOVERALL: sampled=%d  fns=%d  fn_rate=%.1f%% (target < 5%%)",
            overall_n,
            overall_fns,
            overall_fns / overall_n * 100,
        )
    return overall_fns


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit Phase 1 FN rate")
    parser.add_argument(
        "--sample-per-target",
        type=int,
        default=_DEFAULT_SAMPLE_PER_TARGET,
        help=f"Titles to re-grade per target (default {_DEFAULT_SAMPLE_PER_TARGET}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Plan the sample size without actually calling Sonnet.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="RNG seed for reproducibility.",
    )
    args = parser.parse_args()
    asyncio.run(
        main_async(
            sample_per_target=args.sample_per_target,
            dry_run=args.dry_run,
            seed=args.seed,
        )
    )


if __name__ == "__main__":
    main()
