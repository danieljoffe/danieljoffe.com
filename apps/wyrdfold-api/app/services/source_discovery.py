"""Target-driven source discovery.

For each active target, issue a battery of site-restricted searches against
Brave Search using the target's ``search_keywords`` and the ATS hosts our
poller supports. URLs returned by Brave run through ``detect_ats`` — anything
that classifies cleanly becomes a new ``sources`` row (auto-enabled), which
the existing poller then picks up on the next cycle.

This is intentionally a target-keyword-driven loop rather than a generic
company-directory crawl. The yield-per-query is much higher because every
hit is already a company *actively hiring* for a role the target cares
about. See ``.tmp/chatgpt-report.md`` discussion for the trade-offs.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, cast

import httpx
from supabase import Client

from app.config import settings
from app.models.targets import JobTarget
from app.services.ats_detect import DetectResult, detect_ats

logger = logging.getLogger(__name__)

# Brave Search API endpoint.
_BRAVE_URL = "https://api.search.brave.com/res/v1/web/search"

# ATS site filters we restrict each search to. Order matters only for
# tie-breaking display. The trailing comma in each entry is intentional so
# the rendered Brave query reads as a clean ``site:`` operator.
#
# Workday's host pattern is wildcarded — Brave understands ``site:*.x.com``
# but not all engines do. If Brave's wildcard support changes, fall back to
# omitting the workday entry and letting the unfiltered keyword pass surface
# WD URLs.
_ATS_SITE_FILTERS: list[str] = [
    "boards.greenhouse.io",
    "job-boards.greenhouse.io",
    "jobs.lever.co",
    "jobs.ashbyhq.com",
    "*.myworkdayjobs.com",
    "careers.smartrecruiters.com",
]


@dataclass(slots=True)
class DiscoveryRunStats:
    """Aggregated outcome for a single ``run_discovery_for_target`` call."""

    target_id: str
    queries_issued: int
    urls_examined: int
    inserted: int
    duplicates: int
    unclassified: int
    filtered: int


@dataclass(slots=True)
class _SearchHit:
    keyword: str
    site_filter: str | None
    url: str


async def _brave_search(
    client: httpx.AsyncClient,
    *,
    query: str,
    count: int,
) -> list[str]:
    """Issue a single Brave Search query, return the result URLs.

    Returns ``[]`` on any error (rate limit, network, auth). The caller logs
    and moves on — partial discovery is better than zero discovery.
    """
    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": settings.brave_search_api_key,
    }
    params: dict[str, str | int] = {"q": query, "count": count}
    try:
        resp = await client.get(
            _BRAVE_URL, headers=headers, params=params, timeout=15.0
        )
    except httpx.HTTPError as exc:
        logger.warning("brave search transport error for %r: %s", query, exc)
        return []
    if resp.status_code != 200:
        logger.warning(
            "brave search %d for %r — first 200 bytes: %r",
            resp.status_code,
            query,
            resp.text[:200],
        )
        return []
    try:
        body = resp.json()
    except ValueError:
        logger.warning("brave search returned non-JSON for %r", query)
        return []
    results = body.get("web", {}).get("results", []) or []
    return [r["url"] for r in results if isinstance(r.get("url"), str)]


def _existing_board_tokens(supabase: Client) -> set[str]:
    """Snapshot every ``board_token`` currently in ``sources``.

    Loaded once at the start of a run so we don't re-query Supabase per URL.
    Concurrent inserts during the run are still deduped at the database level
    by the ``board_token`` unique constraint — this is just to skip the
    expensive Brave + detect_ats roundtrip for already-known tokens.
    """
    resp = supabase.table("sources").select("board_token").execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    return {r["board_token"] for r in rows if r.get("board_token")}


def _log_discovery(
    supabase: Client,
    *,
    target_id: str,
    hit: _SearchHit,
    detect: DetectResult | None,
    outcome: str,
) -> None:
    """Append one row to ``source_discoveries`` for audit / quota tracking.

    Failure to log doesn't fail the discovery — log + continue so the run can
    still upsert real sources. The downside is a missing audit row, which is
    strictly cosmetic.
    """
    payload: dict[str, Any] = {
        "target_id": target_id,
        "search_keyword": hit.keyword,
        "ats_site_filter": hit.site_filter,
        "source_url": hit.url,
        "outcome": outcome,
    }
    if detect is not None:
        payload["detected_provider"] = detect.provider
        payload["detected_board_token"] = detect.board_token
        payload["detected_company_name"] = detect.company_name
        payload["detected_job_count"] = detect.job_count
    try:
        supabase.table("source_discoveries").insert(payload).execute()
    except Exception as exc:
        # Never fail discovery for an audit-row write — log and move on.
        logger.warning("source_discoveries insert failed: %s", exc)


def _insert_source(supabase: Client, *, detect: DetectResult) -> bool:
    """Upsert ``detect.board_token`` into ``sources``. Return True if a new
    row landed, False if it was a duplicate or write failed.

    Uses the ``board_token`` unique constraint via on_conflict + count to
    distinguish "I created" from "already existed" — Supabase's upsert
    returns the row regardless, so we have to check whether the
    ``created_at`` we get back is recent.

    Simpler approach: try an INSERT, if the unique constraint blows up,
    treat as duplicate.
    """
    try:
        supabase.table("sources").insert(
            {
                "provider": detect.provider,
                "board_token": detect.board_token,
                "company_name": detect.company_name,
                "enabled": True,
            }
        ).execute()
        return True
    except Exception as exc:
        # Any error (duplicate constraint, transient connection, etc.) lands
        # in this branch. The dedup snapshot upstream catches the common
        # duplicate case before we get here, so anything reaching this
        # except is either a race or a real write error — both are fine to
        # treat as "not inserted" from the caller's POV.
        logger.debug(
            "sources insert skipped (likely duplicate) for %s: %s",
            detect.board_token,
            exc,
        )
        return False


async def run_discovery_for_target(
    supabase: Client,
    target: JobTarget,
) -> DiscoveryRunStats:
    """Discover new sources for one target.

    For each ``(search_keyword × ATS site filter)`` combination we issue a
    Brave query, run every result URL through ``detect_ats``, and upsert any
    classifiable token that we don't already have.

    Caps total Brave queries at ``settings.discovery_query_cap_per_run`` so
    a target with very many keywords can't drain the monthly quota in one
    run. The remaining keywords roll over to the next run naturally — we
    just walk the keyword list in order and stop when we hit the cap.
    """
    if not settings.brave_search_api_key:
        logger.warning(
            "discovery requested for target %s but BRAVE_SEARCH_API_KEY is empty",
            target.id,
        )
        return DiscoveryRunStats(
            target_id=target.id,
            queries_issued=0,
            urls_examined=0,
            inserted=0,
            duplicates=0,
            unclassified=0,
            filtered=0,
        )

    keywords = target.search_keywords or []
    if not keywords:
        logger.info("target %s has no search_keywords — skipping discovery", target.id)
        return DiscoveryRunStats(
            target_id=target.id,
            queries_issued=0,
            urls_examined=0,
            inserted=0,
            duplicates=0,
            unclassified=0,
            filtered=0,
        )

    existing_tokens = _existing_board_tokens(supabase)
    queries_issued = 0
    urls_examined = 0
    inserted = 0
    duplicates = 0
    unclassified = 0
    filtered = 0
    cap = settings.discovery_query_cap_per_run
    per_query_count = settings.discovery_results_per_query

    async with httpx.AsyncClient() as brave_client:
        for keyword in keywords:
            for site_filter in _ATS_SITE_FILTERS:
                if queries_issued >= cap:
                    logger.info(
                        "discovery cap of %d queries hit for target %s — stopping",
                        cap,
                        target.id,
                    )
                    return DiscoveryRunStats(
                        target_id=target.id,
                        queries_issued=queries_issued,
                        urls_examined=urls_examined,
                        inserted=inserted,
                        duplicates=duplicates,
                        unclassified=unclassified,
                        filtered=filtered,
                    )

                query = f'"{keyword}" site:{site_filter}'
                urls = await _brave_search(
                    brave_client, query=query, count=per_query_count
                )
                queries_issued += 1

                for url in urls:
                    urls_examined += 1
                    hit = _SearchHit(
                        keyword=keyword, site_filter=site_filter, url=url
                    )
                    # detect_ats has its own httpx client — it manages probe
                    # cadence + provider fallback internally.
                    detect = await detect_ats(url)
                    if detect is None:
                        unclassified += 1
                        _log_discovery(
                            supabase,
                            target_id=target.id,
                            hit=hit,
                            detect=None,
                            outcome="unclassified",
                        )
                        continue
                    if detect.job_count == 0:
                        # ATS classified the URL but the board has no live
                        # postings. Polling it would just burn requests on a
                        # dead board — skip but log so we can revisit if we
                        # change our mind later.
                        filtered += 1
                        _log_discovery(
                            supabase,
                            target_id=target.id,
                            hit=hit,
                            detect=detect,
                            outcome="filtered",
                        )
                        continue
                    if detect.board_token in existing_tokens:
                        duplicates += 1
                        _log_discovery(
                            supabase,
                            target_id=target.id,
                            hit=hit,
                            detect=detect,
                            outcome="duplicate",
                        )
                        continue
                    if _insert_source(supabase, detect=detect):
                        existing_tokens.add(detect.board_token)
                        inserted += 1
                        _log_discovery(
                            supabase,
                            target_id=target.id,
                            hit=hit,
                            detect=detect,
                            outcome="inserted",
                        )
                    else:
                        # Insert was rejected (race with another runner, or
                        # write error). Treat as duplicate-ish for stats.
                        duplicates += 1
                        _log_discovery(
                            supabase,
                            target_id=target.id,
                            hit=hit,
                            detect=detect,
                            outcome="duplicate",
                        )

    return DiscoveryRunStats(
        target_id=target.id,
        queries_issued=queries_issued,
        urls_examined=urls_examined,
        inserted=inserted,
        duplicates=duplicates,
        unclassified=unclassified,
        filtered=filtered,
    )


__all__ = ["DiscoveryRunStats", "run_discovery_for_target"]
