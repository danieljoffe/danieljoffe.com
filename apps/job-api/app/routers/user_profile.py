"""User profile router — notification preferences."""

import asyncio
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.dependencies import get_supabase, verify_api_key_or_session
from app.models.user_profile import NotificationPreferences, NotificationPreferencesUpdate

router = APIRouter(
    prefix="/profile",
    tags=["profile"],
    dependencies=[Depends(verify_api_key_or_session)],
)

# Columns we read / allow writing
_PREFS_COLUMNS = (
    "job_notifications_enabled, job_score_threshold,"
    " sms_notifications_enabled, sms_score_threshold,"
    " sms_daily_limit, phone_number, email"
)


async def _get_or_create_profile(supabase: Client) -> dict[str, Any]:
    """Return the first user_profiles row, creating one if none exists."""
    resp = await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .select(_PREFS_COLUMNS)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if rows:
        return cast(dict[str, Any], rows[0])

    # Single-user tool — create a default row
    insert = await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .insert({})
        .execute()
    )
    if not insert.data:
        raise HTTPException(status_code=500, detail="Failed to create profile")
    # Re-fetch to get column defaults
    resp2 = await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .select(_PREFS_COLUMNS)
        .limit(1)
        .execute()
    )
    return cast(dict[str, Any], (resp2.data or [{}])[0])


@router.get("/notifications")
async def get_notification_preferences(
    supabase: Client = Depends(get_supabase),
) -> NotificationPreferences:
    row = await _get_or_create_profile(supabase)
    return NotificationPreferences(**row)


@router.patch("/notifications")
async def update_notification_preferences(
    body: NotificationPreferencesUpdate,
    supabase: Client = Depends(get_supabase),
) -> NotificationPreferences:
    profile = await _get_or_create_profile(supabase)

    # Only send non-None fields
    updates = body.model_dump(exclude_none=True)
    if not updates:
        return NotificationPreferences(**profile)

    # We need the profile id for the update
    id_resp = await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .select("id")
        .limit(1)
        .execute()
    )
    profile_id = cast(dict[str, Any], (id_resp.data or [{}])[0]).get("id")
    if not profile_id:
        raise HTTPException(status_code=404, detail="Profile not found")

    await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .update(updates)
        .eq("id", profile_id)
        .execute()
    )

    # Return updated state
    merged = {**profile, **updates}
    return NotificationPreferences(**merged)
