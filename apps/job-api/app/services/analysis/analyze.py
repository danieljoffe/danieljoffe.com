"""LLM-based job analysis: grade OptimizedPayload against a JD.

Pure function. No DB. Cost logging and persistence happen at the
router layer. Follows the same pattern as tailor.py.
"""

from __future__ import annotations

from app.models.analysis import JobAnalysis
from app.models.experience import OptimizedPayload
from app.models.llm import LLMResult, Message, ModelId
from app.services.analysis.prompts import ANALYSIS_SYSTEM
from app.services.llm.client import LLMClient, complete_json

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "job_analysis"


def build_user_message(
    *,
    optimized: OptimizedPayload,
    job_description: str,
    target_context: str | None = None,
) -> str:
    """Assemble the variable content for the LLM call.

    The system prompt is static (cache target); everything that changes
    per call lives here.
    """
    sections: list[str] = []
    sections.append(f"[OptimizedPayload]\n{optimized.model_dump_json(indent=2)}")
    if target_context:
        sections.append(f"[TargetContext]\n{target_context}")
    sections.append(f"[JobDescription]\n{job_description}")
    return "\n\n".join(sections)


async def analyze_job(
    llm: LLMClient,
    *,
    optimized: OptimizedPayload,
    job_description: str,
    target_context: str | None = None,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
) -> tuple[JobAnalysis, LLMResult]:
    """Run the LLM analysis and parse the structured output.

    Returns (analysis, llm_result). Caller is responsible for
    cost-logging and persistence.
    """
    user_message = build_user_message(
        optimized=optimized,
        job_description=job_description,
        target_context=target_context,
    )

    analysis, result = await complete_json(
        llm,
        model=model,
        system=ANALYSIS_SYSTEM,
        messages=[Message(role="user", content=user_message)],
        schema=JobAnalysis,
        purpose=purpose,
        cache_system=True,
        max_tokens=4096,
    )

    return analysis, result
