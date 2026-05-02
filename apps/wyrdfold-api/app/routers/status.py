from datetime import UTC, datetime
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.cache import job_list_cache
from app.dependencies import get_supabase, verify_api_key_or_jwt
from app.models.schemas import StatusUpdate

router = APIRouter(
    prefix="/jobs",
    tags=["status"],
    dependencies=[Depends(verify_api_key_or_jwt)],
)


@router.get("/{posting_id}/status-history")
async def get_status_history(
    posting_id: str,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
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
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    current = (
        supabase.table("jobs")
        .select("status")
        .eq("id", posting_id)
        .single()
        .execute()
    )
    if not current.data:
        raise HTTPException(status_code=404, detail="Posting not found")

    row = cast(dict[str, Any], current.data)
    old_status = row["status"]

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
