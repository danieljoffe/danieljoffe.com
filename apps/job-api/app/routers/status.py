from datetime import UTC, datetime
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.dependencies import get_supabase, verify_api_key_or_session
from app.models.schemas import StatusUpdate

VALID_STATUSES = {"new", "saved", "applied", "rejected", "archived"}

router = APIRouter(
    prefix="/jobs",
    tags=["status"],
    dependencies=[Depends(verify_api_key_or_session)],
)


@router.post("/{posting_id}/status")
async def update_status(
    posting_id: str,
    body: StatusUpdate,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {VALID_STATUSES}",
        )

    current = (
        supabase.table("job_postings")
        .select("status")
        .eq("id", posting_id)
        .single()
        .execute()
    )
    if not current.data:
        raise HTTPException(status_code=404, detail="Posting not found")

    row = cast(dict[str, Any], current.data)
    old_status = row["status"]

    supabase.table("job_status_log").insert(
        {
            "posting_id": posting_id,
            "old_status": old_status,
            "new_status": body.status,
            "note": body.note,
        }
    ).execute()

    supabase.table("job_postings").update(
        {
            "status": body.status,
            "updated_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", posting_id).execute()

    return {"success": True, "old_status": old_status, "new_status": body.status}
