"""Fit score derivation via LLM (#553 Phase 4).

When linking a user to a target, the LLM evaluates how well the user's
experience matches the target's requirements. Returns a 0-100 score
and a short reasoning explanation.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.experience import OptimizedPayload
from app.models.llm import LLMResult, Message, ModelId
from app.models.targets import JobTarget
from app.services.llm.client import LLMClient, complete_json

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "target.fit_score"

SYSTEM_PROMPT = """\
You are a career fit evaluator. Given a user's experience profile and a \
job target, evaluate how well the user's experience fits the target role.

Return JSON matching this exact schema:

{
  "fit_score": 82,
  "reasoning": "Strong React/TypeScript foundation with 6+ years. Missing \
cloud infrastructure experience that senior roles typically require."
}

Rules:
- "fit_score" is 0-100. Higher = stronger fit.
  - 90-100: Excellent fit — experience directly matches target requirements.
  - 70-89: Good fit — covers most requirements, minor gaps.
  - 50-69: Moderate fit — meaningful overlap but notable gaps.
  - 30-49: Weak fit — some transferable skills but significant gaps.
  - 0-29: Poor fit — little relevant experience.
- "reasoning" is 1-2 sentences explaining the score. Mention what matches \
AND what's missing. Be specific about skills and experience level.
- Evaluate against the target's scoring profile keywords and seniority level, \
not just the label.
- Weight core_skills heavily, secondary_skills moderately, nice_to_have lightly.
- Return ONLY the JSON object. No prose, no markdown, no code fences."""


class FitScoreResult(BaseModel):
    fit_score: int = Field(ge=0, le=100)
    reasoning: str = Field(max_length=1500)


def _build_prompt(payload: OptimizedPayload, target: JobTarget) -> str:
    """Build the evaluation prompt from user profile and target."""
    parts: list[str] = []

    # User profile summary
    if payload.summary:
        parts.append(f"## User Profile\n{payload.summary}")

    if payload.roles:
        role_lines = []
        for r in payload.roles:
            line = f"- {r.title} at {r.company} ({r.start}–{r.end or 'present'})"
            if r.skills:
                line += f" | Skills: {', '.join(r.skills)}"
            role_lines.append(line)
        parts.append("## Experience\n" + "\n".join(role_lines))

    if payload.skills:
        skill_parts = []
        for s in payload.skills:
            name = s.name
            if s.years:
                name += f" ({s.years}y)"
            skill_parts.append(name)
        parts.append("## Skills\n" + ", ".join(skill_parts))

    # Target description
    target_parts = [f"## Target: {target.label}"]
    if target.description:
        target_parts.append(target.description)

    profile = target.scoring_profile
    if profile.categories:
        for cat_name, cat in profile.categories.items():
            if cat.keywords:
                kws = [f"{k} (w={v})" for k, v in cat.keywords.items()]
                target_parts.append(f"**{cat_name}** (weight {cat.weight}x): {', '.join(kws)}")

    if profile.seniority.level:
        target_parts.append(f"**Seniority**: {profile.seniority.level}")
        if profile.seniority.signals:
            target_parts.append(f"**Seniority signals**: {', '.join(profile.seniority.signals)}")

    if profile.domain.signals:
        target_parts.append(f"**Domain**: {', '.join(profile.domain.signals)}")

    parts.append("\n".join(target_parts))

    return "\n\n".join(parts)


async def derive_fit_score(
    llm: LLMClient,
    *,
    payload: OptimizedPayload,
    target: JobTarget,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
) -> tuple[FitScoreResult, LLMResult]:
    """Derive a fit score for a user against a target.

    Returns (fit_score_result, llm_result) so callers can log cost.
    """
    user_message = _build_prompt(payload, target)
    return await complete_json(
        llm,
        model=model,
        system=SYSTEM_PROMPT,
        messages=[Message(role="user", content=user_message)],
        schema=FitScoreResult,
        purpose=purpose,
        max_tokens=512,
        cache_system=True,
    )
