"""Derive a ScoringProfile + search keywords from a target label via LLM.

Given a target label (e.g., "Senior Frontend Engineer") and the user's
experience context, the LLM generates:
1. A full ScoringProfile for scoring jobs against this target
2. Search keywords (role title variations) for filtering jobs from ATS APIs

Follows the same pattern as derive_profile.py:
- Static system prompt (cacheable via Anthropic prompt caching)
- Label + user context are the variable content
- complete_json() validates output against DerivedTarget
"""

from app.models.experience import OptimizedPayload
from app.models.llm import LLMResult, Message, ModelId
from app.models.targets import DerivedTarget
from app.services.llm.client import LLMClient, complete_json
from app.services.targets.suggest import _build_user_message

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "target.derive_from_label"

SYSTEM_PROMPT = """\
You are a job-search scoring-profile generator. Given a target role label \
and the user's professional background, generate two things:

1. A scoring profile for evaluating job postings against this target
2. Search keywords for finding matching job postings on company career pages

Return JSON matching this exact schema:

{
  "scoring_profile": {
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
  },
  "search_keywords": [
    "frontend engineer",
    "front-end engineer",
    "ui engineer",
    "react developer",
    "frontend developer",
    "web developer"
  ]
}

Rules for scoring_profile:
- "core_skills": skills the user actually has that are essential for this \
target role. Weight each keyword 2-3.
- "secondary_skills": skills the user has that are commonly preferred for \
this role. Weight each keyword 1-2.
- "nice_to_have": relevant bonus skills from the user's background. Weight \
each keyword 1.
- Seniority level: one of "junior", "mid", "senior", "staff", "principal", \
"director". Match the target label's implied seniority.
- Domain signals: industry verticals relevant to the target.
- Negative keywords: terms indicating a job is NOT for this target \
(e.g., wrong seniority, wrong specialization).
- Use canonical skill names (React not reactjs, TypeScript not TS).
- Ground the profile in the user's ACTUAL experience. Only include skills \
they demonstrably have.

Rules for search_keywords:
- 5-15 lowercase role title variations and synonyms.
- Include the target label itself (lowercased) and common variations.
- These are used for substring matching against job posting titles on \
career pages, so be broad: include both formal and informal variations.
- Include related but distinct role titles that the user could pursue \
(e.g., "frontend engineer" and "ui developer" target similar roles).
- Do NOT include technology names — only role titles.
- Do NOT include seniority prefixes (no "senior", "staff", "lead") — \
the system handles seniority matching separately.

Return ONLY the JSON object. No prose, no markdown, no code fences."""


async def derive_profile_from_label(
    llm: LLMClient,
    *,
    label: str,
    payload: OptimizedPayload,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
) -> tuple[DerivedTarget, LLMResult]:
    """Derive a ScoringProfile + search keywords from a target label.

    Returns (derived, result) so callers can log cost.
    """
    user_context = _build_user_message(payload)
    user_message = f"Target role: {label}\n\n{user_context}"

    return await complete_json(
        llm,
        model=model,
        system=SYSTEM_PROMPT,
        messages=[Message(role="user", content=user_message)],
        schema=DerivedTarget,
        purpose=purpose,
        cache_system=True,
    )
