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

Label rules — STRICT:
- The "label" must stay as close to the user's input as possible. ONLY \
fix capitalization, expand obvious abbreviations, and correct typos.
  - "sr fe eng" -> "Senior Frontend Engineer" (expansion of clear abbrev)
  - "software engineer" -> "Software Engineer" (just capitalization)
  - "fullstack dev" -> "Full-Stack Developer" (just expansion + casing)
- Do NOT add seniority words the user did not type. If they typed \
"Software Engineer", do NOT change it to "Senior Software Engineer".
- Do NOT add specializations, sub-areas, team names, product names, or \
company-specific terms. If they typed "Software Engineer", do NOT change \
it to "Full-Stack Software Engineer" or "Senior Full-Stack Software \
Engineer, Quests Experience".
- Do NOT pull terms from the user's experience or the description into \
the label. The description and experience inform "description" and \
"core_skills" only.
- The label should be a generic, reusable role title — multiple users \
should be able to share the same target.

Other fields:
- "description" is 1-2 sentences explaining what kinds of companies/teams \
fit this target. If the user typed a description, distill its intent. If \
not, write one based on the label and the user's experience.
- "core_skills" lists 3-6 canonical skills relevant to this target. Prefer \
skills the user actually has. Use canonical names (React not reactjs, \
TypeScript not TS).
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
