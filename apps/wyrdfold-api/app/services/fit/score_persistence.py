"""Phase 2 scorer + persistence helper.

Wraps ``derive_job_fit`` (PR #791) with the bits the poller integration
will need:

- Cost logging via ``llm_costs`` (so ``phase2_quota_remaining`` can see
  the spend).
- Persistence to ``scores`` (score / axis_scores / fit_reasoning) via
  UPDATE on the existing (job_posting_id, target_id) row.
- Fail-safe: any LLM or DB error returns ``None`` and the existing
  scores row is left untouched (the row stays "Phase 2 pending" and
  retries on the next poll).

Doesn't enforce the daily cap itself — the caller (poller) consults
``daily_cap.phase2_quota_remaining`` before invoking this. Keeps the
helper composable for non-poller call sites (on-demand grading from
the UI, retro-backfill scripts).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from supabase import Client

from app.config import settings
from app.models.experience import OptimizedPayload
from app.models.targets import JobTarget
from app.services.fit.job_fit import JOB_FIT_PURPOSE, JobFitResult, derive_job_fit
from app.services.llm.client import LLMClient
from app.services.llm.cost_log import record as record_llm_cost

logger = logging.getLogger(__name__)


async def score_with_phase2_and_persist(
    supabase: Client,
    llm: LLMClient,
    *,
    payload: OptimizedPayload,
    target: JobTarget,
    job_posting_id: str,
    title: str,
    jd_text: str,
    user_id: str | None = None,
) -> JobFitResult | None:
    """Call Phase 2 grader, persist the result on the scores row.

    Returns the ``JobFitResult`` on success; ``None`` on LLM error or
    persistence error. The poller treats ``None`` as "row stays as-is"
    — the existing scores row (with whatever score the keyword pipeline
    set) keeps its value. A retry happens on the next poll cycle.

    Updates the scores row identified by ``(job_posting_id, target_id)``.
    Caller is expected to have already created the row (via Phase 1 or
    keyword Stage 1/2); Phase 2 only ever UPDATES.

    Pass ``user_id`` for cost-log attribution. ``None`` is fine for
    system-driven invocations (poll cycles); on-demand calls from the
    UI should pass the requesting user's id so per-user spend audits
    work.
    """
    try:
        fit, llm_result = await derive_job_fit(
            llm,
            payload=payload,
            target=target,
            job_title=title,
            jd_text=jd_text,
            extract_logistics=settings.logistics_extraction_enabled,
        )
    except Exception:
        logger.exception(
            "Phase 2 derive_job_fit failed for job %s / target %s",
            job_posting_id,
            target.id,
        )
        return None

    # Log cost BEFORE the DB update so quota counting stays accurate
    # even if the persistence step fails (we did spend the tokens).
    try:
        record_llm_cost(
            supabase,
            user_id=user_id,
            purpose=JOB_FIT_PURPOSE,
            result=llm_result,
            metadata={
                "target_id": target.id,
                "job_posting_id": job_posting_id,
            },
        )
    except Exception:
        logger.exception(
            "Phase 2 cost log failed for job %s / target %s",
            job_posting_id,
            target.id,
        )

    try:
        update_payload: dict[str, Any] = {
            "score": fit.fit_score,
            "axis_scores": fit.axes.model_dump(),
            "fit_reasoning": fit.reasoning,
            "scoring_status": "complete",
            # Stamp the version this grade was computed at so the
            # re-grade contract holds: a row that's ``complete`` at
            # ``scored_profile_version >= target.profile_version`` is
            # skipped on the next poll / backfill. A profile bump (via
            # bulk_score_for_target) resets status to ``stage2``, which
            # re-admits the row for grading.
            "scored_profile_version": target.profile_version,
            # Keep the recency invariant (recency_score == score when
            # decay is off). When decay is on the poller's
            # refresh_recency_scores pass overwrites this with the
            # age-decayed value later in the same cycle.
            "recency_score": fit.fit_score,
            "updated_at": datetime.now(UTC).isoformat(),
        }
        # Only write logistics when the grader emitted it (flag was on
        # for this call). Skipping the key entirely when None preserves
        # any prior value if the flag was flipped off after a grade —
        # rather than blowing away historical logistics data.
        if fit.logistics is not None:
            update_payload["logistics_filters"] = fit.logistics.model_dump()
        supabase.table("scores").update(update_payload).eq(
            "job_posting_id", job_posting_id
        ).eq("target_id", target.id).execute()
    except Exception:
        logger.exception(
            "Phase 2 persist failed for job %s / target %s",
            job_posting_id,
            target.id,
        )
        return None

    return fit
