"""Analysis module (#501).

LLM-based job analysis: grades the candidate's OptimizedPayload against
a job description, producing a structured scorecard and recommendation.
"""

from app.services.analysis.analyze import (
    DEFAULT_MODEL,
    DEFAULT_PURPOSE,
    analyze_job,
    build_user_message,
)

__all__ = [
    "DEFAULT_MODEL",
    "DEFAULT_PURPOSE",
    "analyze_job",
    "build_user_message",
]
