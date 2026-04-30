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

# OptimizedPayload JSON for a multi-page narrative can run thousands of
# tokens (roles + skills + outcomes + annotations + summary). The default
# 4096 was truncating mid-output; bump to give room for realistic prose.
DEFAULT_MAX_TOKENS = 16_384

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
  ],
  "annotations": [
    {
      "action": "emphasize | exclude | de-emphasize",
      "ref_type": "role | skill | outcome",
      "ref_value": "the role.id, skill.name, or outcome description substring this targets",
      "target_label": "target role label this applies to, or null for all targets",
      "reason": "short paraphrase of the user's stated reason, or null"
    }
  ]
}

Rules:
- Extract only what the prose supports. Do not invent outcomes, metrics, or roles.
- Prefer canonical skill names (React, TypeScript, Next.js) over variants (reactjs, TS).
- Quantified outcomes (with metric + value) are higher-signal than unquantified ones.
- If a detail is ambiguous or missing, leave the field null rather than guessing.
- Role ids should be stable slugs the user can reference later.

Deduplication:
- The prose may contain repeated content from multiple resume uploads or edits.
- Produce ONE Role per unique (company, title, start) tuple. Merge skills and \
outcome_refs across duplicates.
- Produce ONE Skill per canonical name. Take the maximum years_value across mentions.
- Drop outcomes whose description is substantively identical to another (paraphrase \
matches count as duplicates).

Annotations from inline HTML comments:
- Scan the prose for HTML comments (`<!-- ... -->`) that express user directives \
about emphasis, exclusion, or de-emphasis. Examples:
  - `<!-- exclude my helpdesk role from frontend resumes -->`
  - `<!-- emphasize React work for frontend targets -->`
  - `<!-- de-emphasize pre-2017 bullets -->`
  - `<!-- exclude this skill: jQuery -->`
- For each such directive, emit an `annotations` entry. Map natural language to:
  - `action`: emphasize | exclude | de-emphasize (infer from verbs)
  - `ref_type`: role | skill | outcome (infer from the noun)
  - `ref_value`: the role.id, exact skill name, or a distinctive substring of \
the outcome description
  - `target_label`: if the directive mentions a target role ("for frontend", \
"on engineering resumes"), capture it; otherwise null (= applies to all targets)
  - `reason`: optional paraphrase of why
- Omit the `id` field — the server generates one.
- If no inline directives are present, return an empty annotations array.

Return ONLY the JSON object. No prose, no code fences."""


async def derive_from_prose(
    llm: LLMClient,
    *,
    prose_text: str,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
    max_tokens: int = DEFAULT_MAX_TOKENS,
) -> tuple[OptimizedPayload, LLMResult]:
    """Run the derivation. Returns (payload, result) so callers can cost-log."""
    return await complete_json(
        llm,
        model=model,
        system=SYSTEM_PROMPT,
        messages=[Message(role="user", content=prose_text)],
        schema=OptimizedPayload,
        purpose=purpose,
        max_tokens=max_tokens,
        cache_system=True,
    )
