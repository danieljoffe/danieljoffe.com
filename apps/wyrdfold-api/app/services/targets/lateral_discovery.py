"""Suggest lateral / adjacent target roles from a user's master payload.

PR D of plan-wyrdfold-streamlined-target.md. Most users sign up with one
target in mind ("Director of CX Operations") and don't realise their
career evidence also lands cleanly into 4-6 adjacent roles ("Director
of Customer Success Operations", "VP of Customer Experience", "Head of
Support Engineering") that share the same altitude but use different
industry-gatekept vocabulary. This service mines the master payload via
a single Sonnet call and returns those adjacent targets ready to
review-and-activate.

Distinct from ``services.targets.suggest.suggest_targets``: that one
suggests 2-3 targets at onboarding from scratch (no current targets to
avoid duplicating). This one is the "find me more" follow-up — takes
the user's existing active targets as exclusion list and returns
LATERAL siblings the user hasn't tried yet.

Cost: ~$0.02 per call at Sonnet 4.6 (~3K input + ~800 output tokens).
Run once at onboarding after the initial target is created; later
re-run weekly via a cron or on-demand from a "find more targets"
button in the UI.

Follow-up: once the user picks N suggestions to activate, each runs
through the existing ``derive_profile_from_label`` to produce the slim
target shape. This service does NOT do that — it stops at the
suggestion list so the user reviews + picks first.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.experience import OptimizedPayload
from app.models.llm import LLMResult, Message, ModelId
from app.models.targets import JobTarget, SeniorityHint
from app.services.llm.client import LLMClient, complete_json
from app.services.targets.suggest import _build_user_message as _profile_summary

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "target.suggest_lateral"

_MAX_SUGGESTIONS = 8


class LateralSuggestion(BaseModel):
    """One adjacent target the user is competitive for.

    Same vocabulary as the slim target shape (label / description /
    seniority_hint / domain_hints) so the activation flow can map this
    1:1 onto the existing ``derive_profile_from_label`` output without
    a translation layer.
    """

    label: str = Field(min_length=2, max_length=120)
    one_line_reasoning: str = Field(
        max_length=240,
        description=(
            "Why this user is competitive for this target. Concrete: cite "
            "a profile fact, not abstract phrases like 'strong leadership'."
        ),
    )
    confidence: int = Field(
        ge=0,
        le=100,
        description=(
            "Model's certainty the user lands this target. 90+ = obvious "
            "lateral; 60-89 = stretch with evidence; 30-59 = aspirational. "
            "The UI can hide low-confidence suggestions when the list is "
            "long enough."
        ),
    )
    lateral_relationship: str = Field(
        max_length=180,
        description=(
            "How this target differs from the user's current ones (e.g. "
            "'same altitude, different industry vocabulary' or 'one "
            "rung up — stretch'). Helps the user decide whether to "
            "activate or save for later."
        ),
    )
    primary_industry: str | None = Field(
        default=None,
        max_length=80,
        description=(
            "Industry/vertical the target lives in (e.g. 'CX SaaS', "
            "'payroll fintech', 'DTC e-commerce'). Domain-agnostic "
            "suggestions can leave this NULL."
        ),
    )
    seniority_hint: SeniorityHint = Field(
        description=(
            "Seniority of the suggested target. Same enum as "
            "JobTarget.seniority_hint so the activation flow can pass "
            "this straight through."
        ),
    )


class LateralSuggestions(BaseModel):
    """LLM response: a list of LateralSuggestion."""

    suggestions: list[LateralSuggestion] = Field(default_factory=list)


_SYSTEM_PROMPT = """\
You are a career-mining assistant. Given a user's structured experience \
(roles, skills, outcomes) and the list of target roles they're already \
pursuing, propose 5-8 ADJACENT target roles they're competitive for but \
haven't tried yet.

What "lateral" means here
- SAME ALTITUDE as the user's current targets (same seniority, same \
career arc) unless explicitly proposing a stretch. A user with a \
Director-of-CX-Ops target should NOT get "Customer Support Agent" \
suggestions; should get "Director of Customer Success Operations", \
"Head of Member Experience", "VP of Service Delivery", etc.
- DIFFERENT INDUSTRY / DOMAIN VOCABULARY. The whole point is that the \
user often doesn't know the title variants other industries use for \
the same role. A "Director of Engineering" might also land as \
"Engineering Manager II" at a startup, "Sr. Director of Software \
Engineering" at an enterprise, "Head of Platform" at a scale-up.
- SPAN INDUSTRIES. Include at least one suggestion from an industry \
the user has NOT yet worked in, IF their core skills transfer.
- INCLUDE ONE STRETCH. Among the 5-8 suggestions, include at least one \
that's a meaningful career-step-up (next altitude). Mark it with \
confidence < 70 and explain in lateral_relationship.

What NOT to suggest
- Exact duplicates of the user's current targets (you have the list).
- Roles where the user has no transferable evidence — confidence < 30 \
isn't useful, leave those out.
- Generic "Manager" / "Director" / "VP" without a function. Always \
specify the function.
- Different role function the user has no claim to (don't suggest \
Sales for an Engineer, Marketing for a CX Ops director).

Confidence calibration
- 90-100: the user has direct evidence for this role; near-bullseye.
- 70-89: confident match with one notable gap (e.g. different industry \
but skills carry).
- 40-69: stretch — the user could plausibly land it with the right \
narrative. Use this band for career-step-up suggestions.
- 0-39: don't include. The list is for actionable suggestions, not a \
brainstorm.

Return JSON matching this exact schema:

{
  "suggestions": [
    {
      "label": "Director of Customer Success Operations",
      "one_line_reasoning": "5 years building CX-Ops at Shopify; the \
Customer Success Ops function maps 1:1 onto your Zendesk + AI chatbot \
+ BPO governance experience.",
      "confidence": 92,
      "lateral_relationship": "Same altitude as your current target, \
different industry vocabulary (CS Ops vs CX Ops — most SaaS companies \
title it CS).",
      "primary_industry": "B2B SaaS",
      "seniority_hint": "director"
    }
  ]
}

seniority_hint must be exactly one of: ic, senior, staff, manager, \
director, vp, c_level.

Return ONLY the JSON object. No prose, no markdown, no code fences."""


def _build_user_message(
    payload: OptimizedPayload, current_targets: list[JobTarget]
) -> str:
    """Compose the user message: profile summary + exclusion list."""
    parts: list[str] = []

    parts.append("## User profile")
    parts.append(_profile_summary(payload))

    if current_targets:
        parts.append("## Already pursuing (do NOT re-suggest these)")
        for t in current_targets:
            line = f"- {t.label}"
            if t.seniority_hint:
                line += f" ({t.seniority_hint})"
            parts.append(line)
    else:
        parts.append(
            "## Already pursuing\n_(none — this is the first lateral pass)_"
        )

    parts.append(
        f"## Task\nPropose up to {_MAX_SUGGESTIONS} lateral targets. "
        "Span industries; include at least one career-stretch suggestion."
    )
    return "\n\n".join(parts)


async def suggest_lateral_targets(
    llm: LLMClient,
    *,
    payload: OptimizedPayload,
    current_targets: list[JobTarget] | None = None,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
) -> tuple[LateralSuggestions, LLMResult]:
    """Mine the master payload for adjacent target roles.

    Returns ``(suggestions, llm_result)`` so the caller can log cost.
    Errors propagate — the caller should swallow them at the request
    boundary and surface "no suggestions right now, try again later"
    rather than 500ing.
    """
    user_message = _build_user_message(payload, current_targets or [])
    parsed, result = await complete_json(
        llm,
        model=model,
        system=_SYSTEM_PROMPT,
        messages=[Message(role="user", content=user_message)],
        schema=LateralSuggestions,
        purpose=purpose,
        # Sonnet returns ~600-1000 tokens of JSON for 5-8 suggestions
        # at this verbosity. 2048 gives ample headroom.
        max_tokens=2048,
        cache_system=True,
    )
    # Trim to the documented max; if the LLM ignored the limit, we
    # truncate rather than reject — the top N by confidence are still
    # useful even if the model went over.
    if len(parsed.suggestions) > _MAX_SUGGESTIONS:
        trimmed = sorted(
            parsed.suggestions, key=lambda s: -s.confidence
        )[:_MAX_SUGGESTIONS]
        parsed = LateralSuggestions(suggestions=trimmed)
    return parsed, result
