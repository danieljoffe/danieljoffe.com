"""Phase 2: per-(user, target, job) LLM fit grader.

Sonnet-backed scorer that produces a 0-100 fit score plus a four-axis
scorecard (title / skills / seniority / domain) plus a 1-2 sentence
reasoning string. Same rubric shape as the existing
``derive_fit_score`` (which scores user-vs-target) so the UI can render
consistent breakdowns regardless of which scope is being shown.

Phase 1 (``relevance.title_triage``) decides WHICH jobs reach this
grader. Phase 2 decides HOW WELL each promising job actually fits;
this output is what the user sees as the score on their /jobs page.

No callsite changes in this PR — this module is the scaffold the
follow-up poller-integration PR plugs into.

Pricing context
- Sonnet 4.6 at ~$3/1M input + ~$15/1M output.
- Per call: ~500 input tokens (target context + user profile + JD
  snippet) + ~150 output tokens (scorecard JSON).
- Effective per-job cost: ~$0.0035. With Phase 1 already culling
  ~80-90% of off-topic postings, that's ~$0.10 per poll cycle per
  active target — sustainable.
"""

from __future__ import annotations

import logging

from pydantic import BaseModel, Field

from app.models.experience import OptimizedPayload
from app.models.llm import LLMResult, Message, ModelId
from app.models.targets import JobTarget
from app.services.llm.client import LLMClient, complete_json
from app.services.targets.suggest import _build_user_message as _profile_summary

logger = logging.getLogger(__name__)

JOB_FIT_MODEL: ModelId = "claude-sonnet-4-6"
JOB_FIT_PURPOSE = "fit.job"

# Cap the JD context we send. Most JDs are 1-5 KB of HTML stripped to
# 500-3000 tokens; the long-tail ones (10K+ tokens) inflate cost
# without adding signal — the relevance verdict is decided in the
# first half. Trim to first ~2000 chars after strip-html.
_JD_CONTEXT_CHAR_CAP = 2000


class AxisScores(BaseModel):
    """Per-axis breakdown of the overall fit score.

    Each axis is 0-100 on the same scale as ``fit_score``. The overall
    score is NOT a strict average — the LLM weights axes by relevance to
    the target. For example, a "Staff Frontend Engineer" target weights
    title + skills heavily and seniority + domain moderately; a "VP of
    CX" target weights title + seniority heavily and skills moderately.
    """

    title_fit: int = Field(ge=0, le=100)
    skills_fit: int = Field(ge=0, le=100)
    seniority_fit: int = Field(ge=0, le=100)
    domain_fit: int = Field(ge=0, le=100)


class JobFitResult(BaseModel):
    """LLM output: overall fit + axis breakdown + reasoning.

    Phase 3 (user-triggered deep dive) emits the same shape with a
    stronger model + full JD context, expected within ±20 points of
    Phase 2 — that's the "variance you can trust" the user sees when
    they click in for the deep analysis.
    """

    fit_score: int = Field(ge=0, le=100)
    axes: AxisScores
    reasoning: str = Field(max_length=1500)


_SYSTEM_PROMPT = """\
You grade how well a job posting fits a specific user pursuing a \
specific target role. Return a 0-100 overall fit score plus per-axis \
scores and a short reasoning string.

Scoring axes (each 0-100)
- title_fit: does the job's title match the role the user is hunting? \
A Staff Frontend Engineer target wants Frontend / Full-Stack / Web / \
UI / React titles. Treat adjacent IC roles (Full-Stack for Frontend) \
generously; treat off-discipline titles (Sales, Marketing, Design for \
an Engineer target) harshly.
- skills_fit: does the JD's required skills overlap with the user's \
demonstrated skills (in the user profile) AND with the target's \
scoring profile? Reward concrete overlap; discount tech keywords that \
are mentioned in passing.
- seniority_fit: does the job's seniority match the target's level? \
One rung up or down is fine; further is not.
- domain_fit: does the company's domain / business align with what the \
user has done before? Greater weight for targets where domain is part \
of the user's intent (e.g., "Director of CX Operations" in a SaaS \
context); lighter weight when the target is domain-agnostic.

Overall fit_score guidance (same bands as baseline)
- 85-100: excellent across the board; title squarely matches, skills \
overlap is strong, seniority lines up. Strong recommend.
- 70-84: solid match with one minor gap (e.g., right title + skills, \
seniority slightly off; or right title + seniority, missing a tech).
- 50-69: meaningful overlap but a significant gap (different specialty \
within the same role family; one full seniority rung off; missing a \
core skill).
- 30-49: same general direction but several gaps (wrong specialty, \
weak skills overlap, off seniority).
- 0-29: wrong role function or domain entirely. Should not have \
reached you if Phase 1 was working — flag it loudly.

Reasoning rules — STRICT (evidence-first):
- The reasoning string MUST cite at least one specific JD phrase in \
quotes (e.g., 'the JD asks for "5+ years of React"').
- The reasoning string MUST cite at least one specific item from the \
user profile (specific skill, prior company, named outcome) — not a \
category label.
- Lead with the STRONGEST matched dimension and name it explicitly: \
"Title:", "Skills:", "Seniority:", or "Domain:".
- Close with the BIGGEST GAP, also named explicitly.
- Hard ban: words like "strong", "great", "well", "alignment", \
"synergy", "cultural fit" — these are confidence words without \
evidence. Replace with the underlying fact.
- 2-3 sentences. Longer if you must, but every sentence must carry a \
specific fact.

The discipline of forcing concrete evidence in the reasoning should \
naturally calibrate the score — a score of 80+ that you cannot back up \
with quoted evidence is a wrong score.

Return JSON matching this exact schema:

{
  "fit_score": 82,
  "axes": {
    "title_fit": 95,
    "skills_fit": 80,
    "seniority_fit": 85,
    "domain_fit": 70
  },
  "reasoning": "Title: 'Staff Frontend Engineer' matches the target \
exactly. Skills: the JD asks for 'React, TypeScript, accessibility' \
which appear as headline strengths in your FightCamp work (Lighthouse \
+40, WCAG audit). Gap — Domain: the JD names 'AI safety surfaces' \
which is absent from your e-commerce/healthtech profile."
}

Return ONLY the JSON object. No prose, no markdown, no code fences."""


def _build_user_message(
    *,
    payload: OptimizedPayload,
    target: JobTarget,
    job_title: str,
    jd_text: str,
) -> str:
    """Compose the per-call user message.

    Order matters for prompt caching: stable per-(user, target) context
    first, variable per-job context last. The static system prompt sits
    above this entirely.
    """
    parts: list[str] = []

    # User profile summary — reuses the same serializer the
    # target-suggest flow uses so the prompt sees a consistent shape.
    parts.append("## User profile")
    parts.append(_profile_summary(payload))

    # Target context. The slim shape (description + seniority_hint +
    # domain_hints) carries strictly more signal than the legacy
    # scoring_profile categories prose — prefer it when populated.
    # Legacy targets (NULL slim fields) fall back to the keyword block.
    target_lines = [f"## Target: {target.label}"]
    has_slim = bool(target.description or target.seniority_hint or target.domain_hints)

    if target.description:
        target_lines.append(target.description)
    if target.seniority_hint:
        target_lines.append(f"Seniority level: {target.seniority_hint}")
    elif target.scoring_profile.seniority.level:
        target_lines.append(f"Seniority level: {target.scoring_profile.seniority.level}")
    if target.domain_hints:
        target_lines.append(f"Domain: {', '.join(target.domain_hints)}")
    elif target.scoring_profile.domain.signals:
        target_lines.append(
            f"Domain signals: {', '.join(target.scoring_profile.domain.signals)}"
        )

    if not has_slim:
        # Legacy fallback: dump the scoring_profile categories. Phase 2
        # uses these as loose context, not weighted scoring inputs.
        profile = target.scoring_profile
        if profile.categories:
            for cat_name, cat in profile.categories.items():
                if cat.keywords:
                    top_kws = list(cat.keywords.keys())[:10]
                    target_lines.append(
                        f"{cat_name} (weight {cat.weight}x): {', '.join(top_kws)}"
                    )
        if profile.negative.keywords:
            target_lines.append(
                f"Negative keywords: {', '.join(profile.negative.keywords)}"
            )
    parts.append("\n".join(target_lines))

    # Job posting (last — cache-unfriendly, varies per call).
    jd_snippet = jd_text[:_JD_CONTEXT_CHAR_CAP]
    if len(jd_text) > _JD_CONTEXT_CHAR_CAP:
        jd_snippet += " [truncated]"
    parts.append(f"## Job posting\n**Title:** {job_title}\n\n{jd_snippet}")

    return "\n\n".join(parts)


async def derive_job_fit(
    llm: LLMClient,
    *,
    payload: OptimizedPayload,
    target: JobTarget,
    job_title: str,
    jd_text: str,
    model: ModelId = JOB_FIT_MODEL,
    purpose: str = JOB_FIT_PURPOSE,
) -> tuple[JobFitResult, LLMResult]:
    """Grade a single (user, target, job) tuple.

    Returns ``(fit_result, llm_result)`` so callers can log cost.
    Errors propagate (unlike Phase 1's fail-open semantics) — the
    poller catches them and falls back to ``promising=True, score=None``
    so the UI shows a "Pending" badge instead of grinding to a halt.

    Caller is responsible for batching / rate-limiting; this is one
    call per (job, target). The progressive batching policy (first 20
    eagerly, rest in 50-chunk background batches) lives in the poller.
    """
    user_message = _build_user_message(
        payload=payload, target=target, job_title=job_title, jd_text=jd_text
    )

    return await complete_json(
        llm,
        model=model,
        system=_SYSTEM_PROMPT,
        messages=[Message(role="user", content=user_message)],
        schema=JobFitResult,
        purpose=purpose,
        # 1024 (was 512) to give Sonnet headroom for the evidence-first
        # reasoning. Sonnet only emits as many tokens as it needs, so the
        # cost impact is minimal — the prior 512 cap occasionally truncated
        # mid-JSON on softer / vaguer CX-style JDs where the model tried
        # harder to find quotable evidence. See plan-wyrdfold-relevance-
        # findings.md "Experiment 3" for the diagnostic chain.
        max_tokens=1024,
        cache_system=True,
    )
