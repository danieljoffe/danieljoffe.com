"""Create-or-link a target from user-authored input.

Both flows (manual title+description, or JD URL) funnel through a common
shape: LLM normalize -> match against existing -> link or create+link.
This guarantees the user always ends up with a ``user_targets`` row, so
the new target appears in ``GET /targets/mine`` immediately.

URL mode also acts as a corpus builder — when the URL maps to an existing
shared target, the JD is appended as a reference and the composite profile
is re-merged so all linked users benefit from the new data point.

Performance: the only LLM call that has to run inline is
``normalize_manual_input`` — its canonical label drives duplicate
detection via ``find_matching_target``. The expensive steps
(``derive_profile_*`` + ``derive_fit_score``, 5-9s of sequential Sonnet
calls) are deferred to a ``BackgroundTask`` so the endpoint can return an
optimistic ``CreateOrLinkResult`` immediately. New targets are created in
``activation_status="deriving"`` and flip to ``idle`` (or ``error``) once
the background work completes; the frontend polls until then. This mirrors
the ``_activate_pipeline`` BackgroundTask pattern in ``routers/targets``.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import BackgroundTasks
from supabase import Client

from app.models.experience import OptimizedPayload
from app.models.targets import (
    CreateOrLinkResult,
    JobTarget,
    ScoringProfile,
    TargetCreate,
    TargetUpdate,
)
from app.services.llm import cost_log
from app.services.llm.client import LLMClient
from app.services.targets import crud
from app.services.targets.derive_profile import (
    DEFAULT_PURPOSE as DERIVE_JD_PURPOSE,
)
from app.services.targets.derive_profile import (
    derive_profile_from_jd,
)
from app.services.targets.derive_profile_from_label import (
    DEFAULT_PURPOSE as DERIVE_LABEL_PURPOSE,
)
from app.services.targets.derive_profile_from_label import (
    derive_profile_from_label,
)
from app.services.targets.fit_score import (
    DEFAULT_PURPOSE as FIT_SCORE_PURPOSE,
)
from app.services.targets.fit_score import (
    derive_fit_score,
)
from app.services.targets.match import find_matching_target
from app.services.targets.merge import merge_profiles
from app.services.targets.normalize_manual import (
    DEFAULT_PURPOSE as NORMALIZE_PURPOSE,
)
from app.services.targets.normalize_manual import (
    normalize_manual_input,
)

logger = logging.getLogger(__name__)

# Hard ceiling for a deferred derivation (profile + fit-score LLM calls).
# A hung LLM call would otherwise leave the target stuck in "deriving"
# forever — the timeout cancels the work and flips the target to "error"
# so the frontend stops polling and surfaces the failure. Sized well above
# the observed 5-9s happy path while still bounding the worst case.
DERIVATION_TIMEOUT_S = 60.0


# ---- Deferred fit-score helper ---------------------------------------------


async def _apply_fit_score(
    supabase: Client,
    llm: LLMClient,
    *,
    user_id: str,
    target: JobTarget,
    payload: OptimizedPayload,
) -> None:
    """Derive a per-user fit score and upsert it onto the user's link.

    The user is already linked (the inline path created the
    ``user_targets`` row), so this is an idempotent upsert that just fills
    in ``fit_score`` / ``fit_score_reasoning`` once the LLM returns.
    """
    fit_result, llm_result = await derive_fit_score(llm, payload=payload, target=target)
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=FIT_SCORE_PURPOSE,
        result=llm_result,
        metadata={"target_id": target.id, "user_id": user_id},
    )
    crud.link_user_to_target(
        supabase,
        user_id=user_id,
        target_id=target.id,
        is_active=False,
        fit_score=fit_result.fit_score,
        fit_score_reasoning=fit_result.reasoning,
    )


# ---- Background derivation tasks --------------------------------------------


async def derive_manual_target_bg(
    supabase: Client,
    llm: LLMClient,
    *,
    user_id: str,
    target_id: str,
    label: str,
    payload: OptimizedPayload,
) -> None:
    """Derive profile-from-label then fit score for a new manual target.

    Runs as a ``BackgroundTask``. The target already exists in
    ``activation_status="deriving"``; on success it flips to ``idle`` with
    the derived scoring profile, on failure (or timeout) to ``error``.
    """
    try:
        async with asyncio.timeout(DERIVATION_TIMEOUT_S):
            derived, derive_result = await derive_profile_from_label(
                llm, label=label, payload=payload
            )
            cost_log.record(
                supabase,
                user_id=user_id,
                purpose=DERIVE_LABEL_PURPOSE,
                result=derive_result,
                metadata={"user_id": user_id, "label": label},
            )
            updated = crud.update(
                supabase,
                target_id,
                TargetUpdate(
                    scoring_profile=derived.scoring_profile,
                    search_keywords=derived.search_keywords,
                    example_promising_titles=derived.example_promising_titles,
                    example_unpromising_titles=derived.example_unpromising_titles,
                    # Slim shape — populated when the LLM emits them; None is
                    # treated as "leave unchanged" by crud.update, so the
                    # canonical description from normalize survives.
                    description=derived.description,
                    seniority_hint=derived.seniority_hint,
                    domain_hints=derived.domain_hints or None,
                    activation_status="idle",
                ),
            )
            if updated is None:
                logger.error("Failed to update target %s after deferred derive", target_id)
                return
            await _apply_fit_score(
                supabase, llm, user_id=user_id, target=updated, payload=payload
            )
    except TimeoutError:
        logger.error(
            "Deferred manual-target derivation timed out after %ss for target %s",
            DERIVATION_TIMEOUT_S,
            target_id,
        )
        crud.update(supabase, target_id, TargetUpdate(activation_status="error"))
    except Exception:
        logger.exception("Deferred manual-target derivation failed for target %s", target_id)
        crud.update(supabase, target_id, TargetUpdate(activation_status="error"))


async def derive_url_target_bg(
    supabase: Client,
    llm: LLMClient,
    *,
    user_id: str,
    target_id: str,
    jd_text: str,
    final_url: str,
    payload: OptimizedPayload,
    is_new: bool,
) -> None:
    """Derive profile-from-JD, append the reference JD, re-merge, then fit score.

    Runs as a ``BackgroundTask`` for both the new-target and matched
    (corpus-building) URL flows. ``is_new`` controls whether the profile
    version is bumped — matched targets bump so lazy re-scoring picks up
    the newly-merged profile; brand-new targets stay at version 1. On
    failure (or timeout) the target flips to ``error``.
    """
    try:
        async with asyncio.timeout(DERIVATION_TIMEOUT_S):
            derived, derive_result = await derive_profile_from_jd(llm, jd_text=jd_text)
            cost_log.record(
                supabase,
                user_id=user_id,
                purpose=DERIVE_JD_PURPOSE,
                result=derive_result,
                metadata={"user_id": user_id, "jd_url": final_url},
            )

            crud.add_reference_jd(
                supabase,
                target_id=target_id,
                jd_text=jd_text,
                jd_url=final_url,
                extracted_profile=derived.scoring_profile,
            )
            all_jds = crud.list_reference_jds(supabase, target_id)
            composite = (
                merge_profiles([jd.extracted_profile for jd in all_jds])
                if all_jds
                else ScoringProfile()
            )

            current = crud.get(supabase, target_id)
            next_version = (
                (current.profile_version + 1)
                if (not is_new and current is not None)
                else None
            )
            updated = crud.update(
                supabase,
                target_id,
                TargetUpdate(
                    scoring_profile=composite,
                    search_keywords=derived.search_keywords,
                    profile_version=next_version,
                    activation_status="idle",
                ),
            )
            target = updated or current
            if target is None:
                logger.error("Target %s vanished during deferred URL derive", target_id)
                return
            await _apply_fit_score(
                supabase, llm, user_id=user_id, target=target, payload=payload
            )
    except TimeoutError:
        logger.error(
            "Deferred URL-target derivation timed out after %ss for target %s",
            DERIVATION_TIMEOUT_S,
            target_id,
        )
        crud.update(supabase, target_id, TargetUpdate(activation_status="error"))
    except Exception:
        logger.exception("Deferred URL-target derivation failed for target %s", target_id)
        crud.update(supabase, target_id, TargetUpdate(activation_status="error"))


# ---- Inline create-or-link orchestration -----------------------------------


async def from_manual(
    supabase: Client,
    llm: LLMClient,
    background_tasks: BackgroundTasks,
    *,
    user_id: str,
    label: str,
    description: str | None,
    payload: OptimizedPayload,
) -> CreateOrLinkResult:
    """Manual flow: user-typed title + description.

    Inline (fast): LLM-normalize the input, match against existing
    targets, and link the user. Deferred (BackgroundTask): derive the
    scoring profile (new targets) and the per-user fit score.

    1. LLM normalizes input into a canonical ``TargetSuggestion``
    2. Match against existing targets
    3. If matched, link the user; defer the fit score
    4. If new, create in ``deriving`` status, link, defer profile + fit score
    """
    suggestion, norm_result = await normalize_manual_input(
        llm, label=label, description=description, payload=payload
    )
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=NORMALIZE_PURPOSE,
        result=norm_result,
        metadata={"user_id": user_id, "raw_label": label},
    )

    matched = find_matching_target(supabase, suggestion.label)
    if matched is not None:
        link = crud.link_user_to_target(
            supabase, user_id=user_id, target_id=matched.id, is_active=False
        )
        background_tasks.add_task(
            _apply_fit_score,
            supabase,
            llm,
            user_id=user_id,
            target=matched,
            payload=payload,
        )
        return CreateOrLinkResult(user_target=link, target=matched, was_matched=True)

    # New target: create immediately in "deriving" so it appears in the
    # list with a pending indicator while the background task derives the
    # scoring profile + fit score.
    target = crud.create(
        supabase,
        payload=TargetCreate(
            label=suggestion.label,
            description=suggestion.description,
        ),
    )
    target = crud.update(supabase, target.id, TargetUpdate(activation_status="deriving")) or target
    link = crud.link_user_to_target(supabase, user_id=user_id, target_id=target.id, is_active=False)
    background_tasks.add_task(
        derive_manual_target_bg,
        supabase,
        llm,
        user_id=user_id,
        target_id=target.id,
        label=suggestion.label,
        payload=payload,
    )
    return CreateOrLinkResult(user_target=link, target=target, was_matched=False)


async def from_url(
    supabase: Client,
    llm: LLMClient,
    background_tasks: BackgroundTasks,
    *,
    user_id: str,
    final_url: str,
    extracted_title: str | None,
    jd_text: str,
    label_override: str | None,
    payload: OptimizedPayload,
) -> CreateOrLinkResult:
    """URL flow: validated URL + already-fetched JD.

    Matching keys off the resolved label (not the JD-derived profile), so
    duplicate detection runs inline without any LLM call. The profile
    derivation + merge + fit score are all deferred to a BackgroundTask.
    """
    label = (
        (label_override or "").strip() or (extracted_title or "").strip() or "Untitled Target"
    )[:200]

    matched = find_matching_target(supabase, label)
    if matched is not None:
        link = crud.link_user_to_target(
            supabase, user_id=user_id, target_id=matched.id, is_active=False
        )
        background_tasks.add_task(
            derive_url_target_bg,
            supabase,
            llm,
            user_id=user_id,
            target_id=matched.id,
            jd_text=jd_text,
            final_url=final_url,
            payload=payload,
            is_new=False,
        )
        return CreateOrLinkResult(user_target=link, target=matched, was_matched=True)

    target = crud.create(supabase, payload=TargetCreate(label=label))
    target = crud.update(supabase, target.id, TargetUpdate(activation_status="deriving")) or target
    link = crud.link_user_to_target(supabase, user_id=user_id, target_id=target.id, is_active=False)
    background_tasks.add_task(
        derive_url_target_bg,
        supabase,
        llm,
        user_id=user_id,
        target_id=target.id,
        jd_text=jd_text,
        final_url=final_url,
        payload=payload,
        is_new=True,
    )
    return CreateOrLinkResult(user_target=link, target=target, was_matched=False)
