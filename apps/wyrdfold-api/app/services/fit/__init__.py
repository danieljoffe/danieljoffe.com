"""Shared fit-grading primitives.

Two LLM-backed grading flows share this package:

- ``user_target_fit``: how well does THIS USER match THIS TARGET
  (delegate today is ``app.services.targets.fit_score.derive_fit_score``
  — kept where it is until we collapse the schema with job-fit in a
  follow-up).
- ``job_fit``: how well does THIS JOB match THIS (user, target) pair —
  the Phase 2 scorer. Replaces the deterministic keyword pipeline as
  the primary signal once the poller integration ships.

Both produce structured scorecards on the same 0-100 scale so the UI
can render consistent breakdowns. Phase 1 (``relevance.title_triage``)
gates which jobs reach the Phase 2 grader at all.
"""

from app.services.fit.daily_cap import (
    DEFAULT_DAILY_CAP,
    phase2_quota_remaining,
)
from app.services.fit.job_fit import (
    JOB_FIT_PURPOSE,
    AxisScores,
    JobFitResult,
    derive_job_fit,
)
from app.services.fit.phase2_runner import (
    PHASE2_BATCH_SIZE,
    PHASE2_FIRST_BATCH,
    run_phase2_for_jobs,
)
from app.services.fit.score_persistence import score_with_phase2_and_persist

__all__ = [
    "DEFAULT_DAILY_CAP",
    "JOB_FIT_PURPOSE",
    "PHASE2_BATCH_SIZE",
    "PHASE2_FIRST_BATCH",
    "AxisScores",
    "JobFitResult",
    "derive_job_fit",
    "phase2_quota_remaining",
    "run_phase2_for_jobs",
    "score_with_phase2_and_persist",
]
