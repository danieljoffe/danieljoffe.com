from datetime import UTC, datetime
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.cache import job_list_cache
from app.dependencies import (
    get_current_user_id,
    get_supabase,
    verify_supabase_jwt,
)
from app.models.schemas import StatusUpdate

# `verify_supabase_jwt` (not `_or_jwt`): status mutations are user actions,
# never invoked by cron. Keeping the api-key fallback would let a leaked
# operator key alter any user's job status.
router = APIRouter(
    prefix="/jobs",
    tags=["status"],
    dependencies=[Depends(verify_supabase_jwt)],
)


def _assert_user_owns_posting(
    supabase: Client, posting_id: str, user_id: str
) -> dict[str, Any]:
    """Return the posting row only if the caller is linked (via user_targets)
    to the target the posting belongs to. 404 on either missing or unowned —
    don't leak existence of postings outside the user's targets.
    """
    posting_resp = (
        supabase.table("jobs")
        .select("status, target_id")
        .eq("id", posting_id)
        .single()
        .execute()
    )
    if not posting_resp.data:
        raise HTTPException(status_code=404, detail="Posting not found")
    posting = cast(dict[str, Any], posting_resp.data)
    target_id = posting.get("target_id")
    if not target_id:
        # Pre-shared-targets postings without a target — unreachable through
        # the multi-tenant UI; treat as not-found rather than implicit-allow.
        raise HTTPException(status_code=404, detail="Posting not found")
    link = (
        supabase.table("user_targets")
        .select("target_id")
        .eq("user_id", user_id)
        .eq("target_id", target_id)
        .limit(1)
        .execute()
    )
    if not link.data:
        raise HTTPException(status_code=404, detail="Posting not found")
    return posting


@router.get("/{posting_id}/status-history")
async def get_status_history(
    posting_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    _assert_user_owns_posting(supabase, posting_id, user_id)
    result = (
        supabase.table("status_log")
        .select("id, old_status, new_status, note, created_at")
        .eq("posting_id", posting_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"entries": result.data or []}


@router.post("/{posting_id}/status")
async def update_status(
    posting_id: str,
    body: StatusUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    posting = _assert_user_owns_posting(supabase, posting_id, user_id)
    old_status = posting["status"]

    supabase.table("status_log").insert(
        {
            "posting_id": posting_id,
            "old_status": old_status,
            "new_status": body.status,
            "note": body.note,
        }
    ).execute()

    supabase.table("jobs").update(
        {
            "status": body.status,
            "updated_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", posting_id).execute()

    job_list_cache.invalidate()
    return {"success": True, "old_status": old_status, "new_status": body.status}
