"""Tailor a resume from an OptimizedPayload + JD via LLM.

Pure function. No DB. No docx. No retrieval (the optimized doc is small
enough to pass in full). Cost logging happens at the router layer, which
also persists the result to `documents` and kicks off rendering.

Post-generation, `validate_trace_refs()` checks that every role and
bullet carries a source ref that actually exists in the OptimizedPayload.
Bullets that fail the check are dropped; unmatched roles raise.
"""

from __future__ import annotations

import json

from app.models.experience import OptimizedPayload
from app.models.llm import LLMResult, Message, ModelId
from app.models.tailor import (
    ContactInfo,
    ResumeType,
    TailoredBullet,
    TailoredCoverLetter,
    TailoredResume,
    TailoredRole,
)
from app.services.llm.client import LLMClient, complete_json
from app.services.tailor.prompts import COVER_LETTER_SYSTEM, TAILOR_SYSTEM

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "tailor.resume"
DEFAULT_COVER_LETTER_PURPOSE = "tailor.cover_letter"


def build_user_message(
    *,
    optimized: OptimizedPayload,
    job_description: str,
    contact: ContactInfo,
    resume_type: ResumeType,
    preferences_text: str | None,
    annotations_text: str | None,
    critique: str | None,
    page_budget: int,
) -> str:
    """Assemble the variable content for the LLM call.

    The system prompt is static (cache target); everything that changes
    per call lives here.
    """
    sections: list[str] = []
    sections.append(f"[OptimizedPayload]\n{optimized.model_dump_json(indent=2)}")
    sections.append(f"[ContactInfo]\n{contact.model_dump_json(indent=2)}")
    sections.append(f"[ResumeType] {resume_type}")
    sections.append(f"[PageBudget] {page_budget}")
    if preferences_text:
        sections.append(f"[Preferences]\n{preferences_text}")
    if annotations_text:
        sections.append(f"[Annotations]\n{annotations_text}")
    if critique:
        sections.append(f"[Critique]\n{critique}")
    sections.append(f"[JobDescription]\n{job_description}")
    return "\n\n".join(sections)


def validate_trace_refs(
    resume: TailoredResume,
    optimized: OptimizedPayload,
) -> tuple[TailoredResume, list[str]]:
    """Drop bullets and raise on roles that don't trace back to the
    OptimizedPayload. Returns the cleaned resume + a list of warning
    strings about dropped bullets.
    """
    role_ids = {r.id for r in optimized.roles}
    outcome_descriptions = {o.description for o in optimized.outcomes}
    # Role summaries are also valid bullet sources — the prompt allows
    # "a literal clause from role.summary". We accept any non-empty summary
    # string as a valid ref (LLM can echo a sentence fragment).
    role_summaries: dict[str, str] = {
        r.id: r.summary or "" for r in optimized.roles
    }

    warnings: list[str] = []
    cleaned_experience: list[TailoredRole] = []

    for role in resume.experience:
        if role.source_role_ref not in role_ids:
            raise ValueError(
                f"TailoredRole references unknown role id: {role.source_role_ref!r}"
            )
        kept_bullets: list[TailoredBullet] = []
        for bullet in role.bullets:
            ref = (bullet.source_outcome_ref or "").strip()
            if not ref:
                warnings.append(f"Dropped bullet with no ref: {bullet.text[:80]!r}")
                continue
            summary_for_role = role_summaries.get(role.source_role_ref, "")
            traces_to_outcome = ref in outcome_descriptions
            traces_to_summary = bool(summary_for_role) and ref in summary_for_role
            if not (traces_to_outcome or traces_to_summary):
                warnings.append(
                    f"Dropped bullet with untraceable ref {ref[:60]!r}: "
                    f"{bullet.text[:80]!r}"
                )
                continue
            kept_bullets.append(bullet)
        cleaned_role = role.model_copy(update={"bullets": kept_bullets})
        cleaned_experience.append(cleaned_role)

    return (
        resume.model_copy(update={"experience": cleaned_experience}),
        warnings,
    )


def _preferences_text(
    rules: list[str] | None,
    avoid: list[str] | None,
    tone_notes: list[str] | None,
) -> str | None:
    if not rules and not avoid and not tone_notes:
        return None
    payload = {
        "rules": rules or [],
        "avoid": avoid or [],
        "tone_notes": tone_notes or [],
    }
    return json.dumps(payload, indent=2)


async def tailor_resume(
    llm: LLMClient,
    *,
    optimized: OptimizedPayload,
    job_description: str,
    contact: ContactInfo,
    resume_type: ResumeType = "generic",
    preferences_rules: list[str] | None = None,
    preferences_avoid: list[str] | None = None,
    preferences_tone_notes: list[str] | None = None,
    annotations_text: str | None = None,
    critique: str | None = None,
    page_budget: int = 2,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
) -> tuple[TailoredResume, list[str], LLMResult]:
    """Run the LLM and post-validate traceability.

    Returns (resume, warnings, llm_result). Caller is responsible for
    cost-logging result + persisting resume.
    """
    user_message = build_user_message(
        optimized=optimized,
        job_description=job_description,
        contact=contact,
        resume_type=resume_type,
        preferences_text=_preferences_text(
            preferences_rules, preferences_avoid, preferences_tone_notes
        ),
        annotations_text=annotations_text,
        critique=critique,
        page_budget=page_budget,
    )

    parsed, result = await complete_json(
        llm,
        model=model,
        system=TAILOR_SYSTEM,
        messages=[Message(role="user", content=user_message)],
        schema=TailoredResume,
        purpose=purpose,
        cache_system=True,
        max_tokens=8192,
    )

    cleaned, warnings = validate_trace_refs(parsed, optimized)
    return cleaned, warnings, result


# ---------------------------------------------------------------------------
# Cover letters
# ---------------------------------------------------------------------------


def build_cover_letter_user_message(
    *,
    optimized: OptimizedPayload,
    job_description: str,
    company_name: str,
    contact: ContactInfo,
    role_title: str | None,
    preferences_text: str | None,
    annotations_text: str | None,
    critique: str | None,
) -> str:
    """Assemble the variable content for the LLM call.

    The system prompt is static (cache target); everything that changes
    per call lives here.
    """
    sections: list[str] = []
    sections.append(f"[OptimizedPayload]\n{optimized.model_dump_json(indent=2)}")
    sections.append(f"[ContactInfo]\n{contact.model_dump_json(indent=2)}")
    sections.append(f"[RecipientCompany] {company_name}")
    if role_title:
        sections.append(f"[RoleTitle] {role_title}")
    if preferences_text:
        sections.append(f"[Preferences]\n{preferences_text}")
    if annotations_text:
        sections.append(f"[Annotations]\n{annotations_text}")
    if critique:
        sections.append(f"[Critique]\n{critique}")
    sections.append(f"[JobDescription]\n{job_description}")
    return "\n\n".join(sections)


def validate_cover_letter_refs(
    letter: TailoredCoverLetter,
    optimized: OptimizedPayload,
) -> tuple[TailoredCoverLetter, list[str]]:
    """Drop refs that don't trace back to the OptimizedPayload. Returns
    the cleaned letter + warnings for each dropped ref.

    Unlike the resume trace check, cover letters reference refs in
    aggregate (not per-bullet). We drop invalid refs rather than raise
    because a cover letter's prose may still be salvageable even if one
    claimed ref is off — the prose itself is what the user ships.
    Callers should surface warnings to the user.
    """
    valid_role_ids = {r.id for r in optimized.roles}
    valid_outcome_descriptions = {o.description for o in optimized.outcomes}
    valid_skill_names = {s.name for s in optimized.skills}

    warnings: list[str] = []

    kept_role_refs: list[str] = []
    for ref in letter.source_role_refs:
        if ref in valid_role_ids:
            kept_role_refs.append(ref)
        else:
            warnings.append(f"Dropped unknown role_ref: {ref!r}")

    kept_outcome_refs: list[str] = []
    for ref in letter.source_outcome_refs:
        if ref in valid_outcome_descriptions:
            kept_outcome_refs.append(ref)
        else:
            warnings.append(f"Dropped unknown outcome_ref: {ref[:60]!r}")

    kept_skill_refs: list[str] = []
    for ref in letter.source_skill_refs:
        if ref in valid_skill_names:
            kept_skill_refs.append(ref)
        else:
            warnings.append(f"Dropped unknown skill_ref: {ref!r}")

    cleaned = letter.model_copy(
        update={
            "source_role_refs": kept_role_refs,
            "source_outcome_refs": kept_outcome_refs,
            "source_skill_refs": kept_skill_refs,
        }
    )
    return cleaned, warnings


async def tailor_cover_letter(
    llm: LLMClient,
    *,
    optimized: OptimizedPayload,
    job_description: str,
    company_name: str,
    contact: ContactInfo,
    role_title: str | None = None,
    preferences_rules: list[str] | None = None,
    preferences_avoid: list[str] | None = None,
    preferences_tone_notes: list[str] | None = None,
    annotations_text: str | None = None,
    critique: str | None = None,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_COVER_LETTER_PURPOSE,
) -> tuple[TailoredCoverLetter, list[str], LLMResult]:
    """Run the LLM and post-validate that declared refs trace back.

    Returns (letter, warnings, llm_result). Caller is responsible for
    cost-logging and persistence.
    """
    user_message = build_cover_letter_user_message(
        optimized=optimized,
        job_description=job_description,
        company_name=company_name,
        contact=contact,
        role_title=role_title,
        preferences_text=_preferences_text(
            preferences_rules, preferences_avoid, preferences_tone_notes
        ),
        annotations_text=annotations_text,
        critique=critique,
    )

    parsed, result = await complete_json(
        llm,
        model=model,
        system=COVER_LETTER_SYSTEM,
        messages=[Message(role="user", content=user_message)],
        schema=TailoredCoverLetter,
        purpose=purpose,
        cache_system=True,
        max_tokens=4096,
    )

    cleaned, warnings = validate_cover_letter_refs(parsed, optimized)
    return cleaned, warnings, result
