"""Derive a ScoringProfile from a reference JD via LLM.

Given a job description, the LLM extracts categorized skills with weights,
seniority signals, domain signals, and negative keywords. The extracted
profile is stored per-reference-JD and merged into the target's composite.

Follows the same pattern as app/services/experience/derive.py:
- Static system prompt (cacheable via Anthropic prompt caching)
- JD text is the only variable content
- complete_json() validates output against ScoringProfile
"""

from app.models.llm import LLMResult, Message, ModelId
from app.models.targets import ScoringProfile
from app.services.llm.client import LLMClient, complete_json

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "target.derive_profile"

SYSTEM_PROMPT = """\
You are a job-search scoring-profile generator. Given a job description,
extract a scoring profile as JSON matching this exact schema:

{
  "categories": {
    "core_skills": {
      "keywords": {"React": 3, "TypeScript": 3},
      "weight": 2.0
    },
    "secondary_skills": {
      "keywords": {"Node.js": 2, "GraphQL": 2},
      "weight": 1.0
    },
    "nice_to_have": {
      "keywords": {"Kubernetes": 1, "Terraform": 1},
      "weight": 0.5
    }
  },
  "seniority": {
    "level": "senior",
    "signals": ["5+ years", "lead", "mentor"]
  },
  "domain": {
    "signals": ["fintech", "payments"],
    "weight": 0.5
  },
  "negative": {
    "keywords": ["junior", "intern", "entry-level"],
    "weight": -10
  }
}

Rules:
- "core_skills": skills explicitly listed as required. Weight each keyword 2-3.
- "secondary_skills": preferred or implied skills. Weight each keyword 1-2.
- "nice_to_have": bonus skills mentioned in passing. Weight each keyword 1.
- Seniority level: one of "junior", "mid", "senior", "staff", "principal", \
"director".
- Domain signals: industry vertical or business context (e.g., "fintech", \
"b2b-saas", "healthcare").
- Negative keywords: terms that indicate the JD is NOT for this persona \
(e.g., role is too junior, wrong tech stack entirely).
- Use canonical skill names (React not reactjs, TypeScript not TS, Node.js \
not nodejs).
- Only extract what the JD explicitly supports. Do not invent skills.
- Return ONLY the JSON object. No prose, no markdown, no code fences."""


async def derive_profile_from_jd(
    llm: LLMClient,
    *,
    jd_text: str,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
) -> tuple[ScoringProfile, LLMResult]:
    """Extract a ScoringProfile from a job description.

    Returns (profile, result) so callers can log cost.
    """
    return await complete_json(
        llm,
        model=model,
        system=SYSTEM_PROMPT,
        messages=[Message(role="user", content=jd_text)],
        schema=ScoringProfile,
        purpose=purpose,
        cache_system=True,
    )
