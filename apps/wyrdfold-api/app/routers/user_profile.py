"""User profile router — notification preferences + identity (contact) fields."""

import asyncio
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.config import settings
from app.dependencies import get_supabase, verify_api_key_or_jwt
from app.models.user_profile import (
    IdentityFields,
    IdentityFieldsUpdate,
    NotificationPreferences,
    NotificationPreferencesUpdate,
)


def _email_channel_available() -> bool:
    """Email alerts require the FastAPI to call back into the Next.js
    app, which in turn calls Resend. NEXT_APP_URL + JOB_ALERT_SECRET are
    the prerequisites visible from this process; the Next.js BFF further
    AND-s this with its own RESEND_API_KEY check before returning.
    """
    return bool(settings.next_app_url and settings.job_alert_secret)


def _sms_channel_available() -> bool:
    return bool(
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_phone_number
    )

router = APIRouter(
    prefix="/profile",
    tags=["profile"],
    dependencies=[Depends(verify_api_key_or_jwt)],
)

# Columns we read / allow writing
_PREFS_COLUMNS = (
    "job_notifications_enabled, job_score_threshold,"
    " sms_notifications_enabled, sms_score_threshold,"
    " sms_daily_limit, phone_number, email"
)

_IDENTITY_COLUMNS = "name, email, phone_number, location, linkedin_url, website_url"


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
    return NotificationPreferences(
        **row,
        email_available=_email_channel_available(),
        sms_available=_sms_channel_available(),
    )


@router.patch("/notifications")
async def update_notification_preferences(
    body: NotificationPreferencesUpdate,
    supabase: Client = Depends(get_supabase),
) -> NotificationPreferences:
    if body.job_notifications_enabled is True and not _email_channel_available():
        raise HTTPException(
            status_code=400,
            detail="Email notifications are unavailable: the operator has not "
            "configured email provider credentials.",
        )
    if body.sms_notifications_enabled is True and not _sms_channel_available():
        raise HTTPException(
            status_code=400,
            detail="SMS notifications are unavailable: the operator has not "
            "configured Twilio credentials.",
        )

    profile = await _get_or_create_profile(supabase)

    # Only send non-None fields
    updates = body.model_dump(exclude_none=True)
    if not updates:
        return NotificationPreferences(
            **profile,
            email_available=_email_channel_available(),
            sms_available=_sms_channel_available(),
        )

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
    return NotificationPreferences(
        **merged,
        email_available=_email_channel_available(),
        sms_available=_sms_channel_available(),
    )


# ---------------------------------------------------------------------------
# Identity (contact info for resume / cover-letter generation, F3-A)
# ---------------------------------------------------------------------------


async def _get_or_create_identity(supabase: Client) -> dict[str, Any]:
    resp = await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .select(_IDENTITY_COLUMNS)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if rows:
        return cast(dict[str, Any], rows[0])

    # Single-user tool — create a default row
    insert = await asyncio.to_thread(
        lambda: supabase.table("user_profiles").insert({}).execute()
    )
    if not insert.data:
        raise HTTPException(status_code=500, detail="Failed to create profile")
    resp2 = await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .select(_IDENTITY_COLUMNS)
        .limit(1)
        .execute()
    )
    return cast(dict[str, Any], (resp2.data or [{}])[0])


@router.get("/identity")
async def get_identity(
    supabase: Client = Depends(get_supabase),
) -> IdentityFields:
    row = await _get_or_create_identity(supabase)
    return IdentityFields(**row)


@router.patch("/identity")
async def update_identity(
    body: IdentityFieldsUpdate,
    supabase: Client = Depends(get_supabase),
) -> IdentityFields:
    profile = await _get_or_create_identity(supabase)

    # Treat empty strings as explicit clears; None means "don't touch"
    updates = body.model_dump(exclude_none=True)
    for key, value in list(updates.items()):
        if isinstance(value, str) and value.strip() == "":
            updates[key] = None

    if not updates:
        return IdentityFields(**profile)

    id_resp = await asyncio.to_thread(
        lambda: supabase.table("user_profiles").select("id").limit(1).execute()
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

    merged = {**profile, **updates}
    return IdentityFields(**merged)
