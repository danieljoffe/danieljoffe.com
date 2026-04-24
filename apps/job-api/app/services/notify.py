"""Email alerts for newly discovered high-scoring jobs.

Supports issue #510. Cross-service flow:

    poller.py  (FastAPI)  ──POST──▶  /api/email/job-alert  (Next.js)
         │                                       │
         │                                       └─ renders React Email, sends via Resend
         └─ writes job_notification_sent (dedup)

At-most-once semantics: a dedup row is claimed via upsert-with-
ignore_duplicates BEFORE the send. If the claim wins, we send; if the
send fails, the row persists and no retry ever fires. This trades a
missed email for guaranteed non-duplication, which is the right choice
for a personal job alert.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, cast

import httpx
from supabase import Client

from app.config import settings
from app.http_client import get_http_client

logger = logging.getLogger(__name__)


async def send_alerts_for_new_jobs(
    supabase: Client, new_job_rows: list[dict[str, Any]]
) -> int:
    """Fan out alerts for each (profile × new-job) pair that clears the
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
        .select("id, email, job_score_threshold")
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
        lambda: supabase.table("job_notification_sent")
        .upsert(
            {
                "user_profile_id": profile_id,
                "job_posting_id": job_id,
                "score_at_send": score,
            },
            on_conflict="user_profile_id,job_posting_id",
            ignore_duplicates=True,
        )
        .execute()
    )
    claimed_rows = claim.data or []
    if not claimed_rows:
        # Dedup hit — another run already claimed this (profile, job) pair.
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
            lambda: supabase.table("job_notification_sent")
            .update({"resend_id": resend_id})
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
