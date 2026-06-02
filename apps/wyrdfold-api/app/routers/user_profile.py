"""User profile router — notification preferences + identity (contact) fields.

All endpoints scope to the JWT subject. The service-role Supabase client
bypasses RLS, so explicit `.eq("user_id", user_id)` is the only thing
preventing cross-tenant reads/writes.
"""

import asyncio
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.config import settings
from app.dependencies import (
    get_current_user_email,
    get_current_user_id,
    get_supabase,
    verify_supabase_jwt,
)
from app.models.user_profile import (
    IdentityFields,
    IdentityFieldsUpdate,
    NotificationPreferences,
    NotificationPreferencesUpdate,
    ResumeStyleSettings,
    ResumeStyleSettingsUpdate,
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

# `verify_supabase_jwt` (not `_or_jwt`) — profile data is per-user, never
# accessed by cron/poller. Restricting to JWT-only blocks the api-key
# fallback that would otherwise let a leaked operator key impersonate any
# user via this surface.
router = APIRouter(
    prefix="/profile",
    tags=["profile"],
    dependencies=[Depends(verify_supabase_jwt)],
)

# Columns we read / allow writing
_PREFS_COLUMNS = (
    "job_notifications_enabled, job_score_threshold,"
    " sms_notifications_enabled, sms_score_threshold,"
    " sms_daily_limit, list_min_score, phone_number, email"
)

_IDENTITY_COLUMNS = "name, email, phone_number, location, linkedin_url, website_url"

_RESUME_STYLE_COLUMNS = "resume_style_settings"


async def _get_or_create_profile(
    supabase: Client,
    user_id: str,
    columns: str,
    seed_email: str | None = None,
) -> dict[str, Any]:
    """Return the user's profile row, creating one if none exists.

    Scoped by `user_id` (UNIQUE on user_profiles.user_id) so distinct
    callers never see each other's row even though service-role bypasses
    RLS.

    ``seed_email`` pre-fills the ``email`` column on the create path so
    onboarding's IdentityStep doesn't ask the user to retype the email
    they just signed in with. Only applied at creation time — existing
    rows aren't touched, since the user may have intentionally cleared
    or changed the value in Settings.
    """
    resp = await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .select(columns)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if rows:
        return cast(dict[str, Any], rows[0])

    seed: dict[str, Any] = {"user_id": user_id}
    if seed_email:
        seed["email"] = seed_email
    insert = await asyncio.to_thread(
        lambda: supabase.table("user_profiles").insert(seed).execute()
    )
    if not insert.data:
        raise HTTPException(status_code=500, detail="Failed to create profile")
    resp2 = await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .select(columns)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return cast(dict[str, Any], (resp2.data or [{}])[0])


@router.get("/notifications")
async def get_notification_preferences(
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    supabase: Client = Depends(get_supabase),
) -> NotificationPreferences:
    row = await _get_or_create_profile(
        supabase, user_id, _PREFS_COLUMNS, seed_email=user_email
    )
    return NotificationPreferences(
        **row,
        email_available=_email_channel_available(),
        sms_available=_sms_channel_available(),
    )


@router.patch("/notifications")
async def update_notification_preferences(
    body: NotificationPreferencesUpdate,
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
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

    profile = await _get_or_create_profile(
        supabase, user_id, _PREFS_COLUMNS, seed_email=user_email
    )

    updates = body.model_dump(exclude_none=True)
    if not updates:
        return NotificationPreferences(
            **profile,
            email_available=_email_channel_available(),
            sms_available=_sms_channel_available(),
        )

    await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .update(updates)
        .eq("user_id", user_id)
        .execute()
    )

    merged = {**profile, **updates}
    return NotificationPreferences(
        **merged,
        email_available=_email_channel_available(),
        sms_available=_sms_channel_available(),
    )


# ---------------------------------------------------------------------------
# Identity (contact info for resume / cover-letter generation, F3-A)
# ---------------------------------------------------------------------------


@router.get("/identity")
async def get_identity(
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    supabase: Client = Depends(get_supabase),
) -> IdentityFields:
    row = await _get_or_create_profile(
        supabase, user_id, _IDENTITY_COLUMNS, seed_email=user_email
    )
    return IdentityFields(**row)


@router.patch("/identity")
async def update_identity(
    body: IdentityFieldsUpdate,
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    supabase: Client = Depends(get_supabase),
) -> IdentityFields:
    profile = await _get_or_create_profile(
        supabase, user_id, _IDENTITY_COLUMNS, seed_email=user_email
    )

    # Treat empty strings as explicit clears; None means "don't touch"
    updates = body.model_dump(exclude_none=True)
    for key, value in list(updates.items()):
        if isinstance(value, str) and value.strip() == "":
            updates[key] = None

    if not updates:
        return IdentityFields(**profile)

    await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .update(updates)
        .eq("user_id", user_id)
        .execute()
    )

    merged = {**profile, **updates}
    return IdentityFields(**merged)


# ---------------------------------------------------------------------------
# Resume style (docx typography preset for tailored resume / cover-letter export)
# ---------------------------------------------------------------------------


def _read_style(row: dict[str, Any]) -> ResumeStyleSettings:
    """Parse the stored JSONB into settings; fall back to defaults when the
    column is NULL (user hasn't chosen yet) or somehow malformed."""
    stored = row.get("resume_style_settings")
    if not stored:
        return ResumeStyleSettings()
    try:
        return ResumeStyleSettings.model_validate(stored)
    except ValueError:
        return ResumeStyleSettings()


@router.get("/resume-style")
async def get_resume_style(
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    supabase: Client = Depends(get_supabase),
) -> ResumeStyleSettings:
    row = await _get_or_create_profile(
        supabase, user_id, _RESUME_STYLE_COLUMNS, seed_email=user_email
    )
    return _read_style(row)


@router.patch("/resume-style")
async def update_resume_style(
    body: ResumeStyleSettingsUpdate,
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    supabase: Client = Depends(get_supabase),
) -> ResumeStyleSettings:
    profile = await _get_or_create_profile(
        supabase, user_id, _RESUME_STYLE_COLUMNS, seed_email=user_email
    )
    current = _read_style(profile)

    updates = body.model_dump(exclude_none=True)
    if not updates:
        return current

    merged = current.model_copy(update=updates)
    await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .update({"resume_style_settings": merged.model_dump()})
        .eq("user_id", user_id)
        .execute()
    )
    return merged
