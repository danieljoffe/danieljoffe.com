"""Tailor module (#185 P3).

LLM-based resume synthesis from an OptimizedPayload + JD, with
post-validation that every role + bullet traces back to the source
career record. Hallucinations are caught at generation time, not in
front of an employer.

Layout:
- tailor.py       — LLM synthesis + trace validation (P3a)
- prompts.py      — TAILOR_SYSTEM (P3a)
- persistence.py  — documents CRUD + Supabase Storage (P3d)
- pipeline.py     — end-to-end orchestration (P3d)
- reuse.py        — resume reuse within targets (#504)
"""

from app.services.tailor.pipeline import (
    CoverLetterPipelineLintFailure,
    CoverLetterPipelineResult,
    CoverLetterPipelineSuccess,
    PipelineLintFailure,
    PipelineResult,
    PipelineSuccess,
    run_cover_letter_pipeline,
    run_tailor_pipeline,
)
from app.services.tailor.reuse import (
    clone_resume_for_job,
    extract_profile_keywords,
    find_reusable_resume,
    jd_similarity,
)
from app.services.tailor.tailor import (
    DEFAULT_COVER_LETTER_PURPOSE,
    DEFAULT_MODEL,
    DEFAULT_PURPOSE,
    build_cover_letter_user_message,
    build_user_message,
    tailor_cover_letter,
    tailor_resume,
    validate_cover_letter_refs,
    validate_trace_refs,
)

__all__ = [
    "DEFAULT_COVER_LETTER_PURPOSE",
    "DEFAULT_MODEL",
    "DEFAULT_PURPOSE",
    "CoverLetterPipelineLintFailure",
    "CoverLetterPipelineResult",
    "CoverLetterPipelineSuccess",
    "PipelineLintFailure",
    "PipelineResult",
    "PipelineSuccess",
    "build_cover_letter_user_message",
    "build_user_message",
    "clone_resume_for_job",
    "extract_profile_keywords",
    "find_reusable_resume",
    "jd_similarity",
    "run_cover_letter_pipeline",
    "run_tailor_pipeline",
    "tailor_cover_letter",
    "tailor_resume",
    "validate_cover_letter_refs",
    "validate_trace_refs",
]
