"""Normalize user-typed title + description into a canonical TargetSuggestion.

The LLM acts as the bridge between user-authored targets and suggested
targets so that everything downstream (matching, scoring, fit-score) sees
the same canonical shape regardless of how a target was authored.
"""

from app.models.experience import OptimizedPayload
from app.models.llm import LLMResult, Message, ModelId
from app.models.targets import TargetSuggestion
from app.services.llm.client import LLMClient, complete_json
from app.services.targets.suggest import _build_user_message

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "target.normalize_manual"

SYSTEM_PROMPT = """\
You are a career advisor. A user has typed a target role they want to \
pursue, optionally with a free-form description. Normalize this into a \
canonical target suggestion that matches the shape of LLM-generated \
suggestions.

Return JSON matching this exact schema:

{
  "label": "Senior Frontend Engineer",
  "description": "Frontend-focused roles at mid-to-large companies \
leveraging React and TypeScript expertise.",
  "core_skills": ["React", "TypeScript", "CSS", "Testing"]
}

Rules:
- "label" is a concise canonical role title. Polish abbreviations or \
informal phrasing (e.g. "sr fe eng" -> "Senior Frontend Engineer", \
"frontend dev for ml stuff" -> "Senior Frontend Engineer (ML/AI)"). \
Preserve the user's intended seniority and specialization.
- "description" is 1-2 sentences explaining what kinds of companies/teams \
fit this target. If the user typed a description, distill its intent. If \
not, write one based on the label and the user's experience.
- "core_skills" lists 3-6 canonical skills relevant to this target. Prefer \
skills the user actually has. Use canonical names (React not reactjs, \
TypeScript not TS).
- Do NOT invent seniority or specialization the user did not imply. If the \
input is ambiguous, default to the most plausible interpretation given the \
user's experience.
- Return ONLY the JSON object. No prose, no markdown, no code fences."""


async def normalize_manual_input(
    llm: LLMClient,
    *,
    label: str,
    description: str | None,
    payload: OptimizedPayload,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
) -> tuple[TargetSuggestion, LLMResult]:
    """Normalize user title + description into a canonical TargetSuggestion."""
    parts = [f"User-typed title: {label}"]
    if description:
        parts.append(f"User-typed description: {description}")
    parts.append("")
    parts.append(_build_user_message(payload))
    user_message = "\n".join(parts)

    return await complete_json(
        llm,
        model=model,
        system=SYSTEM_PROMPT,
        messages=[Message(role="user", content=user_message)],
        schema=TargetSuggestion,
        purpose=purpose,
        cache_system=True,
    )
