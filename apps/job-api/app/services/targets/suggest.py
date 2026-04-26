"""Suggest job targets from the user's OptimizedDoc via LLM.

Given the user's structured experience (roles, skills, outcomes), the LLM
suggests 2-3 concrete role targets. Each suggestion includes a label,
short description, and core skills — enough to create a useful target
immediately. Detailed scoring profiles come later via reference JDs.
"""

from app.models.experience import OptimizedPayload
from app.models.llm import LLMResult, Message, ModelId
from app.models.targets import TargetSuggestions
from app.services.llm.client import LLMClient, complete_json

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "target.suggest"

SYSTEM_PROMPT = """\
You are a career advisor. Given a user's structured experience profile \
(roles, skills, outcomes), suggest 2-3 job targets they should pursue.

Return JSON matching this exact schema:

{
  "suggestions": [
    {
      "label": "Senior Frontend Engineer",
      "description": "Frontend-focused roles at mid-to-large companies \
leveraging your React and TypeScript expertise.",
      "core_skills": ["React", "TypeScript", "CSS", "Testing"]
    }
  ]
}

Rules:
- Suggest 2-3 targets. Each should be a distinct career direction.
- "label" is a concise role title (e.g., "Staff Full-Stack Engineer", \
"Engineering Manager", "Senior DevOps Engineer").
- "description" is 1-2 sentences explaining why this target fits and what \
kinds of companies/teams to look for.
- "core_skills" lists 3-6 skills from the user's profile most relevant to \
this target. Use canonical names (React not reactjs, TypeScript not TS).
- Base suggestions ONLY on the user's actual experience. Do not invent \
skills or roles they haven't held.
- Vary seniority or function across suggestions when the experience supports \
it (e.g., IC vs management, frontend vs full-stack).
- Return ONLY the JSON object. No prose, no markdown, no code fences."""


def _build_user_message(payload: OptimizedPayload) -> str:
    """Serialize the OptimizedPayload into a compact text summary for the LLM."""
    parts: list[str] = []

    if payload.summary:
        parts.append(f"Summary: {payload.summary}")

    if payload.roles:
        role_lines = []
        for r in payload.roles:
            line = f"- {r.title} at {r.company} ({r.start}–{r.end or 'present'})"
            if r.skills:
                line += f" | Skills: {', '.join(r.skills)}"
            role_lines.append(line)
        parts.append("Roles:\n" + "\n".join(role_lines))

    if payload.skills:
        skill_lines = []
        for s in payload.skills:
            line = s.name
            if s.years:
                line += f" ({s.years}y)"
            skill_lines.append(line)
        parts.append("Skills: " + ", ".join(skill_lines))

    if payload.outcomes:
        outcome_lines = []
        for o in payload.outcomes:
            line = f"- {o.description}"
            if o.metric and o.value:
                line += f" ({o.metric}: {o.value})"
            outcome_lines.append(line)
        parts.append("Key outcomes:\n" + "\n".join(outcome_lines[:10]))

    return "\n\n".join(parts) if parts else "No experience data available."


async def suggest_targets(
    llm: LLMClient,
    *,
    payload: OptimizedPayload,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
) -> tuple[TargetSuggestions, LLMResult]:
    """Suggest targets from an OptimizedPayload.

    Returns (suggestions, result) so callers can log cost.
    """
    user_message = _build_user_message(payload)
    return await complete_json(
        llm,
        model=model,
        system=SYSTEM_PROMPT,
        messages=[Message(role="user", content=user_message)],
        schema=TargetSuggestions,
        purpose=purpose,
        cache_system=True,
    )
