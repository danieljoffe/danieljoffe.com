"""User profile router — notification preferences + identity (contact) fields.

All endpoints scope to the JWT subject. The service-role Supabase client
bypasses RLS, so explicit `.eq("user_id", user_id)` is the only thing
preventing cross-tenant reads/writes.
"""

import asyncio
from datetime import UTC, datetime
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
    LlmUsageResponse,
    LlmUsageWindow,
    NotificationPreferences,
    NotificationPreferencesUpdate,
    OnboardingStatus,
    OnboardingStepUpdate,
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

_ONBOARDING_COLUMNS = (
    "onboarding_completed_at, onboarding_path, onboarding_current_step"
)


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


# ---------------------------------------------------------------------------
# Onboarding progress (plan-wyrdfold-onboarding-completion-tracking.md)
# ---------------------------------------------------------------------------


_KNOWN_STEPS = {
    "path-chooser",
    "identity",
    "upload-resume",
    "add-job",
    "pick-targets",
    "conversation",
    "completion",
}
_KNOWN_PATHS = {"A", "B", "C"}


def _read_onboarding(row: dict[str, Any]) -> OnboardingStatus:
    """Parse the three onboarding columns into a typed status object.

    Unknown ``path`` or ``current_step`` values (e.g. an old wizard
    version that wrote a step we no longer support) fall back to None
    rather than 500ing the dashboard — the wizard will treat None as
    "start from the beginning." This is graceful degradation; the
    safer-than-crash behaviour matters because this endpoint sits
    on the dashboard's critical path.
    """
    step = row.get("onboarding_current_step")
    path = row.get("onboarding_path")
    return OnboardingStatus.model_validate(
        {
            "completed_at": row.get("onboarding_completed_at"),
            "path": path if path in _KNOWN_PATHS else None,
            "current_step": step if step in _KNOWN_STEPS else None,
        }
    )


@router.get("/onboarding")
async def get_onboarding_status(
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    supabase: Client = Depends(get_supabase),
) -> OnboardingStatus:
    """Return the user's onboarding progress.

    Used by the dashboard server component to decide whether to redirect
    to /onboarding. Cheap query — only the three onboarding columns
    flow back.
    """
    row = await _get_or_create_profile(
        supabase, user_id, _ONBOARDING_COLUMNS, seed_email=user_email
    )
    return _read_onboarding(row)


@router.patch("/onboarding/step")
async def update_onboarding_step(
    body: OnboardingStepUpdate,
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    supabase: Client = Depends(get_supabase),
) -> OnboardingStatus:
    """Update the user's current onboarding step (and optionally path).

    Wizard calls this on every step transition. Both fields are
    optional — passing only ``current_step`` is the common case;
    ``path`` is set once when the user picks a path on PathChooser.
    Idempotent: re-PATCHing the same step is a no-op.
    """
    await _get_or_create_profile(
        supabase, user_id, _ONBOARDING_COLUMNS, seed_email=user_email
    )

    updates: dict[str, Any] = {}
    if body.path is not None:
        updates["onboarding_path"] = body.path
    if body.current_step is not None:
        updates["onboarding_current_step"] = body.current_step
    if updates:
        await asyncio.to_thread(
            lambda: supabase.table("user_profiles")
            .update(updates)
            .eq("user_id", user_id)
            .execute()
        )

    row = await _get_or_create_profile(
        supabase, user_id, _ONBOARDING_COLUMNS, seed_email=user_email
    )
    return _read_onboarding(row)


@router.post("/onboarding/complete")
async def complete_onboarding(
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    supabase: Client = Depends(get_supabase),
) -> OnboardingStatus:
    """Mark the user's onboarding as complete.

    Idempotent: the wizard's "Continue to dashboard" button calls this
    on the final step; calling again later (e.g. user navigates back
    and re-finishes) doesn't overwrite the original completion
    timestamp — the earlier value is the source of truth for "when
    did this user actually onboard."

    Also sets current_step to "completion" so a subsequent
    /onboarding read sees a consistent state.
    """
    row = await _get_or_create_profile(
        supabase, user_id, _ONBOARDING_COLUMNS, seed_email=user_email
    )

    updates: dict[str, Any] = {"onboarding_current_step": "completion"}
    if row.get("onboarding_completed_at") is None:
        # Client-side timestamp is fine here — clock skew between the
        # API container and the DB is sub-second and we don't render
        # this value to the user. The PostgREST sync path doesn't have
        # a clean way to pass a `now()` literal anyway.
        updates["onboarding_completed_at"] = datetime.now(UTC).isoformat()

    await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .update(updates)
        .eq("user_id", user_id)
        .execute()
    )

    fresh = await _get_or_create_profile(
        supabase, user_id, _ONBOARDING_COLUMNS, seed_email=user_email
    )
    return _read_onboarding(fresh)


@router.post("/onboarding/reset")
async def reset_onboarding(
    user_id: str = Depends(get_current_user_id),
    user_email: str | None = Depends(get_current_user_email),
    supabase: Client = Depends(get_supabase),
) -> OnboardingStatus:
    """Clear the user's onboarding completion + step state so the wizard
    treats them as fresh.

    Used by the Settings page "Redo onboarding" button. Idempotent:
    calling on an already-cleared row is a no-op.

    **Does NOT delete** the user's prose, targets, or any other
    profile data — that's a separate "reset my account" action the
    user would need to take explicitly. The redo-onboarding flow
    preserves the user's work and only resets the wizard's view of
    completion + current step.

    Preserves ``onboarding_path`` so we keep the breadcrumb of which
    path they last picked — useful for product analytics later
    ("which paths get re-done most often").
    """
    await _get_or_create_profile(
        supabase, user_id, _ONBOARDING_COLUMNS, seed_email=user_email
    )

    await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .update(
            {
                "onboarding_completed_at": None,
                "onboarding_current_step": None,
            }
        )
        .eq("user_id", user_id)
        .execute()
    )

    fresh = await _get_or_create_profile(
        supabase, user_id, _ONBOARDING_COLUMNS, seed_email=user_email
    )
    return _read_onboarding(fresh)


@router.get("/llm-usage", response_model=LlmUsageResponse)
async def get_llm_usage(
    supabase: Client = Depends(get_supabase),
    user_id: str = Depends(get_current_user_id),
) -> LlmUsageResponse:
    """The user's allowance state across all budget windows.

    Mirrors exactly what the budget gates enforce (same spend queries),
    so the FE can render "X of Y used" without guessing.
    """
    from datetime import timedelta

    from app.services.analysis.analyze import DEFAULT_PURPOSE
    from app.services.llm import budget, cost_log

    now = datetime.now(UTC)

    def _snapshot() -> LlmUsageResponse:
        monthly_cap = budget.effective_monthly_cap(
            supabase, user_id=user_id, default_usd=settings.user_llm_monthly_budget_usd
        )
        month_since = now - timedelta(days=budget.MONTHLY_WINDOW_DAYS)
        spent_month = cost_log.total_spend(supabase, user_id=user_id, since=month_since)

        # Approximate refill point: oldest cost row in the window + 30d.
        resets_at = None
        oldest = cast(
            list[dict[str, Any]],
            supabase.table("llm_costs")
            .select("created_at")
            .eq("user_id", user_id)
            .gte("created_at", month_since.isoformat())
            .order("created_at")
            .limit(1)
            .execute()
            .data
            or [],
        )
        if oldest:
            oldest_dt = datetime.fromisoformat(
                str(oldest[0]["created_at"]).replace("Z", "+00:00")
            )
            resets_at = oldest_dt + timedelta(days=budget.MONTHLY_WINDOW_DAYS)

        analysis_used = (
            supabase.table("llm_costs")
            .select("id", count="exact")  # type: ignore[arg-type]
            .eq("user_id", user_id)
            .eq("purpose", DEFAULT_PURPOSE)
            .gte("created_at", (now - timedelta(hours=24)).isoformat())
            .execute()
            .count
            or 0
        )

        return LlmUsageResponse(
            hourly=LlmUsageWindow(
                spent_usd=cost_log.total_spend(
                    supabase, user_id=user_id, since=now - timedelta(hours=1)
                ),
                limit_usd=settings.user_llm_hourly_budget_usd,
            ),
            daily=LlmUsageWindow(
                spent_usd=cost_log.total_spend(
                    supabase, user_id=user_id, since=now - timedelta(hours=24)
                ),
                limit_usd=settings.user_llm_daily_budget_usd,
            ),
            monthly=LlmUsageWindow(spent_usd=spent_month, limit_usd=monthly_cap),
            monthly_resets_at=resets_at,
            analysis_daily_used=analysis_used,
            analysis_daily_limit=settings.analysis_daily_limit,
        )

    return await asyncio.to_thread(_snapshot)
