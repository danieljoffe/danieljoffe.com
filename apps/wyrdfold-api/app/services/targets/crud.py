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
    ScoringProfile,
    TargetCreate,
    TargetReferenceJD,
    TargetUpdate,
    UserTarget,
    UserTargetWithTarget,
)

TARGETS_TABLE = "targets"
USER_TARGETS_TABLE = "user_targets"
REF_JDS_TABLE = "reference_jds"


def _parse_target(row: dict[str, Any]) -> JobTarget:
    """Parse a raw Supabase row into a JobTarget, handling JSONB fields."""
    # PostgREST returns pgvector columns as either a list of floats or a
    # ``[0.1,0.2,...]`` string depending on the encoder. Normalize both
    # shapes to list[float] | None so callers can treat it uniformly.
    raw_embed = row.get("label_embedding")
    embedding: list[float] | None
    if raw_embed is None:
        embedding = None
    elif isinstance(raw_embed, list):
        embedding = [float(x) for x in raw_embed]
    elif isinstance(raw_embed, str):
        stripped = raw_embed.strip().lstrip("[").rstrip("]")
        embedding = [float(x) for x in stripped.split(",") if x.strip()] if stripped else None
    else:
        embedding = None

    return JobTarget(
        id=row["id"],
        label=row["label"],
        description=row.get("description"),
        normalized_label=row.get("normalized_label"),
        scoring_profile=ScoringProfile.model_validate(row.get("scoring_profile") or {}),
        search_keywords=row.get("search_keywords") or [],
        activation_status=row.get("activation_status") or "idle",
        profile_version=row.get("profile_version", 1),
        is_active=row["is_active"],
        label_embedding=embedding,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _parse_user_target(row: dict[str, Any]) -> UserTarget:
    """Parse a raw Supabase row into a UserTarget."""
    return UserTarget(
        id=row["id"],
        user_id=row["user_id"],
        target_id=row["target_id"],
        is_active=row["is_active"],
        fit_score=row.get("fit_score"),
        fit_score_reasoning=row.get("fit_score_reasoning"),
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


def create(supabase: Client, payload: TargetCreate) -> JobTarget:
    normalized = payload.label.lower().strip()
    row: dict[str, Any] = {
        "label": payload.label,
        "description": payload.description,
        "normalized_label": normalized,
        "scoring_profile": payload.scoring_profile.model_dump(),
        "search_keywords": payload.search_keywords,
    }
    resp = supabase.table(TARGETS_TABLE).insert(row).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to insert targets row")
    return _parse_target(rows[0])


def get(supabase: Client, target_id: str) -> JobTarget | None:
    resp = (
        supabase.table(TARGETS_TABLE).select("*").eq("id", target_id).execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return _parse_target(rows[0]) if rows else None


def list_all(supabase: Client) -> list[JobTarget]:
    """Return all targets, ordered by creation date."""
    resp = (
        supabase.table(TARGETS_TABLE)
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return [_parse_target(cast(dict[str, Any], r)) for r in (resp.data or [])]


def get_active(supabase: Client) -> list[JobTarget]:
    """Return all globally active targets (active for any user).

    The trigger on user_targets maintains targets.is_active, so this
    query works without joining user_targets.
    """
    resp = (
        supabase.table(TARGETS_TABLE)
        .select("*")
        .eq("is_active", True)
        .execute()
    )
    return [_parse_target(cast(dict[str, Any], r)) for r in (resp.data or [])]


def update(
    supabase: Client, target_id: str, payload: TargetUpdate
) -> JobTarget | None:
    updates: dict[str, Any] = {"updated_at": datetime.now(UTC).isoformat()}
    if payload.label is not None:
        updates["label"] = payload.label
        updates["normalized_label"] = payload.label.lower().strip()
    if payload.description is not None:
        updates["description"] = payload.description
    if payload.scoring_profile is not None:
        updates["scoring_profile"] = payload.scoring_profile.model_dump()
    if payload.search_keywords is not None:
        updates["search_keywords"] = payload.search_keywords
    if payload.activation_status is not None:
        updates["activation_status"] = payload.activation_status
    if payload.is_active is not None:
        updates["is_active"] = payload.is_active
    if payload.profile_version is not None:
        updates["profile_version"] = payload.profile_version

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


def set_active(supabase: Client, target_id: str) -> JobTarget | None:
    """Directly set targets.is_active = True.

    Prefer link_user_to_target() for multi-user flows — the DB trigger
    will keep is_active in sync. This is kept for single-user / system use.
    """
    resp = (
        supabase.table(TARGETS_TABLE)
        .update({"is_active": True, "updated_at": datetime.now(UTC).isoformat()})
        .eq("id", target_id)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return _parse_target(rows[0]) if rows else None


def set_inactive(supabase: Client, target_id: str) -> JobTarget | None:
    """Directly set targets.is_active = False.

    Prefer unlink/deactivate via user_targets for multi-user flows.
    """
    resp = (
        supabase.table(TARGETS_TABLE)
        .update({"is_active": False, "updated_at": datetime.now(UTC).isoformat()})
        .eq("id", target_id)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return _parse_target(rows[0]) if rows else None


# ---- User-scoped target queries ----------------------------------------------


def list_for_user(supabase: Client, user_id: str) -> list[JobTarget]:
    """Return all targets a user is linked to, ordered by creation date."""
    ut_resp = (
        supabase.table(USER_TARGETS_TABLE)
        .select("target_id")
        .eq("user_id", user_id)
        .execute()
    )
    ut_rows = cast(list[dict[str, Any]], ut_resp.data or [])
    target_ids = [r["target_id"] for r in ut_rows]
    if not target_ids:
        return []

    resp = (
        supabase.table(TARGETS_TABLE)
        .select("*")
        .in_("id", target_ids)
        .order("created_at", desc=True)
        .execute()
    )
    return [_parse_target(cast(dict[str, Any], r)) for r in (resp.data or [])]


def get_active_for_user(supabase: Client, user_id: str) -> list[JobTarget]:
    """Return targets a user has active (is_active=True in user_targets)."""
    ut_resp = (
        supabase.table(USER_TARGETS_TABLE)
        .select("target_id")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
    )
    ut_rows = cast(list[dict[str, Any]], ut_resp.data or [])
    target_ids = [r["target_id"] for r in ut_rows]
    if not target_ids:
        return []

    resp = (
        supabase.table(TARGETS_TABLE)
        .select("*")
        .in_("id", target_ids)
        .execute()
    )
    return [_parse_target(cast(dict[str, Any], r)) for r in (resp.data or [])]


def get_user_target_ids(supabase: Client, user_id: str) -> set[str]:
    """Return the set of target IDs a user is linked to (any status)."""
    resp = (
        supabase.table(USER_TARGETS_TABLE)
        .select("target_id")
        .eq("user_id", user_id)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return {r["target_id"] for r in rows}


def list_user_targets_with_targets(
    supabase: Client, user_id: str
) -> list[UserTargetWithTarget]:
    """Return a user's targets paired with their junction data (fit score)."""
    ut_resp = (
        supabase.table(USER_TARGETS_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    ut_rows = cast(list[dict[str, Any]], ut_resp.data or [])
    if not ut_rows:
        return []

    target_ids = [r["target_id"] for r in ut_rows]
    t_resp = (
        supabase.table(TARGETS_TABLE)
        .select("*")
        .in_("id", target_ids)
        .execute()
    )
    targets_by_id = {
        cast(dict[str, Any], r)["id"]: _parse_target(cast(dict[str, Any], r))
        for r in (t_resp.data or [])
    }

    results: list[UserTargetWithTarget] = []
    for ut_row in ut_rows:
        target = targets_by_id.get(ut_row["target_id"])
        if target is None:
            continue
        results.append(
            UserTargetWithTarget(
                user_target=_parse_user_target(ut_row),
                target=target,
            )
        )
    return results


# ---- User-Target junction CRUD ----------------------------------------------


MAX_ACTIVE_TARGETS_PER_USER = 5
"""Per-user cap on simultaneously active targets.

Caps fan-out of the upcoming LLM scoring pipeline (Phase 1/2 spend
scales with active targets) and keeps a single user from scattering
attention across a long list of marginal targets. Inactive targets are
not counted — a user can keep arbitrarily many as "saved searches" they
cycle between.
"""


class ActiveTargetLimitError(Exception):
    """Raised when activating a target would exceed the per-user cap."""

    def __init__(self, current_count: int, limit: int) -> None:
        self.current_count = current_count
        self.limit = limit
        super().__init__(
            f"Active target limit ({limit}) reached; currently {current_count} active"
        )


def count_active_for_user(supabase: Client, user_id: str) -> int:
    """Return the number of user_targets rows with ``is_active=True`` for this user."""
    resp = (
        supabase.table(USER_TARGETS_TABLE)
        .select("id", count="exact")  # type: ignore[arg-type]
        .eq("user_id", user_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return resp.count or 0


def link_user_to_target(
    supabase: Client,
    *,
    user_id: str,
    target_id: str,
    is_active: bool = True,
    fit_score: int | None = None,
    fit_score_reasoning: str | None = None,
    enforce_active_limit: bool = True,
) -> UserTarget:
    """Link a user to a target (upsert). The DB trigger syncs targets.is_active.

    Raises ``ActiveTargetLimitError`` when ``is_active=True`` would push
    the user above ``MAX_ACTIVE_TARGETS_PER_USER`` — but ONLY when this
    call introduces a new active link. Re-upserting an already-active
    link (e.g., refreshing fit_score on a row the user already has
    active) is exempt because no net change happens.

    Pass ``enforce_active_limit=False`` for internal callers that need
    to bypass the cap — e.g., a future migration backfilling
    user_targets rows from a different source.
    """
    if is_active and enforce_active_limit:
        # Determine whether this upsert will INCREASE the active count
        # or just refresh an already-active row. Skip the count check
        # for the latter to keep idempotent updates free.
        existing_resp = (
            supabase.table(USER_TARGETS_TABLE)
            .select("is_active")
            .eq("user_id", user_id)
            .eq("target_id", target_id)
            .limit(1)
            .execute()
        )
        existing = cast(list[dict[str, Any]], existing_resp.data or [])
        already_active = bool(existing and existing[0].get("is_active"))
        if not already_active:
            current = count_active_for_user(supabase, user_id)
            if current >= MAX_ACTIVE_TARGETS_PER_USER:
                raise ActiveTargetLimitError(current, MAX_ACTIVE_TARGETS_PER_USER)

    row: dict[str, Any] = {
        "user_id": user_id,
        "target_id": target_id,
        "is_active": is_active,
        "updated_at": datetime.now(UTC).isoformat(),
    }
    if fit_score is not None:
        row["fit_score"] = fit_score
    if fit_score_reasoning is not None:
        row["fit_score_reasoning"] = fit_score_reasoning

    resp = (
        supabase.table(USER_TARGETS_TABLE)
        .upsert(row, on_conflict="user_id,target_id")
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to upsert user_targets row")
    return _parse_user_target(rows[0])


def unlink_user_from_target(
    supabase: Client, user_id: str, target_id: str
) -> bool:
    """Remove a user–target link. The DB trigger will deactivate the target
    if no other users have it active."""
    resp = (
        supabase.table(USER_TARGETS_TABLE)
        .delete()
        .eq("user_id", user_id)
        .eq("target_id", target_id)
        .execute()
    )
    return bool(resp.data)


def get_user_target(
    supabase: Client, user_id: str, target_id: str
) -> UserTarget | None:
    """Get a specific user–target link."""
    resp = (
        supabase.table(USER_TARGETS_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .eq("target_id", target_id)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return _parse_user_target(rows[0]) if rows else None


def list_user_targets(supabase: Client, user_id: str) -> list[UserTarget]:
    """Return all targets linked to a user."""
    resp = (
        supabase.table(USER_TARGETS_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_parse_user_target(cast(dict[str, Any], r)) for r in (resp.data or [])]


def set_user_target_active(
    supabase: Client, user_id: str, target_id: str
) -> UserTarget | None:
    """Activate a user's link to a target. The DB trigger syncs targets.is_active."""
    resp = (
        supabase.table(USER_TARGETS_TABLE)
        .update({"is_active": True, "updated_at": datetime.now(UTC).isoformat()})
        .eq("user_id", user_id)
        .eq("target_id", target_id)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return _parse_user_target(rows[0]) if rows else None


def set_user_target_inactive(
    supabase: Client, user_id: str, target_id: str
) -> UserTarget | None:
    """Deactivate a user's link to a target. The DB trigger syncs targets.is_active."""
    resp = (
        supabase.table(USER_TARGETS_TABLE)
        .update({"is_active": False, "updated_at": datetime.now(UTC).isoformat()})
        .eq("user_id", user_id)
        .eq("target_id", target_id)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return _parse_user_target(rows[0]) if rows else None


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
        raise RuntimeError("Failed to insert reference_jds row")
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
