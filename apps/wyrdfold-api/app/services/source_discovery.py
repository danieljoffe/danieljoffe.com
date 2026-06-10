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

import asyncio
import logging
import random
from dataclasses import dataclass
from typing import Any, cast

import httpx
from supabase import Client

from app.config import settings
from app.models.targets import JobTarget

# ``_parse_input`` is intentionally shared with the detector: discovery uses
# it as a cheap pre-probe grouping key so 20 hits on the same board cost one
# probe instead of 20.
from app.services.ats_detect import DetectResult, _parse_input, detect_ats

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
    # URLs skipped without probing because an earlier hit in the same run
    # already parsed to the same (provider, slug) key.
    deduped: int = 0


@dataclass(slots=True)
class _SearchHit:
    keyword: str
    site_filter: str | None
    url: str


# Brave retry policy. 429 (rate limit) and 5xx (transient backend) are
# retryable; everything else (auth, malformed query, etc.) is a config
# error that retrying won't fix.
_BRAVE_RETRYABLE_STATUSES = frozenset({429, 500, 502, 503, 504})
_BRAVE_MAX_ATTEMPTS = 3
_BRAVE_BACKOFF_BASE_SECONDS = 0.5
# Hard ceiling on a single retry sleep — we never want to sit on a
# request-bound endpoint for more than this, even if the server says so.
_BRAVE_MAX_RETRY_SLEEP_SECONDS = 30.0


def _parse_retry_after(value: str) -> float | None:
    """Brave (like most APIs) returns ``Retry-After`` as either a number of
    seconds (``"5"``) or an HTTP-date (``"Wed, 21 Oct 2026 07:28:00 GMT"``).
    We only handle the integer form here — the date form is uncommon for
    rate-limit responses and parsing it pulls in ``email.utils.parsedate_to_datetime``,
    which we don't otherwise need. Returns None if the header is missing or
    can't be parsed.
    """
    try:
        seconds = float(value.strip())
    except (TypeError, ValueError):
        return None
    if seconds < 0:
        return None
    return min(seconds, _BRAVE_MAX_RETRY_SLEEP_SECONDS)


async def _brave_search(
    client: httpx.AsyncClient,
    *,
    query: str,
    count: int,
) -> list[str]:
    """Issue a single Brave Search query, return the result URLs.

    Retries up to ``_BRAVE_MAX_ATTEMPTS`` on 429 + 5xx. For 429 we honour the
    server's ``Retry-After`` header when present; otherwise we fall back to
    exponential backoff with jitter so concurrent runners don't synchronise
    their retries into a thundering herd. Non-retryable status codes (4xx
    other than 429, transport errors that aren't network-flaky) return ``[]``
    immediately so the caller can move on.
    """
    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": settings.brave_search_api_key,
    }
    params: dict[str, str | int] = {"q": query, "count": count}

    for attempt in range(1, _BRAVE_MAX_ATTEMPTS + 1):
        try:
            resp = await client.get(
                _BRAVE_URL, headers=headers, params=params, timeout=15.0
            )
        except httpx.HTTPError as exc:
            logger.warning(
                "brave search transport error for %r (attempt %d/%d): %s",
                query,
                attempt,
                _BRAVE_MAX_ATTEMPTS,
                exc,
            )
            if attempt >= _BRAVE_MAX_ATTEMPTS:
                return []
            await asyncio.sleep(
                _backoff_with_jitter(attempt)
            )
            continue

        if resp.status_code == 200:
            try:
                body = resp.json()
            except ValueError:
                logger.warning("brave search returned non-JSON for %r", query)
                return []
            results = body.get("web", {}).get("results", []) or []
            return [r["url"] for r in results if isinstance(r.get("url"), str)]

        if resp.status_code in _BRAVE_RETRYABLE_STATUSES:
            if attempt >= _BRAVE_MAX_ATTEMPTS:
                logger.warning(
                    "brave search %d for %r — retries exhausted",
                    resp.status_code,
                    query,
                )
                return []
            # 429: prefer server's Retry-After. 5xx: exponential backoff.
            sleep_seconds: float
            if resp.status_code == 429:
                retry_after = _parse_retry_after(
                    resp.headers.get("retry-after", "")
                )
                sleep_seconds = (
                    retry_after
                    if retry_after is not None
                    else _backoff_with_jitter(attempt)
                )
            else:
                sleep_seconds = _backoff_with_jitter(attempt)
            logger.info(
                "brave search %d for %r — retrying in %.1fs (attempt %d/%d)",
                resp.status_code,
                query,
                sleep_seconds,
                attempt,
                _BRAVE_MAX_ATTEMPTS,
            )
            await asyncio.sleep(sleep_seconds)
            continue

        # Non-retryable (401, 403, 400, anything else 4xx). Surfacing the
        # body for debugging — these are almost always config errors.
        logger.warning(
            "brave search %d for %r — first 200 bytes: %r",
            resp.status_code,
            query,
            resp.text[:200],
        )
        return []

    # Loop exited without returning (shouldn't happen given the explicit
    # returns above, but keeps mypy happy).
    return []


def _backoff_with_jitter(attempt: int) -> float:
    """Exponential backoff (0.5s, 1s, 2s, ...) with ±30% jitter so concurrent
    workers don't all retry on the same wall-clock tick.
    """
    base = _BRAVE_BACKOFF_BASE_SECONDS * (2 ** (attempt - 1))
    # ruff S311: this is jitter for retry backoff, not a security primitive —
    # the standard library PRNG is correct here.
    jitter: float = 0.7 + random.random() * 0.6  # noqa: S311 — in [0.7, 1.3)
    sleep: float = min(base * jitter, _BRAVE_MAX_RETRY_SLEEP_SECONDS)
    return sleep


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
    """Atomically upsert ``detect.board_token`` into ``sources``. Return True
    if a new row was inserted, False if a row already existed.

    Delegates to the ``insert_source_if_not_exists`` Postgres RPC (see
    migration 20260530160000) so the duplicate-vs-inserted decision happens
    inside the database and comes back as a boolean. The previous
    try-insert-catch-exception pattern silently treated *every* error —
    transient connection issues, RLS misconfigurations, NOT NULL violations
    on columns added later — as "duplicate", masking real write failures.
    """
    try:
        resp = supabase.rpc(
            "insert_source_if_not_exists",
            {
                "p_provider": detect.provider,
                "p_board_token": detect.board_token,
                "p_company_name": detect.company_name,
            },
        ).execute()
    except Exception as exc:
        # A genuine error from the RPC call (network, RLS, etc.). Surface
        # it loudly — the caller marks the row as ``duplicate`` for stats
        # purposes but at least the operator can see something broke.
        logger.warning(
            "insert_source_if_not_exists RPC failed for %s: %s",
            detect.board_token,
            exc,
        )
        return False

    # The function returns ``boolean``. Supabase's postgrest layer wraps
    # scalar-returning RPCs as ``resp.data == True`` (or a single-row list
    # depending on the schema-cache state), so accept both shapes.
    data = resp.data
    if isinstance(data, bool):
        return data
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, bool):
            return first
        if isinstance(first, dict):
            inserted = first.get("insert_source_if_not_exists")
            if isinstance(inserted, bool):
                return inserted
    # Unknown response shape — log and treat as not-inserted to be safe.
    logger.warning(
        "insert_source_if_not_exists returned unexpected shape: %r", data
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

    # Build the query plan upfront so we can fan out the Brave fetches
    # concurrently. The cap applies to the *number of queries*, not the
    # number of URLs we process — once the cap is exhausted we stop adding
    # to the plan but still process everything we already pulled.
    #
    # The full combination list is shuffled before truncation. The previous
    # in-order walk truncated the same keyword-order prefix every run, so
    # combinations past the cap were never queried on ANY run (there is no
    # persisted cursor — "roll over to the next run" never happened).
    # Random sampling covers the whole keyword x site space across repeated
    # runs without needing rotation state.
    query_plan = [
        (keyword, site_filter)
        for keyword in keywords
        for site_filter in _ATS_SITE_FILTERS
    ]
    random.shuffle(query_plan)
    if len(query_plan) > cap:
        logger.info(
            "discovery cap of %d queries hit for target %s — sampling %d of %d combos",
            cap,
            target.id,
            cap,
            len(query_plan),
        )
        query_plan = query_plan[:cap]
    queries_issued = len(query_plan)

    # Concurrency: 8 simultaneous Brave queries. Brave's free tier docs
    # don't publish a strict concurrent-connection ceiling, but 8 is well
    # under any reasonable threshold and still cuts ~85% off wall time for
    # a 90-query run. Keep the detect_ats + insert path sequential below so
    # we don't (a) hammer the downstream ATSs with parallel probes (each
    # ats_detect already manages its own probe cadence) and (b) introduce
    # races on the in-process ``existing_tokens`` set.
    brave_semaphore = asyncio.Semaphore(8)

    async with httpx.AsyncClient() as brave_client:
        async def _bounded_brave(
            kw: str, site: str
        ) -> tuple[str, str, list[str]]:
            async with brave_semaphore:
                # Keyword left unquoted on purpose. Exact-phrase quoting
                # ("director of cx operations") missed boards whose posting
                # titles phrase the role differently — and any hit on an ATS
                # host is a valid board regardless of phrasing; the keyword
                # only biases results toward companies hiring for the role.
                urls = await _brave_search(
                    brave_client,
                    query=f"{kw} site:{site}",
                    count=per_query_count,
                )
            return kw, site, urls

        # Fire all queries. Brave failures already return [] internally so
        # ``gather`` won't blow up — but pass ``return_exceptions=True`` as
        # a belt-and-braces guard against a future bug.
        plan_results = await asyncio.gather(
            *[_bounded_brave(kw, site) for kw, site in query_plan],
            return_exceptions=True,
        )

    # Flatten the per-query results into individual URL hits, preserving
    # which keyword/site filter surfaced each URL (for the audit log).
    hits: list[_SearchHit] = []
    for plan_result in plan_results:
        if isinstance(plan_result, BaseException):
            logger.warning("brave query raised: %s", plan_result)
            continue
        kw, site, urls = plan_result
        for url in urls:
            hits.append(_SearchHit(keyword=kw, site_filter=site, url=url))

    # Process hits sequentially — see the comment on ``brave_semaphore``.
    deduped = 0
    seen_parse_keys: set[tuple[str | None, str]] = set()
    for hit in hits:
        urls_examined += 1

        # Cheap pre-probe grouping: 20 result URLs for the same board all
        # parse to the same (provider, slug). Probing each one cost up to
        # 20 sequential detect_ats round-trips per company before this.
        parse_key = _parse_input(hit.url)
        if parse_key in seen_parse_keys:
            deduped += 1
            continue
        seen_parse_keys.add(parse_key)

        # Known-token short-circuit: for the slug-token providers the
        # parsed slug IS the board_token, so a URL on a board we already
        # poll needs no probe at all. (Composite-token providers like
        # Workday fall through to the post-probe check below.)
        provider_hint, slug = parse_key
        if provider_hint is not None and slug in existing_tokens:
            duplicates += 1
            _log_discovery(
                supabase,
                target_id=target.id,
                hit=hit,
                detect=None,
                outcome="duplicate",
            )
            continue

        # detect_ats has its own httpx client — it manages probe
        # cadence + provider fallback internally.
        detect = await detect_ats(hit.url)
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
            # ATS classified the URL but the board has no live postings.
            # Polling it would just burn requests on a dead board — skip but
            # log so we can revisit if we change our mind later.
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
            # Insert was rejected (race with another runner, RPC error, or
            # the RPC returned a shape we couldn't interpret). Treat as
            # duplicate for stats; the RPC itself logs the underlying cause.
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
        deduped=deduped,
    )


__all__ = ["DiscoveryRunStats", "run_discovery_for_target"]
