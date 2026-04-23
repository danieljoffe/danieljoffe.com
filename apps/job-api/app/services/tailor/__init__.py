"""Tailor module (#185 P3).

LLM-based resume synthesis from an OptimizedPayload + JD, with
post-validation that every role + bullet traces back to the source
career record. Hallucinations are caught at generation time, not in
front of an employer.

Layout:
- tailor.py       — LLM synthesis + trace validation (P3a)
- prompts.py      — TAILOR_SYSTEM (P3a)
- persistence.py  — tailored_resumes CRUD + Supabase Storage (P3d)
- pipeline.py     — end-to-end orchestration (P3d)
"""

from app.services.tailor.pipeline import (
    PipelineLintFailure,
    PipelineResult,
    PipelineSuccess,
    run_tailor_pipeline,
)
from app.services.tailor.tailor import (
    DEFAULT_MODEL,
    DEFAULT_PURPOSE,
    build_user_message,
    tailor_resume,
    validate_trace_refs,
)

__all__ = [
    "DEFAULT_MODEL",
    "DEFAULT_PURPOSE",
    "PipelineLintFailure",
    "PipelineResult",
    "PipelineSuccess",
    "build_user_message",
    "run_tailor_pipeline",
    "tailor_resume",
    "validate_trace_refs",
]
