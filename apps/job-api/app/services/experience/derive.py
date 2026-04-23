"""Derive an OptimizedPayload from a prose doc via LLM.

The prose doc is free-form narrative — what the user wrote during
onboarding + update turns. The optimized doc is typed structure:
roles, skills, outcomes, summary. This module bridges the two.

Keeping the prompt static and cacheable. The prose text is the only
variable content, which is ideal for Anthropic's prompt caching
(90% discount on cache reads). When the real client lands, cache_system=True
becomes a genuine cost-saver.
"""

from app.models.experience import OptimizedPayload
from app.models.llm import LLMResult, Message, ModelId
from app.services.llm.client import LLMClient, complete_json

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "experience.derive"

SYSTEM_PROMPT = """You are an extraction engine. Given a first-person career \
narrative, produce a strictly structured JSON projection.

Output must match this schema:

{
  "summary": "string — one-sentence positioning statement, or null",
  "roles": [
    {
      "id": "stable slug, e.g. 'fightcamp-senior-fe'",
      "company": "string",
      "title": "string",
      "start": "YYYY-MM",
      "end": "YYYY-MM or null if current",
      "summary": "string or null — 1-2 sentences on scope and impact",
      "skills": ["string", ...],
      "outcome_refs": ["outcome description strings this role owned", ...]
    }
  ],
  "skills": [
    { "name": "canonical name", "years": number or null, "evidence_refs": [] }
  ],
  "outcomes": [
    {
      "description": "past-tense impact statement",
      "metric": "what was measured, or null",
      "value": "the measurement, or null",
      "role_ref": "role.id this outcome belongs to"
    }
  ]
}

Rules:
- Extract only what the prose supports. Do not invent outcomes, metrics, or roles.
- Prefer canonical skill names (React, TypeScript, Next.js) over variants (reactjs, TS).
- Quantified outcomes (with metric + value) are higher-signal than unquantified ones.
- If a detail is ambiguous or missing, leave the field null rather than guessing.
- Role ids should be stable slugs the user can reference later.

Return ONLY the JSON object. No prose, no code fences."""


async def derive_from_prose(
    llm: LLMClient,
    *,
    prose_text: str,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
) -> tuple[OptimizedPayload, LLMResult]:
    """Run the derivation. Returns (payload, result) so callers can cost-log."""
    return await complete_json(
        llm,
        model=model,
        system=SYSTEM_PROMPT,
        messages=[Message(role="user", content=prose_text)],
        schema=OptimizedPayload,
        purpose=purpose,
        cache_system=True,
    )
