"""Targets router (#495).

CRUD for job targets + reference JD management. Adding a reference JD
triggers LLM-powered profile derivation and merges the result into the
target's composite scoring profile.
"""

import asyncio
import logging
from typing import Any, cast

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from postgrest.types import CountMethod
from supabase import Client

from app.dependencies import get_llm_client, get_supabase, verify_api_key_or_session
from app.models.targets import (
    JobTarget,
    MatchedSuggestions,
    ReferenceJDAdd,
    ScoringProfile,
    TargetCreate,
    TargetReferenceJD,
    TargetSuggestions,
    TargetUpdate,
    UserTargetWithTarget,
)
from app.models.schemas import PollResult
from app.services.experience import optimized
from app.services.llm import cost_log
from app.services.llm.client import LLMClient
from app.services.poller import poll_sources_for_target
from app.services.scoring import strip_html
from app.services.targets import crud
from app.services.targets.derive_profile import DEFAULT_PURPOSE, derive_profile_from_jd
from app.services.targets.derive_profile_from_label import (
    DEFAULT_PURPOSE as DERIVE_LABEL_PURPOSE,
    derive_profile_from_label,
)
from app.services.targets.merge import merge_profiles
from app.services.targets.match import suggest_and_match
from app.services.targets.suggest import DEFAULT_PURPOSE as SUGGEST_PURPOSE
from app.services.validate import validate_job_url

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/targets",
    tags=["targets"],
    dependencies=[Depends(verify_api_key_or_session)],
)


# ---- Background pipeline for activation ------------------------------------


async def _activate_pipeline(
    supabase: Client, llm: LLMClient, target: JobTarget
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
            doc = optimized.get_latest(supabase, user_id=None)
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
                user_id=None,
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
        crud.update(
            supabase, target_id, TargetUpdate(activation_status="ready")
        )
    except Exception:
        logger.exception("Activation pipeline failed for target %s", target_id)
        crud.update(
            supabase, target_id, TargetUpdate(activation_status="error")
        )


# ---- Target CRUD -----------------------------------------------------------


@router.post("")
async def create_target(
    body: TargetCreate,
    supabase: Client = Depends(get_supabase),
) -> JobTarget:
    return crud.create(supabase, payload=body)


@router.get("")
async def list_targets(
    supabase: Client = Depends(get_supabase),
) -> dict[str, list[JobTarget]]:
    targets = crud.list_all(supabase)
    return {"targets": targets}


@router.post("/suggest")
async def suggest(
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
) -> MatchedSuggestions:
    """Suggest 2-3 targets, matched against existing targets.

    Returns each suggestion paired with its matched target (if one exists)
    or flagged as new. Excludes targets the user already has.
    """
    doc = optimized.get_latest(supabase, user_id=None)
    if doc is None:
        raise HTTPException(status_code=404, detail="No experience profile found")

    user_id = "__system__"
    matched, result = await suggest_and_match(
        supabase, llm, payload=doc.payload, user_id=user_id
    )
    cost_log.record(
        supabase,
        user_id=None,
        purpose=SUGGEST_PURPOSE,
        result=result,
        metadata={"user_id": user_id},
    )
    return matched


@router.get("/active")
async def get_active_targets(
    supabase: Client = Depends(get_supabase),
) -> dict[str, list[JobTarget]]:
    targets = crud.get_active(supabase)
    return {"targets": targets}


@router.get("/mine")
async def get_my_targets(
    supabase: Client = Depends(get_supabase),
) -> dict[str, list[UserTargetWithTarget]]:
    """Return the current user's linked targets with fit scores.

    Uses sentinel user_id '__system__' until multi-user auth is wired up.
    """
    user_id = "__system__"
    items = crud.list_user_targets_with_targets(supabase, user_id)
    return {"targets": items}


@router.get("/{target_id}")
async def get_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> JobTarget:
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return target


@router.patch("/{target_id}")
async def update_target(
    target_id: str,
    body: TargetUpdate,
    supabase: Client = Depends(get_supabase),
) -> JobTarget:
    target = crud.update(supabase, target_id, body)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return target


@router.post("/{target_id}/activate")
async def activate_target(
    target_id: str,
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
) -> JobTarget:
    target = crud.set_active(supabase, target_id=target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    background_tasks.add_task(
        _activate_pipeline, supabase, llm, target
    )
    return target


@router.post("/{target_id}/deactivate")
async def deactivate_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> JobTarget:
    target = crud.set_inactive(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return target


@router.post("/{target_id}/derive-profile")
async def derive_target_profile(
    target_id: str,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
) -> JobTarget:
    """Derive a scoring profile + search keywords from the target label + user experience."""
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    doc = optimized.get_latest(supabase, user_id=None)
    if doc is None:
        raise HTTPException(status_code=404, detail="No experience profile found")

    derived, result = await derive_profile_from_label(
        llm, label=target.label, payload=doc.payload
    )
    cost_log.record(
        supabase,
        user_id=None,
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
        ),
    )
    if updated is None:
        raise HTTPException(status_code=500, detail="Failed to update target")
    return updated


@router.post("/{target_id}/poll-jobs")
async def poll_jobs_for_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> PollResult:
    """Poll all job sources, filtering for jobs matching this target's search keywords."""
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    if not target.search_keywords:
        raise HTTPException(
            status_code=422,
            detail="Target has no search keywords — derive a profile first",
        )
    return await poll_sources_for_target(supabase, target)


@router.get("/{target_id}/status")
async def get_target_status(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Return activation status and job count for a target."""
    target = crud.get(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    count_resp = (
        supabase.table("job_target_scores")
        .select("id", count=CountMethod.exact)
        .eq("target_id", target_id)
        .execute()
    )
    jobs_count = count_resp.count or 0

    return {
        "activation_status": target.activation_status,
        "jobs_count": jobs_count,
    }


@router.delete("/{target_id}")
async def delete_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> dict[str, bool]:
    deleted = crud.delete(supabase, target_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Target not found")
    return {"deleted": True}


# ---- Create from job posting -----------------------------------------------


@router.post("/from-posting/{posting_id}")
async def create_target_from_posting(
    posting_id: str,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
) -> JobTarget:
    """Create a target from an existing job posting.

    Reads the posting's title and description, creates a target, derives a
    scoring profile from the description via LLM, stores the JD as a
    reference, and activates the target.
    """
    resp = (
        supabase.table("job_postings")
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
                user_id=None,
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
                ),
            )
        except Exception:
            logger.exception(
                "Profile derivation failed for posting %s", posting_id
            )

    # Activate the target
    activated = crud.set_active(supabase, target_id=target.id)
    return activated or target


# ---- Reference JDs ---------------------------------------------------------


@router.post("/{target_id}/reference-jds")
async def add_reference_jd(
    target_id: str,
    body: ReferenceJDAdd,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
) -> JobTarget:
    """Add a reference JD, derive a scoring profile via LLM, and merge."""
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

    # Derive profile from JD via LLM
    derived, result = await derive_profile_from_jd(
        llm, jd_text=body.jd_text
    )
    cost_log.record(
        supabase,
        user_id=None,
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

    # Update target with merged profile + search keywords from latest derivation
    updated = crud.update(
        supabase,
        target_id,
        TargetUpdate(
            scoring_profile=composite,
            search_keywords=derived.search_keywords,
        ),
    )
    if updated is None:
        raise HTTPException(status_code=500, detail="Failed to update target profile")
    return updated


@router.get("/{target_id}/reference-jds")
async def list_reference_jds(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> dict[str, list[TargetReferenceJD]]:
    ref_jds = crud.list_reference_jds(supabase, target_id)
    return {"reference_jds": ref_jds}


@router.delete("/{target_id}/reference-jds/{ref_jd_id}")
async def delete_reference_jd(
    target_id: str,
    ref_jd_id: str,
    supabase: Client = Depends(get_supabase),
) -> JobTarget:
    """Delete a reference JD and re-merge the remaining profiles."""
    deleted = crud.delete_reference_jd(supabase, ref_jd_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Reference JD not found")

    # Re-merge remaining profiles
    remaining = crud.list_reference_jds(supabase, target_id)
    if remaining:
        composite = merge_profiles([jd.extracted_profile for jd in remaining])
    else:
        composite = ScoringProfile()

    updated = crud.update(
        supabase,
        target_id,
        TargetUpdate(scoring_profile=composite),
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return updated
