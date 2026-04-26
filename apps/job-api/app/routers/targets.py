"""Targets router (#495).

CRUD for job targets + reference JD management. Adding a reference JD
triggers LLM-powered profile derivation and merges the result into the
target's composite scoring profile.
"""

import logging
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.dependencies import get_llm_client, get_supabase, verify_api_key_or_session
from app.models.targets import (
    JobTarget,
    ReferenceJDAdd,
    ScoringProfile,
    TargetCreate,
    TargetReferenceJD,
    TargetSuggestions,
    TargetUpdate,
)
from app.services.experience import optimized
from app.services.llm import cost_log
from app.services.llm.client import LLMClient
from app.services.scoring import strip_html
from app.services.targets import crud
from app.services.targets.derive_profile import DEFAULT_PURPOSE, derive_profile_from_jd
from app.services.targets.merge import merge_profiles
from app.services.targets.suggest import (
    DEFAULT_PURPOSE as SUGGEST_PURPOSE,
    suggest_targets,
)
from app.services.validate import validate_job_url

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/targets",
    tags=["targets"],
    dependencies=[Depends(verify_api_key_or_session)],
)


# ---- Target CRUD -----------------------------------------------------------


@router.post("")
async def create_target(
    body: TargetCreate,
    supabase: Client = Depends(get_supabase),
) -> JobTarget:
    return crud.create(supabase, user_id=None, payload=body)


@router.get("")
async def list_targets(
    supabase: Client = Depends(get_supabase),
) -> dict[str, list[JobTarget]]:
    targets = crud.list_all(supabase, user_id=None)
    return {"targets": targets}


@router.post("/suggest")
async def suggest(
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
) -> TargetSuggestions:
    """Suggest 2-3 targets from the user's OptimizedDoc."""
    doc = optimized.get_latest(supabase, user_id=None)
    if doc is None:
        raise HTTPException(status_code=404, detail="No experience profile found")

    suggestions, result = await suggest_targets(llm, payload=doc.payload)
    cost_log.record(
        supabase,
        user_id=None,
        purpose=SUGGEST_PURPOSE,
        result=result,
        metadata={},
    )
    return suggestions


@router.get("/active")
async def get_active_target(
    supabase: Client = Depends(get_supabase),
) -> JobTarget | dict[str, None]:
    target = crud.get_active(supabase, user_id=None)
    if target is None:
        return {"target": None}
    return target


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
    supabase: Client = Depends(get_supabase),
) -> JobTarget:
    target = crud.set_active(supabase, user_id=None, target_id=target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return target


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
    target = crud.create(
        supabase, user_id=None, payload=TargetCreate(label=title)
    )

    # Derive scoring profile from description if substantial
    jd_text = strip_html(description_html)
    if len(jd_text) >= 50:
        try:
            extracted_profile, result = await derive_profile_from_jd(
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
                extracted_profile=extracted_profile,
            )

            # Update target with the derived profile
            crud.update(
                supabase,
                target.id,
                TargetUpdate(scoring_profile=extracted_profile),
            )
        except Exception:
            logger.exception(
                "Profile derivation failed for posting %s", posting_id
            )

    # Activate the target
    activated = crud.set_active(
        supabase, user_id=None, target_id=target.id
    )
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
    extracted_profile, result = await derive_profile_from_jd(
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
        extracted_profile=extracted_profile,
    )

    # Merge all reference JD profiles into composite
    all_ref_jds = crud.list_reference_jds(supabase, target_id)
    composite = merge_profiles([jd.extracted_profile for jd in all_ref_jds])

    # Update target with merged profile
    updated = crud.update(
        supabase,
        target_id,
        TargetUpdate(scoring_profile=composite),
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
