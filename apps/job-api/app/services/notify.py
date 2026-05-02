"""Email and SMS alerts for newly discovered high-scoring jobs.

Supports issues #510 (email) and #511 (SMS).

Email flow:
    poller.py  (FastAPI)  ──POST──▶  /api/email/job-alert  (Next.js)
         │                                       │
         │                                       └─ renders React Email, sends via Resend
         └─ writes notifications_sent (dedup, channel='email')

SMS flow:
    poller.py  (FastAPI)  ──Twilio SDK──▶  Twilio API
         │
         └─ writes notifications_sent (dedup, channel='sms')

At-most-once semantics: a dedup row is claimed via upsert-with-
ignore_duplicates BEFORE the send. If the claim wins, we send; if the
send fails, the row persists and no retry ever fires. This trades a
missed notification for guaranteed non-duplication, which is the right
choice for a personal job alert.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any, cast

import httpx
from supabase import Client

from app.config import settings
from app.http_client import get_http_client

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Email alerts (#510)
# ---------------------------------------------------------------------------


async def send_alerts_for_new_jobs(
    supabase: Client, new_job_rows: list[dict[str, Any]]
) -> int:
    """Fan out email alerts for each (profile × new-job) pair that clears the
    per-profile threshold. Returns the count of alerts actually sent.
    """
    if not new_job_rows:
        return 0
    if not settings.next_app_url or not settings.job_alert_secret:
        logger.debug(
            "Job alerts skipped: NEXT_APP_URL and JOB_ALERT_SECRET must both be set"
        )
        return 0

    profiles = await _fetch_active_profiles(supabase)
    if not profiles:
        return 0

    sent = 0
    for job in new_job_rows:
        score = job.get("score")
        if not isinstance(score, int):
            continue
        for profile in profiles:
            if score < int(profile.get("job_score_threshold", 100)):
                continue
            if await _try_send_one(supabase, profile, job, score):
                sent += 1
    return sent


async def _fetch_active_profiles(supabase: Client) -> list[dict[str, Any]]:
    resp = await asyncio.to_thread(
        lambda: supabase.table("user_profiles")
        .select(
            "id, email, job_score_threshold,"
            " phone_number, sms_notifications_enabled,"
            " sms_score_threshold, sms_daily_limit"
        )
        .eq("job_notifications_enabled", True)
        .is_("unsubscribed_at", "null")
        .execute()
    )
    return cast(list[dict[str, Any]], resp.data or [])


async def _try_send_one(
    supabase: Client,
    profile: dict[str, Any],
    job: dict[str, Any],
    score: int,
) -> bool:
    profile_id = profile["id"]
    job_id = job["id"]

    claim = await asyncio.to_thread(
        lambda: supabase.table("notifications_sent")
        .upsert(
            {
                "user_profile_id": profile_id,
                "job_posting_id": job_id,
                "score_at_send": score,
                "channel": "email",
            },
            on_conflict="user_profile_id,job_posting_id,channel",
            ignore_duplicates=True,
        )
        .execute()
    )
    claimed_rows = claim.data or []
    if not claimed_rows:
        return False
    claim_id = cast(dict[str, Any], claimed_rows[0])["id"]

    try:
        resend_id = await _post_alert(profile, job, score)
    except Exception:
        logger.exception(
            "Job alert POST raised for profile=%s job=%s", profile_id, job_id
        )
        return False

    if resend_id:
        await asyncio.to_thread(
            lambda: supabase.table("notifications_sent")
            .update({"external_id": resend_id})
            .eq("id", claim_id)
            .execute()
        )
        return True

    return False


async def _post_alert(
    profile: dict[str, Any], job: dict[str, Any], score: int
) -> str | None:
    payload = {
        "profileId": profile["id"],
        "to": profile["email"],
        "jobId": job["id"],
        "title": job.get("title") or "",
        "company": job.get("company_name") or "",
        "location": job.get("location"),
        "score": score,
        "jobUrl": job.get("absolute_url") or "",
    }
    url = f"{settings.next_app_url.rstrip('/')}/api/email/job-alert"
    client: httpx.AsyncClient = get_http_client()
    resp = await client.post(
        url,
        json=payload,
        headers={"Authorization": f"Bearer {settings.job_alert_secret}"},
    )
    if resp.status_code != 200:
        logger.warning(
            "Job alert POST failed: status=%s body=%s",
            resp.status_code,
            resp.text[:200],
        )
        return None
    body = resp.json()
    resend_id = body.get("resendId")
    return resend_id if isinstance(resend_id, str) else None


# ---------------------------------------------------------------------------
# SMS alerts (#511)
# ---------------------------------------------------------------------------


async def send_sms_alerts_for_new_jobs(
    supabase: Client, new_job_rows: list[dict[str, Any]]
) -> int:
    """Fan out SMS alerts for each (profile × new-job) pair that clears the
    per-profile SMS threshold and daily rate limit. Returns the count sent.
    """
    if not new_job_rows:
        return 0
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.debug("SMS alerts skipped: Twilio credentials not configured")
        return 0

    profiles = await _fetch_active_profiles(supabase)
    if not profiles:
        return 0

    # Filter to SMS-enabled profiles with a phone number
    sms_profiles = [
        p
        for p in profiles
        if p.get("sms_notifications_enabled") and p.get("phone_number")
    ]
    if not sms_profiles:
        return 0

    sent = 0
    for job in new_job_rows:
        score = job.get("score")
        if not isinstance(score, int):
            continue
        for profile in sms_profiles:
            if score < int(profile.get("sms_score_threshold", 100)):
                continue
            if await _try_send_sms(supabase, profile, job, score):
                sent += 1
    return sent


async def _sms_count_today(supabase: Client, profile_id: str) -> int:
    """Count SMS notifications sent today for a profile."""
    today = datetime.now(UTC).strftime("%Y-%m-%dT00:00:00+00:00")
    resp = await asyncio.to_thread(
        lambda: supabase.table("notifications_sent")
        .select("id", count="exact")  # type: ignore[arg-type]
        .eq("user_profile_id", profile_id)
        .eq("channel", "sms")
        .gte("sent_at", today)
        .execute()
    )
    return resp.count or 0


async def _try_send_sms(
    supabase: Client,
    profile: dict[str, Any],
    job: dict[str, Any],
    score: int,
) -> bool:
    profile_id = profile["id"]
    job_id = job["id"]
    daily_limit = int(profile.get("sms_daily_limit", 5))

    # Rate limit check
    today_count = await _sms_count_today(supabase, profile_id)
    if today_count >= daily_limit:
        logger.debug(
            "SMS rate limited for profile=%s (sent=%d, limit=%d)",
            profile_id,
            today_count,
            daily_limit,
        )
        return False

    # Claim dedup row
    claim = await asyncio.to_thread(
        lambda: supabase.table("notifications_sent")
        .upsert(
            {
                "user_profile_id": profile_id,
                "job_posting_id": job_id,
                "score_at_send": score,
                "channel": "sms",
            },
            on_conflict="user_profile_id,job_posting_id,channel",
            ignore_duplicates=True,
        )
        .execute()
    )
    claimed_rows = claim.data or []
    if not claimed_rows:
        return False
    claim_id = cast(dict[str, Any], claimed_rows[0])["id"]

    # Build SMS body
    title = job.get("title") or "New role"
    company = job.get("company_name") or ""
    deep_link = ""
    if settings.next_app_url:
        deep_link = f" {settings.next_app_url.rstrip('/')}/fitted/jobs/{job_id}"
    body = f"Great match: {title}"
    if company:
        body += f" at {company}"
    body += f" (score: {score}).{deep_link}"

    try:
        twilio_sid = await _send_twilio_sms(profile["phone_number"], body)
    except Exception:
        logger.exception(
            "Twilio SMS raised for profile=%s job=%s", profile_id, job_id
        )
        return False

    if twilio_sid:
        await asyncio.to_thread(
            lambda: supabase.table("notifications_sent")
            .update({"external_id": twilio_sid})
            .eq("id", claim_id)
            .execute()
        )
        return True

    return False


_twilio_client: Any = None


def _get_twilio_client() -> Any:
    """Return a cached Twilio client, creating it on first call."""
    global _twilio_client
    if _twilio_client is None:
        from twilio.rest import Client as TwilioClient  # type: ignore[import-untyped]

        _twilio_client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
    return _twilio_client


async def _send_twilio_sms(to: str, body: str) -> str | None:
    """Send an SMS via Twilio. Returns the message SID on success."""
    client = _get_twilio_client()

    message = await asyncio.to_thread(
        lambda: client.messages.create(
            body=body,
            from_=settings.twilio_phone_number,
            to=to,
        )
    )
    sid: str | None = message.sid
    return sid
