from datetime import UTC, datetime
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.cache import job_list_cache, jobs_cache_prefix
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
    """Return ``{status, target_id}`` for the posting only if the caller is
    linked (via ``user_targets``) to at least one target that has scored
    this posting. 404 on either missing or unowned — don't leak existence
    of postings outside the user's targets.

    Ownership is derived through the ``scores`` table (the poller writes
    ``scores`` rows keyed by ``(job_posting_id, target_id)``). The
    ``jobs.target_id`` column is **not** populated by the poller — it's
    a vestigial pre-shared-targets column — so checking it as the source
    of truth always 404s on real postings.
    """
    # 1. Confirm the posting exists.
    posting_resp = (
        supabase.table("jobs")
        .select("status")
        .eq("id", posting_id)
        .single()
        .execute()
    )
    if not posting_resp.data:
        raise HTTPException(status_code=404, detail="Posting not found")
    posting = cast(dict[str, Any], posting_resp.data)

    # 2. Get the caller's active+inactive target ids (auth boundary, not a
    # filter — the user can act on jobs even from a deactivated target).
    user_targets_resp = (
        supabase.table("user_targets")
        .select("target_id")
        .eq("user_id", user_id)
        .execute()
    )
    user_target_ids = {
        cast(dict[str, Any], r)["target_id"]
        for r in user_targets_resp.data or []
    }
    if not user_target_ids:
        raise HTTPException(status_code=404, detail="Posting not found")

    # 3. Confirm at least one of the user's targets has a score row for
    # this posting. If so, the user is allowed to mutate its status.
    score_resp = (
        supabase.table("scores")
        .select("target_id")
        .eq("job_posting_id", posting_id)
        .in_("target_id", list(user_target_ids))
        .limit(1)
        .execute()
    )
    rows = cast(list[dict[str, Any]], score_resp.data or [])
    if not rows:
        raise HTTPException(status_code=404, detail="Posting not found")

    # Surface the owning target_id so callers can scope cache invalidation
    # to it (same shape the old query exposed via ``jobs.target_id``).
    posting["target_id"] = rows[0]["target_id"]
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
    target_id = posting["target_id"]

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

    # Scoped invalidation: a single posting status change only affects the
    # owning target's cached pages and the global view. Sibling targets'
    # cached pages stay warm.
    job_list_cache.invalidate(prefix=f"{jobs_cache_prefix(target_id=target_id)}:")
    job_list_cache.invalidate(prefix=f"{jobs_cache_prefix(target_id=None)}:")
    return {"success": True, "old_status": old_status, "new_status": body.status}
