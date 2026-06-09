"""Derive a ScoringProfile from a reference JD via LLM.

Given a job description, the LLM extracts categorized skills with weights,
seniority signals, domain signals, and negative keywords. The extracted
profile is stored per-reference-JD and merged into the target's composite.

Follows the same pattern as app/services/experience/derive.py:
- Static system prompt (cacheable via Anthropic prompt caching)
- JD text is the only variable content
- complete_json() validates output against ScoringProfile

A content-hash cache backed by the ``target_derive_jd_cache`` table
short-circuits repeat calls for the same (prompt_version, model, jd_text)
tuple. Bump PROMPT_VERSION whenever SYSTEM_PROMPT changes — per the
``feedback-llm-cache-prompt-version`` rule, mismatched versions must
miss-then-rewrite, not return stale output.
"""

import hashlib
import logging
from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.models.llm import LLMResult, LLMUsage, Message, ModelId
from app.models.targets import DerivedTarget
from app.services.llm.client import LLMClient, complete_json

logger = logging.getLogger(__name__)

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "target.derive_profile"

# Bump when SYSTEM_PROMPT below materially changes. See module docstring.
PROMPT_VERSION = "v1"

_CACHE_TABLE = "target_derive_jd_cache"

SYSTEM_PROMPT = """\
You are a job-search scoring-profile generator. Given a job description,
extract a scoring profile and search keywords as JSON matching this exact schema:

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
    "react developer"
  ],
  "example_promising_titles": [
    "Senior Frontend Engineer",
    "Staff Web Engineer",
    "Principal Frontend Engineer",
    "Senior UI Engineer",
    "Staff Full-Stack Engineer",
    "Frontend Platform Engineer"
  ],
  "example_unpromising_titles": [
    "Senior Product Designer",
    "Product Marketing Manager",
    "Data Scientist",
    "Security Engineer",
    "Customer Success Manager",
    "Backend Engineer"
  ]
}

Rules for scoring_profile:
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

Rules for search_keywords:
- 5-15 lowercase role title variations derived from the JD's role title.
- Include common synonyms and abbreviations (e.g., "frontend engineer", \
"front-end developer", "ui engineer").
- These are used for substring matching against job titles, so be broad.
- Do NOT include technology names — only role titles.
- Do NOT include seniority prefixes — the system handles seniority separately.

Rules for example_promising_titles:
- 6-10 concrete, properly-cased job titles that match the role this JD \
describes. Include realistic seniority prefixes (Senior, Staff, Principal) \
— these are full titles a hiring page would post.
- Span the range of acceptable seniorities. If this JD is a staff role, \
include senior + staff + principal variants — same career direction.
- Include close-adjacent role variants the user would still pursue.
- These become POSITIVE few-shot anchors for a downstream binary \
classifier that gates which new postings to score deeply.

Rules for example_unpromising_titles:
- 6-10 concrete job titles that look adjacent but are NOT what this JD \
is about. Same seniority, different role function — the hard cases.
- Avoid obvious negatives. Pick close-but-wrong roles that share \
keywords (TypeScript, accessibility, design system, cross-functional) \
but a different ROLE FUNCTION.
- These become NEGATIVE few-shot anchors.

Return ONLY the JSON object. No prose, no markdown, no code fences."""


def _cache_key(jd_text: str, *, model: ModelId, prompt_version: str) -> str:
    """SHA-256 of (prompt_version + model + jd_text).

    Prompt version is part of the key so a prompt change cleanly misses
    the cache on first hit and rewrites on second — never serves stale
    output keyed to an older prompt.
    """
    h = hashlib.sha256()
    h.update(prompt_version.encode("utf-8"))
    h.update(b"\x00")
    h.update(model.encode("utf-8"))
    h.update(b"\x00")
    h.update(jd_text.encode("utf-8"))
    return h.hexdigest()


def _cache_hit_result(model: ModelId) -> LLMResult:
    """A zero-cost LLMResult stand-in for cache hits.

    Cost-log records still get written so we can count derivations, but
    the cost/latency/token columns are zeroed — there was no upstream
    call. ``content`` is "" because callers consume the parsed DerivedTarget,
    not the raw text.
    """
    return LLMResult(
        content="",
        model=model,
        usage=LLMUsage(),
        cost_usd=0.0,
        latency_ms=0,
    )


def _get_cached(
    supabase: Client, key: str
) -> DerivedTarget | None:
    """Return the cached DerivedTarget for ``key``, or None on miss."""
    try:
        resp = (
            supabase.table(_CACHE_TABLE)
            .select("derived_payload")
            .eq("jd_hash", key)
            .limit(1)
            .execute()
        )
    except Exception:
        # Cache layer is best-effort — a Supabase outage must not break
        # the LLM-derive path. Fall through to a fresh LLM call.
        logger.warning("derive-jd cache read failed; falling through", exc_info=True)
        return None
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        return None
    try:
        return DerivedTarget.model_validate(rows[0]["derived_payload"])
    except Exception:
        # A schema drift in stored payloads would otherwise poison the
        # cache row indefinitely; treat as miss so the LLM rewrites it.
        logger.warning(
            "derive-jd cache row failed validation; treating as miss", exc_info=True
        )
        return None


def _record_cache_hit(supabase: Client, key: str) -> None:
    """Best-effort hit_count + last_hit_at bump. Failures are swallowed."""
    try:
        current = (
            supabase.table(_CACHE_TABLE)
            .select("hit_count")
            .eq("jd_hash", key)
            .single()
            .execute()
        )
        row = cast(dict[str, Any], current.data or {})
        next_count = int(row.get("hit_count", 0)) + 1
        supabase.table(_CACHE_TABLE).update(
            {
                "hit_count": next_count,
                "last_hit_at": datetime.now(UTC).isoformat(),
            }
        ).eq("jd_hash", key).execute()
    except Exception:
        logger.debug("derive-jd cache hit-count bump failed", exc_info=True)


def _persist_cache(
    supabase: Client,
    *,
    key: str,
    prompt_version: str,
    model: ModelId,
    derived: DerivedTarget,
) -> None:
    """Best-effort cache write. Failures are swallowed (the derive call
    has already succeeded; we don't want to fail the user-facing request
    because the cache row didn't persist)."""
    try:
        supabase.table(_CACHE_TABLE).upsert(
            {
                "jd_hash": key,
                "prompt_version": prompt_version,
                "model": model,
                "derived_payload": derived.model_dump(mode="json"),
            },
            on_conflict="jd_hash",
        ).execute()
    except Exception:
        logger.warning("derive-jd cache write failed", exc_info=True)


async def derive_profile_from_jd(
    llm: LLMClient,
    *,
    jd_text: str,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
    supabase: Client | None = None,
) -> tuple[DerivedTarget, LLMResult]:
    """Extract a ScoringProfile + search keywords from a job description.

    When ``supabase`` is provided, looks up a content-hash cache keyed on
    (PROMPT_VERSION, model, jd_text). Cache hits skip the LLM call and
    return a zero-cost LLMResult; misses run the LLM and write the result
    back. Cache failures fall through to a fresh LLM call, so the cache
    layer can never break the derive path.

    When ``supabase`` is None (legacy callers / tests), behaves exactly
    like the pre-cache version: always calls the LLM.

    Returns (derived, result) so callers can log cost.
    """
    if supabase is not None:
        key = _cache_key(jd_text, model=model, prompt_version=PROMPT_VERSION)
        cached = _get_cached(supabase, key)
        if cached is not None:
            _record_cache_hit(supabase, key)
            return cached, _cache_hit_result(model)

    derived, result = await complete_json(
        llm,
        model=model,
        system=SYSTEM_PROMPT,
        messages=[Message(role="user", content=jd_text)],
        schema=DerivedTarget,
        purpose=purpose,
        cache_system=True,
    )

    if supabase is not None:
        _persist_cache(
            supabase,
            key=_cache_key(jd_text, model=model, prompt_version=PROMPT_VERSION),
            prompt_version=PROMPT_VERSION,
            model=model,
            derived=derived,
        )

    return derived, result
