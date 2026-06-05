"""Targets router (#495).

CRUD for job targets + reference JD management. Adding a reference JD
triggers LLM-powered profile derivation and merges the result into the
target's composite scoring profile.
"""

import asyncio
import logging
from typing import Any, cast

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from postgrest.types import CountMethod
from supabase import Client

from app.cache import job_list_cache, jobs_cache_prefix
from app.dependencies import (
    enforce_llm_budget,
    get_current_user_id,
    get_current_user_id_optional,
    get_llm_client,
    get_supabase,
    verify_api_key,
    verify_api_key_or_jwt,
)
from app.http_client import ResponseTooLargeError, get_with_size_cap
from app.models.diagnostics import TargetFunnelResponse
from app.models.schemas import PollResult
from app.models.targets import (
    AxisWeights,
    CreateOrLinkResult,
    DeleteResponse,
    JobTarget,
    MatchedSuggestions,
    MyTargetsListResponse,
    ReferenceJDAdd,
    ReferenceJDsListResponse,
    ScoringProfile,
    TargetCreate,
    TargetFromManual,
    TargetFromUrl,
    TargetsListResponse,
    TargetStatusResponse,
    TargetUpdate,
    UserTarget,
    UserTargetWithTarget,
)
from app.services.diagnostics.funnel import compute_target_funnel
from app.services.experience import optimized
from app.services.extract import (
    ExtractionResult,
    _extract_from_firecrawl,
    extract_job_from_html,
)
from app.services.llm import cost_log
from app.services.llm.client import LLMClient
from app.services.poller import poll_sources_for_target
from app.services.scoring import strip_html
from app.services.source_discovery import (
    DiscoveryRunStats,
    run_discovery_for_target,
)
from app.services.target_scoring import score_title_and_upsert
from app.services.targets import crud, from_input
from app.services.targets.derive_profile import DEFAULT_PURPOSE, derive_profile_from_jd
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
from app.services.targets.lateral_discovery import (
    DEFAULT_PURPOSE as LATERAL_PURPOSE,
)
from app.services.targets.lateral_discovery import (
    LateralSuggestions,
    suggest_lateral_targets,
)
from app.services.targets.match import suggest_and_match
from app.services.targets.merge import merge_profiles
from app.services.targets.suggest import DEFAULT_PURPOSE as SUGGEST_PURPOSE
from app.services.validate import assert_safe_host, validate_job_url

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/targets",
    tags=["targets"],
    dependencies=[Depends(verify_api_key_or_jwt)],
)


# ---- Background pipeline for activation ------------------------------------


_RETRO_SCORE_BATCH = 500


def _retro_score_existing_jobs(supabase: Client, target: JobTarget) -> int:
    """Stage-1 score every posting in the ``jobs`` table against ``target``.

    Used during target activation so jobs that pre-date the target still
    appear under it in the UI. Iterates in batches of ``_RETRO_SCORE_BATCH``
    so we never load the full job table into memory at once.
    ``score_title_and_upsert`` returns ``None`` for jobs whose titles don't
    match any keyword — those create no row. The return value is the
    number of jobs we actually wrote a score row for, useful for log/UI
    diagnostics on "ready but jobs_count=0".
    """
    written = 0
    offset = 0
    while True:
        resp = (
            supabase.table("jobs")
            .select("id, title")
            .range(offset, offset + _RETRO_SCORE_BATCH - 1)
            .execute()
        )
        rows = cast(list[dict[str, Any]], resp.data or [])
        if not rows:
            break
        for row in rows:
            result = score_title_and_upsert(
                supabase,
                job_posting_id=row["id"],
                title=row["title"],
                target=target,
            )
            if result is not None:
                written += 1
        if len(rows) < _RETRO_SCORE_BATCH:
            break
        offset += _RETRO_SCORE_BATCH
    return written


async def _activate_pipeline(
    supabase: Client, llm: LLMClient, target: JobTarget, user_id: str
) -> None:
    """Derive profile (if needed) then poll jobs for a target. Runs as BackgroundTask."""
    target_id = target.id
    needs_derive = not target.search_keywords or not target.scoring_profile.categories

    try:
        if needs_derive:
            # Step 1: derive profile + search keywords from label
            crud.update(
                supabase, target_id, TargetUpdate(activation_status="deriving")
            )
            doc = optimized.get_latest(supabase, user_id=user_id)
            if doc is None:
                logger.warning("No OptimizedDoc for target %s — skipping derive", target_id)
                crud.update(
                    supabase, target_id, TargetUpdate(activation_status="error")
                )
                return

            derived, result = await derive_profile_from_label(
                llm, label=target.label, payload=doc.payload
            )
            cost_log.record(
                supabase,
                user_id=user_id,
                purpose=DERIVE_LABEL_PURPOSE,
                result=result,
                metadata={"target_id": target_id, "trigger": "activation"},
            )
            updated = crud.update(
                supabase,
                target_id,
                TargetUpdate(
                    scoring_profile=derived.scoring_profile,
                    search_keywords=derived.search_keywords,
                    example_promising_titles=derived.example_promising_titles,
                    example_unpromising_titles=derived.example_unpromising_titles,
                    # Slim shape — populated when the LLM emits them (new
                    # prompt); silently dropped when None (legacy /
                    # cached old-prompt responses).
                    description=derived.description,
                    seniority_hint=derived.seniority_hint,
                    domain_hints=derived.domain_hints or None,
                ),
            )
            if updated is None:
                logger.error("Failed to update target %s after derive", target_id)
                return
            target = updated

        # Step 2: poll jobs using the target's search keywords
        crud.update(
            supabase, target_id, TargetUpdate(activation_status="polling")
        )
        poll_result = await poll_sources_for_target(supabase, target)
        logger.info(
            "Activation pipeline for target %s: %d sources, %d new jobs",
            target_id,
            poll_result.sources_polled,
            poll_result.new_jobs,
        )

        # Step 3: retro-score every existing posting against the new target.
        # The poller stage-1-scores jobs at insert time, so anything that
        # existed before this target activated had no scores row for it —
        # the /jobs page filtered by this target would otherwise be empty
        # even when there are plenty of matching titles already in the
        # database. ``score_title_and_upsert`` returns ``None`` (no row
        # written) when no keywords match, so this only creates rows where
        # the title actually scores against the new profile.
        retro_scored = await asyncio.to_thread(
            _retro_score_existing_jobs, supabase, target
        )
        logger.info(
            "Activation pipeline for target %s: retro-scored %d existing jobs",
            target_id,
            retro_scored,
        )

        crud.update(
            supabase, target_id, TargetUpdate(activation_status="ready")
        )
    except Exception:
        logger.exception("Activation pipeline failed for target %s", target_id)
        crud.update(
            supabase, target_id, TargetUpdate(activation_status="error")
        )


# ---- Target CRUD -----------------------------------------------------------


@router.post("", response_model=JobTarget, status_code=201)
async def create_target(
    body: TargetCreate,
    supabase: Client = Depends(get_supabase),
) -> JobTarget:
    return crud.create(supabase, payload=body)


@router.post(
    "/from-manual",
    response_model=CreateOrLinkResult,
    status_code=201,
    dependencies=[Depends(enforce_llm_budget)],
)
async def create_target_from_manual(
    body: TargetFromManual,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str = Depends(get_current_user_id),
) -> CreateOrLinkResult:
    """Create-or-link a target from user-typed title + description.

    LLM normalizes the input into a canonical ``TargetSuggestion``, matches
    against existing targets, and either links the user to the match or
    creates a new target (with a profile derived from label + experience)
    and links the user. The user always ends up with a ``user_targets`` row.
    """
    doc = optimized.get_latest(supabase, user_id=user_id)
    if doc is None:
        # 422 (Unprocessable Entity): the route exists and the request is
        # well-formed, but a business precondition (an experience profile
        # to derive against) isn't met. 404 was misleading — it implied
        # the endpoint didn't exist, and the UI couldn't distinguish from
        # a genuine misrouted call.
        raise HTTPException(
            status_code=422,
            detail="No experience profile found — complete onboarding first",
        )
    return await from_input.from_manual(
        supabase,
        llm,
        user_id=user_id,
        label=body.label,
        description=body.description,
        payload=doc.payload,
    )


@router.post(
    "/from-url",
    response_model=CreateOrLinkResult,
    status_code=201,
    dependencies=[Depends(enforce_llm_budget)],
)
async def create_target_from_url(
    body: TargetFromUrl,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str = Depends(get_current_user_id),
) -> CreateOrLinkResult:
    """Create-or-link a target from a JD URL.

    Validates and fetches the URL, extracts title + JD text, derives a
    scoring profile via LLM, then matches against existing targets. On
    match the JD is appended as a reference and the composite profile is
    re-merged (corpus building); on no match a new target is created. The
    user is always linked.
    """
    doc = optimized.get_latest(supabase, user_id=user_id)
    if doc is None:
        # Precondition (profile exists) not met — see /from-manual for rationale.
        raise HTTPException(
            status_code=422,
            detail="No experience profile found — complete onboarding first",
        )

    vr = await validate_job_url(body.jd_url)
    if not vr.is_valid:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid JD URL: {vr.rejection_reason}",
        )
    final_url = vr.final_url

    extracted_title, jd_text = await _fetch_jd_from_url(final_url)

    return await from_input.from_url(
        supabase,
        llm,
        user_id=user_id,
        final_url=final_url,
        extracted_title=extracted_title,
        jd_text=jd_text,
        label_override=body.label,
        payload=doc.payload,
    )


@router.get("", response_model=TargetsListResponse)
def list_targets(
    supabase: Client = Depends(get_supabase),
) -> TargetsListResponse:
    targets = crud.list_all(supabase)
    return TargetsListResponse(targets=targets)


@router.post(
    "/suggest",
    response_model=MatchedSuggestions,
    dependencies=[Depends(enforce_llm_budget)],
)
async def suggest(
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str = Depends(get_current_user_id),
) -> MatchedSuggestions:
    """Suggest 2-3 targets, matched against existing targets.

    Returns each suggestion paired with its matched target (if one exists)
    or flagged as new. Excludes targets the user already has.
    """
    doc = optimized.get_latest(supabase, user_id=user_id)
    if doc is None:
        # Precondition (profile exists) not met — see /from-manual for rationale.
        raise HTTPException(status_code=422, detail="No experience profile found")

    matched, result = await suggest_and_match(
        supabase, llm, payload=doc.payload, user_id=user_id
    )
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=SUGGEST_PURPOSE,
        result=result,
        metadata={"user_id": user_id},
    )
    return matched


@router.post(
    "/suggest-lateral",
    response_model=LateralSuggestions,
    dependencies=[Depends(enforce_llm_budget)],
)
async def suggest_lateral(
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str = Depends(get_current_user_id),
) -> LateralSuggestions:
    """Mine the master payload for adjacent target roles.

    Distinct from ``POST /targets/suggest`` (the onboarding flow): this
    one returns LATERAL siblings of targets the user is ALREADY
    pursuing. Spans industries, includes at least one career-stretch.
    See ``services.targets.lateral_discovery.suggest_lateral_targets``.

    Each suggestion is a slim-shape-compatible label + reasoning +
    confidence; the activation flow plugs them into
    ``derive_profile_from_label`` to materialise the full target.
    """
    doc = optimized.get_latest(supabase, user_id=user_id)
    if doc is None:
        raise HTTPException(status_code=422, detail="No experience profile found")

    # Use the user's CURRENT active targets as the exclusion list so we
    # don't re-suggest what they already have. list_for_user is
    # user-scoped (via user_targets junction), not the global active
    # list — exactly what we want for personalised suggestions.
    current = crud.list_for_user(supabase, user_id=user_id)

    suggestions, result = await suggest_lateral_targets(
        llm, payload=doc.payload, current_targets=current
    )
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=LATERAL_PURPOSE,
        result=result,
        metadata={
            "user_id": user_id,
            "current_targets_count": len(current),
            "suggestions_count": len(suggestions.suggestions),
        },
    )
    return suggestions


@router.get("/active", response_model=TargetsListResponse)
def get_active_targets(
    supabase: Client = Depends(get_supabase),
) -> TargetsListResponse:
    targets = crud.get_active(supabase)
    return TargetsListResponse(targets=targets)


@router.get("/mine", response_model=MyTargetsListResponse)
def get_my_targets(
    supabase: Client = Depends(get_supabase),
    user_id: str = Depends(get_current_user_id),
) -> MyTargetsListResponse:
    """Return the current user's linked targets with fit scores."""
    items = crud.list_user_targets_with_targets(supabase, user_id)
    return MyTargetsListResponse(targets=items)


@router.get("/{target_id}", response_model=JobTarget)
def get_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> JobTarget:
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return target


@router.get("/{target_id}/user-target", response_model=UserTargetWithTarget)
def get_my_user_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
    user_id: str = Depends(get_current_user_id),
) -> UserTargetWithTarget:
    """Return the current user's user_targets row for a specific target,
    paired with the shared target data.

    Saves the FE from fetching the entire ``/mine`` list just to find one
    row when rendering a per-target settings page. JWT-only (no api-key
    fallback) because there is no "current user" without a JWT.
    """
    ut = crud.get_user_target(supabase, user_id, target_id)
    if ut is None:
        raise HTTPException(
            status_code=404,
            detail="No user_targets row for (user, target).",
        )
    target = crud.get(supabase, target_id)
    if target is None:
        # user_targets row exists but the shared target was deleted —
        # data integrity issue, surface as a 404 not a 500.
        raise HTTPException(status_code=404, detail="Target not found")
    return UserTargetWithTarget(user_target=ut, target=target)


@router.patch("/{target_id}", response_model=JobTarget)
def update_target(
    target_id: str,
    body: TargetUpdate,
    supabase: Client = Depends(get_supabase),
) -> JobTarget:
    target = crud.update(supabase, target_id, body)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return target


@router.post(
    "/{target_id}/activate",
    response_model=JobTarget,
    dependencies=[Depends(enforce_llm_budget)],
)
async def activate_target(
    target_id: str,
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str = Depends(get_current_user_id),
) -> JobTarget:
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    try:
        crud.link_user_to_target(
            supabase, user_id=user_id, target_id=target_id, is_active=True
        )
    except crud.ActiveTargetLimitError as e:
        # 409 Conflict — the request was well-formed but conflicts with
        # current state (the user is already at the active-target cap).
        # Frontend reads ``error`` to switch on this case specifically and
        # offers a deactivate picker rather than a generic toast.
        raise HTTPException(
            status_code=409,
            detail={
                "error": "ACTIVE_LIMIT",
                "limit": e.limit,
                "active_count": e.current_count,
                "message": (
                    f"You already have {e.current_count} active targets "
                    f"(limit {e.limit}) — deactivate one first."
                ),
            },
        ) from e
    refreshed = crud.get(supabase, target_id) or target

    background_tasks.add_task(
        _activate_pipeline, supabase, llm, refreshed, user_id
    )
    return refreshed


@router.post(
    "/{target_id}/discover-sources",
    response_model=DiscoveryRunStats,
)
async def discover_sources_for_target_endpoint(
    target_id: str,
    supabase: Client = Depends(get_supabase),
    user_id: str = Depends(get_current_user_id),
) -> DiscoveryRunStats:
    """Trigger Brave-Search-driven source discovery for one target.

    Synchronous on the request (no BackgroundTask) so the caller gets the
    actual stats back in the response. A full run for a target with 15
    keywords × 6 ATS site filters issues up to 90 Brave queries plus one
    detect_ats call per result URL; in practice it takes 30–90 seconds.
    Acceptable for an operator-triggered endpoint — when we wire this to
    cron, we'll move it to a BackgroundTask path.

    Caller must own the target (JWT path enforces user_id; the read-by-id
    confirms the target exists). Cron-style bulk discovery across all
    active targets isn't exposed here yet — separate follow-up PR.
    """
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    # Verify the caller is linked to this target. Discovery is target-driven
    # so it's only meaningful for the user's own targets — and we don't want
    # to let a JWT caller burn the global Brave quota on someone else's
    # search keywords.
    if target_id not in crud.get_user_target_ids(supabase, user_id):
        raise HTTPException(
            status_code=403, detail="Target is not linked to this user"
        )

    return await run_discovery_for_target(supabase, target)


@router.post("/{target_id}/deactivate", response_model=JobTarget)
async def deactivate_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
    user_id: str = Depends(get_current_user_id),
) -> JobTarget:
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    crud.set_user_target_inactive(
        supabase, user_id=user_id, target_id=target_id
    )
    return crud.get(supabase, target_id) or target


# ---- Axis weights (PR E follow-up) ----------------------------------------
#
# Per-(user, target) read-time multipliers for the four Phase 2 axes.
# See plan-wyrdfold-streamlined-target.md "User-tunable axis weights".
#
# - PATCH /targets/{id}/axis-weights — set new weights; snapshots prior
#   into axis_weights_previous so /undo can revert in one click.
# - POST  /targets/{id}/axis-weights/undo — swap current ↔ previous.
# - DELETE /targets/{id}/axis-weights — reset to defaults (NULL); also
#   snapshots, so undo recovers the prior custom weights.


@router.patch("/{target_id}/axis-weights", response_model=UserTarget)
async def set_axis_weights(
    target_id: str,
    weights: AxisWeights,
    supabase: Client = Depends(get_supabase),
    user_id: str = Depends(get_current_user_id),
) -> UserTarget:
    """Set the user's per-target axis weights.

    Snapshots the prior value into ``axis_weights_previous`` so the
    /undo endpoint can revert. Pure read-time math — does NOT trigger
    any re-grade; existing scores rows are unchanged.
    """
    updated = crud.set_user_target_axis_weights(
        supabase,
        user_id=user_id,
        target_id=target_id,
        weights=weights,
    )
    if updated is None:
        raise HTTPException(
            status_code=404,
            detail="No user_targets row for (user, target). Link the target first.",
        )
    _invalidate_jobs_cache_for_target(target_id)
    return updated


@router.delete("/{target_id}/axis-weights", response_model=UserTarget)
async def reset_axis_weights(
    target_id: str,
    supabase: Client = Depends(get_supabase),
    user_id: str = Depends(get_current_user_id),
) -> UserTarget:
    """Reset axis_weights to defaults (NULL — equal quartile).

    Same snapshot behaviour as PATCH: the prior custom weights move to
    ``axis_weights_previous`` so /undo can put them back. "Reset" and
    "undo" cancel each other out in one round-trip.
    """
    updated = crud.set_user_target_axis_weights(
        supabase,
        user_id=user_id,
        target_id=target_id,
        weights=None,
    )
    if updated is None:
        raise HTTPException(
            status_code=404,
            detail="No user_targets row for (user, target). Link the target first.",
        )
    _invalidate_jobs_cache_for_target(target_id)
    return updated


@router.post("/{target_id}/axis-weights/undo", response_model=UserTarget)
async def undo_axis_weights(
    target_id: str,
    supabase: Client = Depends(get_supabase),
    user_id: str = Depends(get_current_user_id),
) -> UserTarget:
    """Swap ``axis_weights`` and ``axis_weights_previous``.

    The button-press behind the safety-design's "Undo last change". Two
    consecutive undos toggle back and forth — that's the intended
    contract (undo, then change-my-mind-and-redo).
    """
    updated = crud.undo_user_target_axis_weights(
        supabase, user_id=user_id, target_id=target_id
    )
    if updated is None:
        raise HTTPException(
            status_code=404,
            detail="No user_targets row for (user, target).",
        )
    _invalidate_jobs_cache_for_target(target_id)
    return updated


def _invalidate_jobs_cache_for_target(target_id: str) -> None:
    """Bust the jobs list cache for this target plus the untargeted view.

    The untargeted view ("global") merges scores across the user's targets,
    so a weight change on any one target can shift its displayed scores.
    Sibling targets are untouched.
    """
    job_list_cache.invalidate(prefix=jobs_cache_prefix(target_id=target_id))
    job_list_cache.invalidate(prefix=jobs_cache_prefix(target_id=None))


@router.post(
    "/{target_id}/link",
    response_model=UserTarget,
    status_code=201,
    dependencies=[Depends(enforce_llm_budget)],
)
async def link_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str = Depends(get_current_user_id),
) -> UserTarget:
    """Link the current user to a target and derive a fit score."""
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    # Derive fit score if we have an experience profile
    fit_score: int | None = None
    fit_reasoning: str | None = None
    doc = optimized.get_latest(supabase, user_id=user_id)
    if doc is not None:
        fit_result, result = await derive_fit_score(
            llm, payload=doc.payload, target=target
        )
        cost_log.record(
            supabase,
            user_id=user_id,
            purpose=FIT_SCORE_PURPOSE,
            result=result,
            metadata={"target_id": target_id, "user_id": user_id},
        )
        fit_score = fit_result.fit_score
        fit_reasoning = fit_result.reasoning

    try:
        return crud.link_user_to_target(
            supabase,
            user_id=user_id,
            target_id=target_id,
            fit_score=fit_score,
            fit_score_reasoning=fit_reasoning,
        )
    except crud.ActiveTargetLimitError as e:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "ACTIVE_LIMIT",
                "limit": e.limit,
                "active_count": e.current_count,
                "message": (
                    f"You already have {e.current_count} active targets "
                    f"(limit {e.limit}) — deactivate one first."
                ),
            },
        ) from e


@router.post(
    "/{target_id}/derive-profile",
    response_model=JobTarget,
    dependencies=[Depends(enforce_llm_budget)],
)
async def derive_target_profile(
    target_id: str,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> JobTarget:
    """Derive a scoring profile + search keywords from the target label + user experience."""
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    doc = optimized.get_latest(supabase, user_id=user_id)
    if doc is None:
        # Precondition (profile exists) not met — see /from-manual for rationale.
        raise HTTPException(status_code=422, detail="No experience profile found")

    derived, result = await derive_profile_from_label(
        llm, label=target.label, payload=doc.payload
    )
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=DERIVE_LABEL_PURPOSE,
        result=result,
        metadata={"target_id": target_id},
    )

    updated = crud.update(
        supabase,
        target_id,
        TargetUpdate(
            scoring_profile=derived.scoring_profile,
            search_keywords=derived.search_keywords,
            example_promising_titles=derived.example_promising_titles,
            example_unpromising_titles=derived.example_unpromising_titles,
            description=derived.description,
            seniority_hint=derived.seniority_hint,
            domain_hints=derived.domain_hints or None,
            profile_version=target.profile_version + 1,
        ),
    )
    if updated is None:
        raise HTTPException(status_code=500, detail="Failed to update target")
    return updated


@router.post(
    "/{target_id}/poll-jobs",
    response_model=PollResult,
    dependencies=[Depends(verify_api_key)],
)
async def poll_jobs_for_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> PollResult:
    """Poll all job sources, filtering for jobs matching this target's search keywords.

    Admin / operator-only: gated by ``verify_api_key`` so an
    unauthenticated caller can't trigger a fan-out poll across all
    configured ATS sources. Not reachable from the wyrdfold FE.
    """
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    if not target.search_keywords:
        raise HTTPException(
            status_code=422,
            detail="Target has no search keywords — derive a profile first",
        )
    return await poll_sources_for_target(supabase, target)


@router.get("/{target_id}/status", response_model=TargetStatusResponse)
async def get_target_status(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> TargetStatusResponse:
    """Return activation status and job count for a target."""
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    # Filter ``excluded=False`` so this count matches what the user
    # actually sees in /jobs?target_id=... — the list endpoint hides
    # rows the scorer flagged as excluded (negative-keyword matches),
    # but this endpoint was previously counting all of them. Result:
    # a "ready, 3 jobs scored" status that landed the user on a list
    # showing 1, with the other 2 silently filtered out for being
    # off-target.
    count_resp = (
        supabase.table("scores")
        .select("id", count=CountMethod.exact)
        .eq("target_id", target_id)
        .eq("excluded", False)
        .execute()
    )
    jobs_count = count_resp.count or 0

    return TargetStatusResponse(
        activation_status=target.activation_status,
        jobs_count=jobs_count,
    )


@router.get(
    "/{target_id}/funnel",
    response_model=TargetFunnelResponse,
    dependencies=[Depends(verify_api_key)],
)
async def get_target_funnel(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> TargetFunnelResponse:
    """Diagnostic funnel report for one target (#845).

    API-key-only — the response includes per-user list floors and the
    target's scoring profile, which is operator-facing data, not user
    surface. Read-only.
    """
    try:
        return compute_target_funnel(supabase, target_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{target_id}", response_model=DeleteResponse)
async def delete_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> DeleteResponse:
    deleted = crud.delete(supabase, target_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Target not found")
    return DeleteResponse(deleted=True)


# ---- Create from job posting -----------------------------------------------


@router.post(
    "/from-posting/{posting_id}",
    response_model=JobTarget,
    status_code=201,
    dependencies=[Depends(enforce_llm_budget)],
)
async def create_target_from_posting(
    posting_id: str,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> JobTarget:
    """Create a target from an existing job posting.

    Reads the posting's title and description, creates a target, derives a
    scoring profile from the description via LLM, stores the JD as a
    reference, and activates the target.
    """
    resp = (
        supabase.table("jobs")
        .select("id, title, description_html, absolute_url")
        .eq("id", posting_id)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise HTTPException(status_code=404, detail="Job posting not found")

    posting = rows[0]
    title = posting.get("title") or "Untitled Role"
    description_html: str = posting.get("description_html") or ""
    absolute_url: str | None = posting.get("absolute_url")

    # Create the target
    target = crud.create(supabase, payload=TargetCreate(label=title))

    # Derive scoring profile from description if substantial
    jd_text = strip_html(description_html)
    if len(jd_text) >= 50:
        try:
            derived, result = await derive_profile_from_jd(
                llm, jd_text=jd_text
            )
            cost_log.record(
                supabase,
                user_id=user_id,
                purpose=DEFAULT_PURPOSE,
                result=result,
                metadata={
                    "target_id": target.id,
                    "posting_id": posting_id,
                    "jd_url": absolute_url or "",
                },
            )

            crud.add_reference_jd(
                supabase,
                target_id=target.id,
                jd_text=jd_text,
                jd_url=absolute_url,
                extracted_profile=derived.scoring_profile,
            )

            # Update target with the derived profile + search keywords
            crud.update(
                supabase,
                target.id,
                TargetUpdate(
                    scoring_profile=derived.scoring_profile,
                    search_keywords=derived.search_keywords,
                    example_promising_titles=derived.example_promising_titles,
                    example_unpromising_titles=derived.example_unpromising_titles,
                ),
            )
        except Exception:
            logger.exception(
                "Profile derivation failed for posting %s", posting_id
            )

    # Link the calling user to the new target (multi-user flow) so it
    # actually shows up in ``/targets/mine``. Without this insert, the
    # onboarding "I have a resume and a role in mind" path completes
    # with "All set!" but the user lands on a dashboard with zero
    # targets — the catalog row is created and globally active, but
    # ``user_targets`` was never populated, so every per-user view is
    # empty. ``set_active`` only updates the catalog flag; the DB
    # trigger on ``user_targets`` is what keeps that in sync for
    # real users. Fall back to the legacy ``set_active`` for api-key
    # (cron) callers where ``user_id is None`` — they don't have a
    # user identity to link.
    if user_id is not None:
        try:
            crud.link_user_to_target(
                supabase, user_id=user_id, target_id=target.id, is_active=True
            )
        except crud.ActiveTargetLimitError as e:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "ACTIVE_LIMIT",
                    "limit": e.limit,
                    "active_count": e.current_count,
                    "message": (
                        f"You already have {e.current_count} active targets "
                        f"(limit {e.limit}) — deactivate one first."
                    ),
                },
            ) from e
        # Re-read the target row so the response carries the
        # trigger-synced ``is_active``.
        refreshed = crud.get(supabase, target.id)
        return refreshed or target
    activated = crud.set_active(supabase, target_id=target.id)
    return activated or target


# ---- Reference JDs ---------------------------------------------------------


async def _fetch_jd_from_url(url: str) -> tuple[str | None, str]:
    """Fetch a JD page and run the extraction cascade (JSON-LD → meta → Firecrawl).

    Returns ``(title, jd_text)``. The title comes from the same extraction
    pipeline and may be ``None`` if no JSON-LD/meta tag was present.

    Raises ``HTTPException`` if the fetch fails or no usable description can
    be extracted. The minimum-length requirement matches ``ReferenceJDAdd``
    so the downstream LLM has enough signal to derive a profile.

    SSRF defense: re-resolve the hostname inside this function as a TOCTOU
    safety net. ``validate_job_url`` already ran upstream, but the upstream
    check resolves DNS once and we connect a few milliseconds later — a
    rebind in that window would slip through without this re-check.
    """
    from urllib.parse import urlparse

    hostname = urlparse(url).hostname or ""
    try:
        assert_safe_host(hostname)
    except ValueError as exc:
        raise HTTPException(
            status_code=422, detail=f"Refusing to fetch JD URL: {exc}"
        ) from exc

    # Size-capped streaming fetch — without this, a user-pasted URL
    # pointing to a huge payload could OOM the API (the shared
    # client's 15s timeout doesn't help against fast CDNs).
    try:
        resp, body_bytes = await get_with_size_cap(url)
        final_url = str(resp.url)
    except ResponseTooLargeError as exc:
        raise HTTPException(
            status_code=413,
            detail=f"JD page too large to fetch ({exc.size} bytes > {exc.limit}).",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=400, detail="Failed to fetch JD URL") from exc

    final_hostname = urlparse(final_url).hostname or ""
    if final_hostname and final_hostname != hostname:
        try:
            assert_safe_host(final_hostname)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Refusing to fetch JD URL after redirect: {exc}",
            ) from exc

    # The stream was consumed by ``get_with_size_cap`` so ``resp.text``
    # is empty here; decode the bytes the helper returned.
    html = (
        body_bytes.decode("utf-8", errors="replace")
        if resp.status_code == 200
        else ""
    )
    extraction: ExtractionResult
    if html:
        extraction = extract_job_from_html(html, final_url)
    else:
        extraction = ExtractionResult(tier="none", warnings=["fetch_non_200"])

    if extraction.tier == "none" or len(extraction.description_html or "") < 50:
        fc = await _extract_from_firecrawl(final_url)
        if fc.tier != "none" and len(fc.description_html or "") >= len(
            extraction.description_html or ""
        ):
            extraction = fc

    jd_text = extraction.description_html or ""
    if len(jd_text) < 50:
        raise HTTPException(
            status_code=422,
            detail=(
                "Could not extract a job description from that URL. "
                "Try pasting the JD text directly."
            ),
        )
    return extraction.title, jd_text


@router.post(
    "/{target_id}/reference-jds",
    response_model=JobTarget,
    status_code=201,
    dependencies=[Depends(enforce_llm_budget)],
)
async def add_reference_jd(
    target_id: str,
    body: ReferenceJDAdd,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> JobTarget:
    """Add a reference JD, derive a scoring profile via LLM, and merge.

    Accepts either ``jd_text`` (>=50 chars) or ``jd_url``. When only the URL
    is provided, the server fetches the page and extracts JD text via the
    same cascade used by ``POST /jobs/manual`` (JSON-LD → meta tags →
    Firecrawl).
    """
    # Verify target exists
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    # Validate JD URL if provided (#496)
    if body.jd_url:
        vr = await validate_job_url(body.jd_url)
        if not vr.is_valid:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid JD URL: {vr.rejection_reason}",
            )
        body.jd_url = vr.final_url

    # If no jd_text, fetch + extract from the URL
    if not body.jd_text:
        if not body.jd_url:
            raise HTTPException(
                status_code=422, detail="Either jd_text or jd_url is required"
            )
        _, body.jd_text = await _fetch_jd_from_url(body.jd_url)

    # Derive profile from JD via LLM
    derived, result = await derive_profile_from_jd(
        llm, jd_text=body.jd_text
    )
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=DEFAULT_PURPOSE,
        result=result,
        metadata={"target_id": target_id, "jd_url": body.jd_url or ""},
    )

    # Store the reference JD
    crud.add_reference_jd(
        supabase,
        target_id=target_id,
        jd_text=body.jd_text,
        jd_url=body.jd_url,
        extracted_profile=derived.scoring_profile,
    )

    # Merge all reference JD profiles into composite
    all_ref_jds = crud.list_reference_jds(supabase, target_id)
    composite = merge_profiles([jd.extracted_profile for jd in all_ref_jds])

    # Update target with merged profile + search keywords, bump version for re-scoring.
    # Example title pools come from the LATEST JD only — these are concrete
    # examples not weighted aggregates, and merging across JDs would dilute
    # the few-shot signal. The latest JD overwrites; pools stay coherent.
    updated = crud.update(
        supabase,
        target_id,
        TargetUpdate(
            scoring_profile=composite,
            search_keywords=derived.search_keywords,
            example_promising_titles=derived.example_promising_titles,
            example_unpromising_titles=derived.example_unpromising_titles,
            profile_version=target.profile_version + 1,
        ),
    )
    if updated is None:
        raise HTTPException(status_code=500, detail="Failed to update target profile")
    return updated


@router.get("/{target_id}/reference-jds", response_model=ReferenceJDsListResponse)
async def list_reference_jds(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> ReferenceJDsListResponse:
    ref_jds = crud.list_reference_jds(supabase, target_id)
    return ReferenceJDsListResponse(reference_jds=ref_jds)


@router.delete(
    "/{target_id}/reference-jds/{ref_jd_id}",
    response_model=JobTarget,
)
async def delete_reference_jd(
    target_id: str,
    ref_jd_id: str,
    supabase: Client = Depends(get_supabase),
) -> JobTarget:
    """Delete a reference JD and re-merge the remaining profiles."""
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    deleted = crud.delete_reference_jd(supabase, ref_jd_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Reference JD not found")

    # Re-merge remaining profiles
    remaining = crud.list_reference_jds(supabase, target_id)
    if remaining:
        composite = merge_profiles([jd.extracted_profile for jd in remaining])
    else:
        composite = ScoringProfile()

    # Bump profile_version so lazy re-scoring picks up the change
    updated = crud.update(
        supabase,
        target_id,
        TargetUpdate(
            scoring_profile=composite,
            profile_version=target.profile_version + 1,
        ),
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return updated
