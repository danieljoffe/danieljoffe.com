"""Target CRUD operations against Supabase (#495).

All functions follow the same pattern as app/services/experience/prose.py:
thin wrappers over Supabase table operations that validate rows through
Pydantic models on the way out.
"""

from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.models.targets import (
    JobTarget,
    ResumeEmphasis,
    ScoringProfile,
    TargetCreate,
    TargetReferenceJD,
    TargetUpdate,
)

TARGETS_TABLE = "job_targets"
REF_JDS_TABLE = "target_reference_jds"


def _parse_target(row: dict[str, Any]) -> JobTarget:
    """Parse a raw Supabase row into a JobTarget, handling JSONB fields."""
    return JobTarget(
        id=row["id"],
        user_id=row.get("user_id"),
        label=row["label"],
        scoring_profile=ScoringProfile.model_validate(row.get("scoring_profile") or {}),
        resume_emphasis=ResumeEmphasis.model_validate(row.get("resume_emphasis") or {}),
        search_keywords=row.get("search_keywords") or [],
        activation_status=row.get("activation_status") or "idle",
        is_active=row["is_active"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _parse_ref_jd(row: dict[str, Any]) -> TargetReferenceJD:
    return TargetReferenceJD(
        id=row["id"],
        target_id=row["target_id"],
        jd_url=row.get("jd_url"),
        jd_text=row["jd_text"],
        extracted_profile=ScoringProfile.model_validate(
            row.get("extracted_profile") or {}
        ),
        created_at=row["created_at"],
    )


# ---- Target CRUD -----------------------------------------------------------


def create(supabase: Client, user_id: str | None, payload: TargetCreate) -> JobTarget:
    row: dict[str, Any] = {
        "user_id": user_id,
        "label": payload.label,
        "scoring_profile": payload.scoring_profile.model_dump(),
        "resume_emphasis": payload.resume_emphasis.model_dump(),
        "search_keywords": payload.search_keywords,
    }
    resp = supabase.table(TARGETS_TABLE).insert(row).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to insert job_targets row")
    return _parse_target(rows[0])


def get(supabase: Client, target_id: str) -> JobTarget | None:
    resp = (
        supabase.table(TARGETS_TABLE).select("*").eq("id", target_id).execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return _parse_target(rows[0]) if rows else None


def list_all(supabase: Client, user_id: str | None) -> list[JobTarget]:
    query = supabase.table(TARGETS_TABLE).select("*").order("created_at", desc=True)
    if user_id is not None:
        query = query.eq("user_id", user_id)
    else:
        query = query.is_("user_id", "null")
    resp = query.execute()
    return [_parse_target(cast(dict[str, Any], r)) for r in (resp.data or [])]


def get_active(supabase: Client, user_id: str | None) -> JobTarget | None:
    query = (
        supabase.table(TARGETS_TABLE)
        .select("*")
        .eq("is_active", True)
        .limit(1)
    )
    if user_id is not None:
        query = query.eq("user_id", user_id)
    else:
        query = query.is_("user_id", "null")
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    return _parse_target(rows[0]) if rows else None


def update(
    supabase: Client, target_id: str, payload: TargetUpdate
) -> JobTarget | None:
    updates: dict[str, Any] = {"updated_at": datetime.now(UTC).isoformat()}
    if payload.label is not None:
        updates["label"] = payload.label
    if payload.scoring_profile is not None:
        updates["scoring_profile"] = payload.scoring_profile.model_dump()
    if payload.resume_emphasis is not None:
        updates["resume_emphasis"] = payload.resume_emphasis.model_dump()
    if payload.search_keywords is not None:
        updates["search_keywords"] = payload.search_keywords
    if payload.activation_status is not None:
        updates["activation_status"] = payload.activation_status
    if payload.is_active is not None:
        updates["is_active"] = payload.is_active

    resp = (
        supabase.table(TARGETS_TABLE).update(updates).eq("id", target_id).execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return _parse_target(rows[0]) if rows else None


def delete(supabase: Client, target_id: str) -> bool:
    resp = (
        supabase.table(TARGETS_TABLE).delete().eq("id", target_id).execute()
    )
    return bool(resp.data)


def set_active(supabase: Client, user_id: str | None, target_id: str) -> JobTarget | None:
    """Deactivate all targets for this user, then activate the given one."""
    # Deactivate all
    deactivate_query = (
        supabase.table(TARGETS_TABLE)
        .update({"is_active": False, "updated_at": datetime.now(UTC).isoformat()})
    )
    if user_id is not None:
        deactivate_query = deactivate_query.eq("user_id", user_id)
    else:
        deactivate_query = deactivate_query.is_("user_id", "null")
    deactivate_query.execute()

    # Activate the target
    resp = (
        supabase.table(TARGETS_TABLE)
        .update({"is_active": True, "updated_at": datetime.now(UTC).isoformat()})
        .eq("id", target_id)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return _parse_target(rows[0]) if rows else None


# ---- Reference JD CRUD -----------------------------------------------------


def add_reference_jd(
    supabase: Client,
    target_id: str,
    jd_text: str,
    jd_url: str | None,
    extracted_profile: ScoringProfile,
) -> TargetReferenceJD:
    row = {
        "target_id": target_id,
        "jd_text": jd_text,
        "jd_url": jd_url,
        "extracted_profile": extracted_profile.model_dump(),
    }
    resp = supabase.table(REF_JDS_TABLE).insert(row).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to insert target_reference_jds row")
    return _parse_ref_jd(rows[0])


def list_reference_jds(
    supabase: Client, target_id: str
) -> list[TargetReferenceJD]:
    resp = (
        supabase.table(REF_JDS_TABLE)
        .select("*")
        .eq("target_id", target_id)
        .order("created_at")
        .execute()
    )
    return [_parse_ref_jd(cast(dict[str, Any], r)) for r in (resp.data or [])]


def delete_reference_jd(supabase: Client, ref_jd_id: str) -> bool:
    resp = (
        supabase.table(REF_JDS_TABLE).delete().eq("id", ref_jd_id).execute()
    )
    return bool(resp.data)
