"""Tailor module (#185 P3a).

LLM-based resume synthesis from an OptimizedPayload + JD. Post-validates
that every role + bullet traces back to the source career record, so
hallucinations are caught at generation time rather than in front of an
employer.

P3b adds .docx rendering. P3c adds the ATS linter.
P3d wires this into a POST /tailor/resume endpoint.
"""

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
    "build_user_message",
    "tailor_resume",
    "validate_trace_refs",
]
