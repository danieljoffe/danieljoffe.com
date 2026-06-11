"""Phase 2 orchestration: which promising jobs to grade, and how (#6).

``score_with_phase2_and_persist`` grades one (user, target, job) tuple.
This module decides which tuples to spend Sonnet on in a given run and
in what order:

- **Gate on Phase 1.** Only jobs whose scores row is ``promising=true``
  reach the grader. ``promising IS NULL`` (Phase 1 disabled / legacy)
  and ``promising=false`` are skipped — Phase 2 inherits Phase 1's
  precision filter rather than re-deriving it.
- **Re-grade contract.** Skip a job already finished at the current
  profile version (``scoring_status == 'complete'`` AND
  ``scored_profile_version >= target.profile_version``). A profile bump
  resets the row to ``stage2`` (via ``bulk_score_for_target``), which
  re-admits it. This is the same lazy-rescore contract #502 established
  and the activate/deactivate-flicker protection depends on.
- **Daily cap.** Each target gets ``DEFAULT_DAILY_CAP`` automatic grades
  per UTC day (see ``daily_cap``). Candidates beyond the remaining quota
  stay ``promising=true`` with their keyword score — surfaced as
  "pending" and picked up on the next day's quota or on user click.
- **Progressive batching.** The first ``PHASE2_FIRST_BATCH`` candidates
  grade in one eager fan-out so the first list page fills fast; the rest
  catch up in ``PHASE2_BATCH_SIZE`` chunks. Concurrency inside a batch is
  bounded so we never open 50 Sonnet sockets at once.

This is the single entry point both the poller and the backfill script
call, so the gate / cap / batching policy lives in exactly one place.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, cast

from supabase import Client

from app.config import settings
from app.models.experience import OptimizedPayload
from app.models.targets import JobTarget
from app.services.fit.daily_cap import DEFAULT_DAILY_CAP, phase2_quota_remaining
from app.services.fit.score_persistence import score_with_phase2_and_persist
from app.services.fit.seniority_gate import passes_seniority_gate
from app.services.llm.client import LLMClient
from app.services.scoring import strip_html

logger = logging.getLogger(__name__)

# First batch is small so the first /jobs page renders with fresh Phase 2
# grades quickly; the remainder catches up in larger chunks. Matches the
# "FIRST batch = 20, subsequent = 50" policy in the migration plan.
PHASE2_FIRST_BATCH = 20
PHASE2_BATCH_SIZE = 50

# Cap concurrent Sonnet calls within a batch. A batch of 50 must not open
# 50 sockets at once — mirrors the poller's LLM_CONCURRENCY for Stage 3.
PHASE2_CONCURRENCY = 3

# Chunk size for the scores-state lookup IN-query (mirrors the sizing in
# target_scoring / recency so the request stays under PostgREST limits).
_STATE_CHUNK_SIZE = 500


def _needs_phase2(
    promising: bool | None,
    scoring_status: str | None,
    scored_profile_version: int | None,
    target_profile_version: int,
) -> bool:
    """Phase 2 candidacy for one (job, target) scores row.

    True iff the row is promising AND has not already been finished at the
    current-or-newer profile version. ``promising`` must be exactly
    ``True`` — ``None`` (Phase 1 off / legacy) and ``False`` are excluded.
    """
    if promising is not True:
        return False
    already_current = (
        scoring_status == "complete"
        and (scored_profile_version or 0) >= target_profile_version
    )
    return not already_current


def _fetch_phase2_state(
    supabase: Client, target_id: str, job_ids: list[str]
) -> dict[str, tuple[bool | None, str | None, int | None, int | None]]:
    """Read (promising, scoring_status, scored_profile_version, phase1_confidence) per job.

    Keyed by ``job_posting_id`` for this one target. Jobs with no scores
    row (Phase 1 dropped them under this target) are simply absent from
    the result and never become candidates. ``phase1_confidence`` is None
    for rows triaged before the confidence column existed — the runner's
    ordering treats None as "lowest priority" so legacy rows still grade
    but newer high-confidence rows go first.
    """
    state: dict[
        str, tuple[bool | None, str | None, int | None, int | None]
    ] = {}
    for i in range(0, len(job_ids), _STATE_CHUNK_SIZE):
        chunk = job_ids[i : i + _STATE_CHUNK_SIZE]
        resp = (
            supabase.table("scores")
            .select(
                "job_posting_id, promising, scoring_status, "
                "scored_profile_version, phase1_confidence"
            )
            .eq("target_id", target_id)
            .in_("job_posting_id", chunk)
            .execute()
        )
        for row in cast(list[dict[str, Any]], resp.data or []):
            state[row["job_posting_id"]] = (
                row.get("promising"),
                row.get("scoring_status"),
                row.get("scored_profile_version"),
                row.get("phase1_confidence"),
            )
    return state


def _progressive_batches(
    items: list[str], first: int, rest: int
) -> list[list[str]]:
    """Split ``items`` into a small first batch then larger chunks."""
    if not items:
        return []
    batches = [items[:first]]
    i = first
    while i < len(items):
        batches.append(items[i : i + rest])
        i += rest
    return batches


async def run_phase2_for_jobs(
    supabase: Client,
    llm: LLMClient,
    *,
    target: JobTarget,
    payload: OptimizedPayload,
    jobs: list[dict[str, Any]],
    user_id: str | None = None,
    cap: int = DEFAULT_DAILY_CAP,
    first_batch_size: int = PHASE2_FIRST_BATCH,
    batch_size: int = PHASE2_BATCH_SIZE,
    concurrency: int = PHASE2_CONCURRENCY,
) -> int:
    """Grade the promising, not-yet-current jobs in ``jobs`` for ``target``.

    ``jobs`` are job dicts carrying at least ``id`` and ``title`` (and
    ``description_html`` for the JD context; ``first_seen_at`` is used for
    ordering when present). Returns the number of jobs actually graded.

    Order of operations: gate + re-grade filter → order newest-first →
    trim to the remaining daily quota → progressive batches with bounded
    concurrency. Per-job failures inside ``score_with_phase2_and_persist``
    are swallowed there (return ``None``), so one bad grade never sinks
    the batch.
    """
    if not jobs:
        return 0

    job_by_id = {j["id"]: j for j in jobs if j.get("id")}
    job_ids = list(job_by_id)
    if not job_ids:
        return 0

    state = _fetch_phase2_state(supabase, target.id, job_ids)
    candidates = [
        jid
        for jid in job_ids
        if jid in state
        # Pass only the first 3 fields — confidence is for ordering, not gating.
        and _needs_phase2(*state[jid][:3], target.profile_version)
    ]
    if not candidates:
        return 0

    # Cheap seniority pre-gate (#902): Phase 1's promising verdict is
    # domain-oriented and permissive, so it forwards many roles whose
    # *seniority* is well below the target's — Phase 2 then spends a real grade
    # to discover the mismatch. Drop clearly-below-level titles first. Flag-off
    # by default; shadow-measured via scripts/shadow_seniority_gate.py before
    # enforcing (per the prompt/scoring-change rollout rule).
    if settings.phase2_seniority_gate_enabled and target.seniority_hint:
        kept = [
            jid
            for jid in candidates
            if passes_seniority_gate(
                job_by_id[jid].get("title") or "",
                target.seniority_hint,
                tolerance=settings.phase2_seniority_gate_tolerance,
            )
        ]
        skipped = len(candidates) - len(kept)
        if skipped:
            logger.info(
                "Phase 2 seniority gate: skipped %d/%d below-level candidate(s) "
                "for target %s (hint=%s)",
                skipped,
                len(candidates),
                target.id,
                target.seniority_hint,
            )
        candidates = kept
        if not candidates:
            return 0

    # Order candidates so the Phase 2 daily cap goes to the highest-leverage
    # jobs first:
    #   1) phase1_confidence DESC — Haiku's certainty in the promising
    #      verdict (None sorts last; legacy rows get graded eventually).
    #   2) first_seen_at DESC — among equal-confidence rows, prefer the
    #      freshest.
    # ``first_seen_at`` is an ISO-8601 string, sortable lexically; missing
    # values sort last.
    def _priority(jid: str) -> tuple[int, str]:
        conf = state[jid][3]  # phase1_confidence
        # Treat None as -1 so any real confidence wins; combined with
        # reverse=True the highest confidence comes first.
        c = int(conf) if conf is not None else -1
        seen = job_by_id[jid].get("first_seen_at") or ""
        return (c, seen)

    candidates.sort(key=_priority, reverse=True)

    # Daily cap: don't grade more than the target's remaining quota. This
    # is a soft, best-effort budget — concurrent poll cycles for the same
    # target can each read the same remaining count and slightly overshoot;
    # the cap exists to bound runaway spend, not to be exact.
    quota = phase2_quota_remaining(supabase, target.id, cap)
    if quota <= 0:
        logger.info(
            "Phase 2: target %s at daily cap; deferring %d promising job(s)",
            target.id,
            len(candidates),
        )
        return 0
    if len(candidates) > quota:
        logger.info(
            "Phase 2: target %s quota %d < %d candidates; deferring the rest",
            target.id,
            quota,
            len(candidates),
        )
        candidates = candidates[:quota]

    sem = asyncio.Semaphore(concurrency)

    async def _grade_one(job_id: str) -> bool:
        job = job_by_id[job_id]
        async with sem:
            fit = await score_with_phase2_and_persist(
                supabase,
                llm,
                payload=payload,
                target=target,
                job_posting_id=job_id,
                title=job.get("title", ""),
                jd_text=strip_html(job.get("description_html", "")),
                user_id=user_id,
            )
        return fit is not None

    graded = 0
    for batch in _progressive_batches(candidates, first_batch_size, batch_size):
        results = await asyncio.gather(
            *(_grade_one(jid) for jid in batch), return_exceptions=True
        )
        graded += sum(1 for r in results if r is True)
    return graded
