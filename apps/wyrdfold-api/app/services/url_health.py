"""Periodic URL health check + archival for dead job links.

The poller already archives jobs that disappear from a source's listings.
This service catches the orthogonal failure mode: jobs that the source
still lists but whose ``absolute_url`` has rotted (404, persistent 5xx,
redirect to a "no longer available" landing page).

Lifecycle:
  1. The scheduler ticks every ``URL_HEALTH_TICK_HOURS`` (default 24).
  2. ``check_due`` picks the oldest ``URL_HEALTH_BATCH_SIZE`` live jobs
     whose ``last_url_check_at`` is older than the tick threshold (or
     NULL — never checked).
  3. ``_head_request`` HEADs each URL in parallel under a small concurrency
     cap. HEAD is enough for status; we don't read bodies. Redirects are
     followed (final status is what we want).
  4. Result merged back to ``jobs``: ``last_url_check_at = now()``,
     ``url_check_status = <code>``, ``url_check_failure_count`` bumped on
     4xx / network error and reset on 2xx.
  5. ``archive_dead_jobs`` flips jobs whose failure_count >=
     ``URL_HEALTH_FAILURE_THRESHOLD`` to ``status = 'archived'`` and NULLs
     heavy fields (``description_html`` on jobs; ``axis_scores``,
     ``fit_reasoning``, ``score_breakdown``, ``matched_keywords`` on
     scores) to reclaim DB space.

We track existence by keeping the row + identity (id, external_id, title,
company_name, location, salary_text, absolute_url) so the dedupe in the
poller still works and the user can still see archived jobs in history.
Only the heavy display fields are dropped.

Design choices
  - HEAD, not GET — saves bandwidth and avoids triggering analytics on
    the job board. Some boards return 405 on HEAD; we treat 405 as 2xx
    (the URL exists; the method just isn't supported).
  - 5xx is NOT counted as failure (server hiccup, not job-dead).
  - Network errors (DNS, timeout, connection refused) ARE counted as
    failures (with status=0) — repeatedly unreachable jobs are dead.
  - Threshold-based archival (default 3 consecutive) prevents a single
    bad day at the job board from purging good jobs.

Cost: free. No LLM, no Supabase RPC. Just HTTP HEAD requests. With a 50-
job batch every 24h and ~10 concurrent connections, the entire system
stays well under any reasonable rate limit.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Any, cast

import httpx
from supabase import Client

from app.config import settings

logger = logging.getLogger(__name__)

# Sentinel for network-error / unreachable. Distinct from any real HTTP
# code so callers can detect transport failures separately from server
# replies.
_STATUS_NETWORK_ERROR = 0

# HEAD timeout: tight — most healthy responses come back in < 1s. A
# slow host is a signal in itself.
_HEAD_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

# User-Agent for the HEAD requests. Identifies us so a job board operator
# can contact us if needed without thinking it's a generic crawler.
_USER_AGENT = (
    "WyrdFoldUrlHealth/1.0 "
    "(+https://wyrdfold.com; ops@wyrdfold.com) "
    "httpx"
)


async def _head_one(client: httpx.AsyncClient, url: str) -> int:
    """HEAD a single URL, return final status (after redirects).

    Returns ``_STATUS_NETWORK_ERROR`` (= 0) on any transport-level
    failure. Returns 405 → 200 substitution: some job boards reject HEAD
    but the URL is real, so treat 405 as healthy.
    """
    try:
        resp = await client.head(url, follow_redirects=True)
    except (httpx.TransportError, httpx.TimeoutException, httpx.InvalidURL):
        return _STATUS_NETWORK_ERROR
    except Exception:
        # Defensive: anything else we don't recognise should not poison
        # the whole batch. Log + treat as unreachable.
        logger.exception("Unexpected error HEADing %s", url[:120])
        return _STATUS_NETWORK_ERROR
    code = int(resp.status_code)
    if code == 405:
        # Method-not-allowed: URL exists, board just refuses HEAD.
        return 200
    return code


async def _head_batch(urls: list[tuple[str, str]], concurrency: int) -> dict[str, int]:
    """Concurrently HEAD ``[(job_id, url), ...]``; returns ``{job_id: status}``."""
    sem = asyncio.Semaphore(concurrency)
    out: dict[str, int] = {}

    async with httpx.AsyncClient(
        timeout=_HEAD_TIMEOUT,
        headers={"User-Agent": _USER_AGENT},
        # Reasonable default redirect depth; some board URLs chain
        # through 2-3 hops before landing.
        max_redirects=5,
        # Verify TLS — we should never connect to a job posting over
        # broken TLS even if it 200s.
        verify=True,
    ) as client:

        async def _one(jid: str, url: str) -> None:
            async with sem:
                out[jid] = await _head_one(client, url)

        await asyncio.gather(*(_one(jid, url) for jid, url in urls))
    return out


def _select_due_jobs(
    supabase: Client, *, batch_size: int, age_threshold_hours: int
) -> list[dict[str, Any]]:
    """Return up to ``batch_size`` live jobs whose URL hasn't been checked
    recently.

    ``last_url_check_at`` ascending NULLS FIRST — never-checked jobs go
    before ones we've checked but a while ago.
    """
    cutoff = (datetime.now(UTC) - timedelta(hours=age_threshold_hours)).isoformat()
    # Pull rows where status is NOT one of the persistent states, AND
    # last_url_check_at is either NULL or older than the cutoff.
    # Supabase doesn't support OR composition over a NULL well, so we
    # split into two queries and merge.
    null_first = (
        supabase.table("jobs")
        .select("id, absolute_url, url_check_failure_count")
        .not_.in_("status", ["archived", "saved", "applied"])
        .is_("last_url_check_at", "null")
        .limit(batch_size)
        .execute()
    )
    rows = cast(list[dict[str, Any]], null_first.data or [])
    if len(rows) < batch_size:
        remaining = batch_size - len(rows)
        old = (
            supabase.table("jobs")
            .select("id, absolute_url, url_check_failure_count")
            .not_.in_("status", ["archived", "saved", "applied"])
            .lte("last_url_check_at", cutoff)
            .order("last_url_check_at", desc=False)
            .limit(remaining)
            .execute()
        )
        rows.extend(cast(list[dict[str, Any]], old.data or []))
    return rows


def _merge_check_results(
    supabase: Client,
    rows: list[dict[str, Any]],
    status_by_job: dict[str, int],
) -> None:
    """Update ``jobs`` with the new status + failure counter.

    Counter rules:
      - 2xx (200-299): reset counter to 0
      - 4xx (400-499) or network error (0): increment counter
      - 5xx (500-599) or anything else: leave counter alone (server-side
        hiccup, not job-dead)
    """
    now_iso = datetime.now(UTC).isoformat()
    for r in rows:
        jid = r["id"]
        if jid not in status_by_job:
            continue
        code = status_by_job[jid]
        prev_count = int(r.get("url_check_failure_count") or 0)
        if 200 <= code < 300:
            new_count = 0
        elif code == _STATUS_NETWORK_ERROR or 400 <= code < 500:
            new_count = prev_count + 1
        else:
            new_count = prev_count  # don't penalise on 5xx
        supabase.table("jobs").update({
            "last_url_check_at": now_iso,
            "url_check_status": code,
            "url_check_failure_count": new_count,
        }).eq("id", jid).execute()


def _archive_with_data_drop(supabase: Client, job_ids: list[str]) -> int:
    """Mark jobs archived AND drop their heavy display fields.

    Kept (identity + display metadata + audit):
      jobs.id, external_id, source_id, title, company_name, location,
      salary_text, absolute_url, status='archived', updated_at,
      last_url_check_at, url_check_status, url_check_failure_count
      scores.id, job_posting_id, target_id, score, recency_score,
      promising, excluded, scoring_status, scored_profile_version

    Dropped (to reclaim space):
      jobs.description_html
      scores.axis_scores, fit_reasoning, score_breakdown, matched_keywords

    Returns the number of jobs archived.
    """
    if not job_ids:
        return 0
    now_iso = datetime.now(UTC).isoformat()
    # 1. Flip job status + drop the heavy HTML.
    supabase.table("jobs").update({
        "status": "archived",
        "description_html": None,
        "updated_at": now_iso,
    }).in_("id", job_ids).execute()
    # 2. Drop heavy fields on every (job, target) scores row.
    supabase.table("scores").update({
        "axis_scores": None,
        "fit_reasoning": None,
        "score_breakdown": None,
        "matched_keywords": None,
    }).in_("job_posting_id", job_ids).execute()
    return len(job_ids)


async def run_url_health_check(
    supabase: Client,
    *,
    batch_size: int | None = None,
    concurrency: int | None = None,
    age_threshold_hours: int | None = None,
    failure_threshold: int | None = None,
) -> dict[str, int]:
    """One end-to-end tick: select due jobs, HEAD them, persist + archive.

    Returns a summary dict::

        {
          "checked": <int>,      # number of URLs HEAD'd this tick
          "healthy": <int>,      # 2xx
          "failures": <int>,     # 4xx + network error
          "server_errors": <int>,# 5xx (counted neutrally)
          "archived": <int>,     # jobs flipped to archived this tick
        }

    All parameters fall back to ``settings.url_health_*`` when omitted, so
    the scheduler can call this with no arguments and the operator tunes
    via env. Returns even on partial failures (a bad batch never sinks the
    tick).
    """
    bs = batch_size or settings.url_health_batch_size
    cc = concurrency or settings.url_health_concurrency
    age = age_threshold_hours or settings.url_health_tick_hours
    threshold = failure_threshold or settings.url_health_failure_threshold

    summary = {
        "checked": 0,
        "healthy": 0,
        "failures": 0,
        "server_errors": 0,
        "archived": 0,
    }

    try:
        rows = _select_due_jobs(
            supabase, batch_size=bs, age_threshold_hours=age
        )
    except Exception:
        logger.exception("url_health: failed to fetch due jobs")
        return summary
    if not rows:
        logger.info("url_health: no jobs due for check")
        return summary

    urls = [
        (r["id"], r["absolute_url"]) for r in rows if r.get("absolute_url")
    ]
    if not urls:
        logger.info("url_health: %d rows due but none have absolute_url", len(rows))
        return summary

    status_by_job = await _head_batch(urls, concurrency=cc)
    summary["checked"] = len(status_by_job)
    summary["healthy"] = sum(1 for c in status_by_job.values() if 200 <= c < 300)
    summary["failures"] = sum(
        1 for c in status_by_job.values() if c == _STATUS_NETWORK_ERROR or 400 <= c < 500
    )
    summary["server_errors"] = sum(
        1 for c in status_by_job.values() if 500 <= c < 600
    )

    try:
        _merge_check_results(supabase, rows, status_by_job)
    except Exception:
        logger.exception("url_health: failed to merge results")
        return summary

    # Re-query the rows we just updated to get the new failure_count, then
    # archive those at/above threshold. (We could compute in memory but
    # re-querying keeps this idempotent across crashes mid-batch.)
    checked_ids = list(status_by_job.keys())
    try:
        refreshed = (
            supabase.table("jobs")
            .select("id, url_check_failure_count")
            .in_("id", checked_ids)
            .gte("url_check_failure_count", threshold)
            .execute()
        )
        dead_ids = [
            r["id"] for r in cast(list[dict[str, Any]], refreshed.data or [])
        ]
        summary["archived"] = _archive_with_data_drop(supabase, dead_ids)
    except Exception:
        logger.exception("url_health: failed to archive dead jobs")
        return summary

    logger.info(
        "url_health tick: checked=%d healthy=%d failures=%d server_errors=%d archived=%d",
        summary["checked"],
        summary["healthy"],
        summary["failures"],
        summary["server_errors"],
        summary["archived"],
    )
    return summary
