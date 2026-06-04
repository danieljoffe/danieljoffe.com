import asyncio
import hashlib
import logging
import re
from datetime import UTC, datetime
from typing import Any, cast
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from postgrest.types import CountMethod
from supabase import Client

from app.cache import job_list_cache, jobs_cache_prefix, make_cache_key
from app.config import settings
from app.dependencies import (
    get_current_user_id,
    get_current_user_id_optional,
    get_supabase,
    verify_api_key,
    verify_api_key_or_jwt,
)
from app.http_client import (
    ResponseTooLargeError,
    get_with_size_cap,
)
from app.models.schemas import (
    ManualJobRequest,
    ManualJobResponse,
    UrlValidateRequest,
    UrlValidateResponse,
)
from app.models.targets import AxisWeights
from app.services.extract import (
    MANUAL_SOURCE_ID,
    ExtractionResult,
    _extract_from_firecrawl,
    extract_job_from_html,
    extract_salary_from_text,
)
from app.services.fit.axis_weights import display_score_or_passthrough
from app.services.jd_parser import parse_jd
from app.services.sanitize import sanitize_html
from app.services.scoring import strip_html
from app.services.target_scoring import (
    bulk_score_for_target,
    update_global_score,
)
from app.services.target_scoring import (
    score_and_upsert as target_score_and_upsert,
)
from app.services.targets.crud import get as get_target
from app.services.targets.crud import get_active as get_active_target
from app.services.targets.crud import (
    get_user_target,
    get_user_target_ids,
    list_user_targets,
)
from app.services.validate import (
    assert_safe_host,
    is_banned_domain,
    registrable_domain,
    validate_format,
    validate_job_url,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
    dependencies=[Depends(verify_api_key_or_jwt)],
)

_JP_SELECT_COLS = (
    "id, external_id, source_id, title, company_name, location, department, "
    "absolute_url, score, score_breakdown, status, salary_text, "
    "greenhouse_updated_at, first_seen_at, created_at"
)

# Detail-view projection — adds ``description_html`` (and anything else
# that's too heavy for list pages). Used by the per-posting GET so the
# UI can render the JD body in the detail panel; analysis/tailor flows
# already read ``description_html`` directly off ``jobs``.
_JP_DETAIL_SELECT_COLS = _JP_SELECT_COLS + ", description_html"


def _tokenize_search(raw: str | None) -> list[str]:
    """Split a search query into individual tokens. ``"customer director"``
    → ``["customer", "director"]``. Empty/None → ``[]``. Dedupes case-
    insensitively (keeps first-seen casing) so a redundant typo doesn't
    inflate the OR chain."""
    if not raw:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for tok in raw.split():
        t = tok.strip()
        if not t:
            continue
        lo = t.lower()
        if lo in seen:
            continue
        seen.add(lo)
        out.append(t)
    return out


# PostgREST `id=in.(uuid,uuid,...)` is URL-encoded into the query string.
# 200 UUIDs (36 chars each, plus commas and the `id.in.()` wrapper) lands
# around 7.5 KB — well under the proxy + nginx + supabase defaults of
# 8-16 KB. Above ~250 the URL silently truncates and the upstream
# returns plain ``Bad Request`` (not JSON), which then crashes the
# postgrest-py error decoder. ``has_location_filter`` and ``search``
# both force ``page_ids = list(score_lookup.keys())`` — a few thousand
# UUIDs after the May poll-cycle ingest. Chunked.
_IN_CHUNK_SIZE = 200


def _default_min_score_for_user(
    supabase: Client, user_id: str
) -> int | None:
    """Return the user's ``list_min_score`` for use as the default list
    filter when no ``min_score`` chip is set. ``None`` when:

    - the profile row is missing,
    - the column is NULL (user hasn't opted in to a default), or
    - the stored value is 0 (semantic clear — caller wants no floor).

    Decoupled from ``job_score_threshold`` (email notifications) and
    ``sms_score_threshold`` (SMS) because those notification UIs are
    disabled until SMTP / Twilio are configured, leaving users no way
    to tune the list view if it were piggybacked on those fields.
    """
    resp = (
        supabase.table("user_profiles")
        .select("list_min_score")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if resp is None:
        return None
    row = cast(dict[str, Any] | None, resp.data)
    if row is None:
        return None
    value = row.get("list_min_score")
    if not isinstance(value, int) or value <= 0:
        return None
    return value


def _fetch_jobs_chunked(
    supabase: Client,
    page_ids: list[str],
    *,
    status: str | None,
    company: str | None,
    search: str | None,
) -> list[dict[str, Any]]:
    """Fetch ``jobs`` rows for many IDs in chunks, applying the
    status/company/title filters per request. Caller is responsible for
    re-sorting by score after the merge (chunk order is not preserved).

    **Archived exclusion:** when ``status`` is not explicitly supplied
    (i.e. the user is browsing the default mixed view), rows with
    ``status='archived'`` are filtered out. URL-health-check archived
    jobs would otherwise float to the top of the score-sorted list
    even though the user can no longer apply to them. Users who want
    to see archived rows can pass ``status='archived'`` explicitly.
    """
    if not page_ids:
        return []
    out: list[dict[str, Any]] = []
    for i in range(0, len(page_ids), _IN_CHUNK_SIZE):
        chunk = page_ids[i : i + _IN_CHUNK_SIZE]
        q = supabase.table("jobs").select(_JP_SELECT_COLS).in_("id", chunk)
        if status:
            q = q.eq("status", status)
        else:
            q = q.neq("status", "archived")
        if company:
            q = q.eq("company_name", company)
        q = _apply_title_search(q, search)
        resp = q.execute()
        out.extend(cast(list[dict[str, Any]], resp.data or []))
    return out


def _apply_title_search(query: Any, search: str | None) -> Any:
    """Apply a search filter to a query against the jobs.title column.

    - 0 tokens → no filter
    - 1 token → single ``ilike`` (unchanged behaviour, fastest path)
    - 2+ tokens → OR chain so ``"customer director"`` matches titles
      containing EITHER word ("Director of Customer Success" or
      "Customer Experience Lead"). Matches the user's mental model of a
      filter, not a phrase search.

    Each token is escaped for PostgREST's OR-list syntax: commas and
    parens would otherwise terminate the list / change grouping."""
    tokens = _tokenize_search(search)
    if not tokens:
        return query
    if len(tokens) == 1:
        return query.ilike("title", f"%{tokens[0]}%")
    # PostgREST or() takes a comma-separated list. Each token gets ``*``
    # wildcards (PostgREST's ilike uses ``*`` not ``%`` inside or_).
    parts = [f"title.ilike.*{_escape_or_token(t)}*" for t in tokens]
    return query.or_(",".join(parts))


def _escape_or_token(t: str) -> str:
    """PostgREST's or-list grammar uses commas and parens as separators.
    A token with either would be parsed as multiple filters or a group.
    Strip them — they have no semantic value in a search query."""
    return t.replace(",", "").replace("(", "").replace(")", "")


def _list_jobs_for_target_rpc(
    supabase: Client,
    *,
    target_id: str,
    offset: int,
    page: int,
    page_size: int,
    sort: str,
    ascending: bool,
    min_score: int | None,
    status: str | None,
    company: str | None,
    search: str | None,
    exclude_terms: list[str],
    only_terms: list[str],
) -> dict[str, Any]:
    # The RPC paginates server-side with no knowledge of the location
    # filter, so its ``total`` would be the pre-filter count and pages
    # would render half-empty (or empty) once the filter trims rows.
    # Force the fallback two-query path which can fetch the full set
    # and paginate from the post-filter list.
    if exclude_terms or only_terms:
        raise RuntimeError("RPC path skipped: location filter requires post-fetch pagination")
    # Multi-word search ("customer director") should OR each token across
    # the title — the RPC's ``p_search`` is a single ilike, so bypass it
    # whenever the user typed more than one word.
    if search and len(_tokenize_search(search)) > 1:
        raise RuntimeError("RPC path skipped: multi-word search uses OR semantics")
    # Recency decay sorts by ``scores.recency_score``, which the deployed
    # RPC doesn't return or order by. The two-query fallback handles that
    # column directly, so force it when the flag is on.
    if settings.recency_decay_enabled and sort == "score":
        raise RuntimeError("RPC path skipped: recency-decay sort handled in two-query path")
    """List jobs via server-side join RPC (single round-trip)."""
    resp = supabase.rpc(
        "get_target_jobs",
        {
            "p_target_id": target_id,
            "p_min_score": min_score or 0,
            "p_status": status,
            "p_company": company,
            "p_search": search,
            "p_sort": sort,
            "p_ascending": ascending,
            "p_limit": page_size,
            "p_offset": offset,
        },
    ).execute()
    if not isinstance(resp.data, list):
        raise TypeError("RPC get_target_jobs returned non-list response")
    rows = cast(list[dict[str, Any]], resp.data)
    total = rows[0]["total_count"] if rows else 0
    # Strip the total_count helper column from each row
    postings = [{k: v for k, v in r.items() if k != "total_count"} for r in rows]
    return {"postings": postings, "total": total, "page": page, "page_size": page_size}


def _list_jobs_for_target_two_query(
    supabase: Client,
    *,
    target_id: str,
    offset: int,
    page: int,
    page_size: int,
    sort: str,
    ascending: bool,
    min_score: int | None,
    status: str | None,
    company: str | None,
    search: str | None,
    exclude_terms: list[str],
    only_terms: list[str],
    axis_weights: AxisWeights | None = None,
) -> dict[str, Any]:
    """Fallback: two-query pattern with pagination pushed to the scores layer.

    ``axis_weights`` is the per-(user, target) read-time multiplier on
    Phase 2's axis scores. When non-None, the response's per-row ``score``
    field is replaced with the weighted display score computed from
    ``axis_scores``. Sort order is unchanged in this iteration —
    server-side ORDER BY still keys on ``recency_score`` (when decay is
    on) or ``score`` so pagination stays cheap. A future iteration will
    push the weighted sort into Python when weights diverge from
    defaults. See plan-wyrdfold-streamlined-target.md "User-tunable axis
    weights".
    """
    sort_col = "score" if sort == "score" else sort
    # When recency decay is on, the logical "score" sort orders by the
    # decayed ``recency_score`` column instead of the raw fit score.
    # min_score still filters on the raw ``score`` (the user's fit floor
    # is a quality bar, not a recency bar); only the ORDER BY changes.
    order_col = (
        "recency_score"
        if sort_col == "score" and settings.recency_decay_enabled
        else "score"
    )
    has_location_filter = bool(exclude_terms or only_terms)
    ts_query = (
        supabase.table("scores")
        .select(
            "job_posting_id, score, recency_score, score_breakdown, "
            "scoring_status, axis_scores",
            count=CountMethod.exact,
        )
        .eq("target_id", target_id)
        .eq("excluded", False)
    )
    if min_score is not None:
        ts_query = ts_query.gte("score", min_score)

    # Push sort + pagination to the scores query when sorting by score.
    # Chain a deterministic ``job_posting_id`` tiebreaker so rows with
    # identical scores (very common at the same-score buckets) keep a
    # stable position — without this, the last row of page N could
    # reappear as the first row of page N+1.
    if sort_col == "score":
        ts_query = ts_query.order(order_col, desc=not ascending).order(
            "job_posting_id"
        )
    # For non-score sorts we still need all qualifying IDs (sorted in Python after join)
    # but we can at least get the total count from Supabase
    ts_resp = ts_query.execute()
    ts_rows = cast(list[dict[str, Any]], ts_resp.data or [])

    if not ts_rows:
        return {"postings": [], "total": 0, "page": page, "page_size": page_size}

    score_lookup = {r["job_posting_id"]: r for r in ts_rows}

    # For score-sorted queries, paginate at the scores layer — but only if
    # no post-fetch filter can drop rows AFTER that pagination. Location
    # filtering is post-fetch (we don't push it into Supabase), so when
    # it's active we have to load every candidate posting, filter, and
    # paginate from the filtered set — otherwise pagination would show
    # the pre-filter total and pages would render half-empty.
    if (
        sort_col == "score"
        and not status
        and not company
        and not search
        and not has_location_filter
    ):
        page_ids = [r["job_posting_id"] for r in ts_rows[offset : offset + page_size]]
        total = len(ts_rows) if ts_resp.count is None else ts_resp.count
    else:
        page_ids = list(score_lookup.keys())
        total = None  # will be computed after posting-level filters

    postings: list[dict[str, Any]] = _fetch_jobs_chunked(
        supabase, page_ids, status=status, company=company, search=search
    )

    # Overlay target scores. When axis_weights are set for this
    # (user, target) pairing, the displayed ``score`` is the weighted
    # combination of axis_scores; otherwise it's the raw Sonnet score.
    # The original is preserved alongside as ``raw_score`` so the
    # frontend can show both (and so debugging is easy).
    for p in postings:
        ts = score_lookup.get(p["id"])
        if ts:
            raw_score = int(ts["score"])
            p["score"] = display_score_or_passthrough(
                ts.get("axis_scores"), raw_score, axis_weights
            )
            p["raw_score"] = raw_score
            p["score_breakdown"] = ts.get("score_breakdown")
            p["scoring_status"] = ts.get("scoring_status", "stage1")

    # Sort + paginate in Python only when we couldn't do it server-side
    if total is None or sort_col != "score":
        if has_location_filter:
            postings = _apply_location_filter(
                postings,
                exclude_terms=exclude_terms,
                only_terms=only_terms,
            )

        def _sort_key(p: dict[str, Any]) -> Any:
            if sort == "score":
                # Order by recency_score (or raw score when decay is off);
                # read from the scores lookup so we don't leak an internal
                # column into the postings response.
                ts = score_lookup.get(p["id"]) or {}
                return ts.get(order_col) or 0
            val = p.get(sort)
            if val is None:
                return ""
            return val

        postings.sort(key=_sort_key, reverse=not ascending)
        if total is None:
            total = len(postings)
            postings = postings[offset : offset + page_size]
    else:
        # Restore page_ids order — Supabase's in_() filter doesn't preserve
        # list order, so even though page_ids was already sorted by score at
        # the scores layer, the postings query returns rows in storage order.
        order_index = {jid: i for i, jid in enumerate(page_ids)}
        postings.sort(
            key=lambda p: order_index.get(
                p["id"], len(page_ids)
            )
        )

    return {"postings": postings, "total": total, "page": page, "page_size": page_size}


def _list_jobs_for_target(
    supabase: Client,
    *,
    target_id: str,
    offset: int,
    page: int,
    page_size: int,
    sort: str,
    ascending: bool,
    min_score: int | None,
    status: str | None,
    company: str | None,
    search: str | None,
    exclude_terms: list[str],
    only_terms: list[str],
    axis_weights: AxisWeights | None = None,
) -> dict[str, Any]:
    """List jobs for a target view, sorted/paginated by target-specific scores.

    Tries the server-side RPC join first (single round-trip). Falls back to the
    optimized two-query pattern if the RPC function hasn't been deployed yet.
    The two-query path also takes over when location filters are active, since
    the RPC paginates server-side with no knowledge of the location filter.

    When ``axis_weights`` is set we skip the RPC and use the two-query path —
    the RPC doesn't return ``axis_scores`` so it can't apply the overlay. This
    keeps the v1 behaviour: the displayed ``score`` is the weighted blend,
    sort order is unchanged (still raw / recency).
    """
    kwargs: dict[str, Any] = {
        "target_id": target_id,
        "offset": offset,
        "page": page,
        "page_size": page_size,
        "sort": sort,
        "ascending": ascending,
        "min_score": min_score,
        "status": status,
        "company": company,
        "search": search,
        "exclude_terms": exclude_terms,
        "only_terms": only_terms,
    }
    if axis_weights is not None:
        return _list_jobs_for_target_two_query(
            supabase, axis_weights=axis_weights, **kwargs
        )
    try:
        return _list_jobs_for_target_rpc(supabase, **kwargs)
    except Exception:
        logger.debug("RPC get_target_jobs unavailable, falling back to two-query pattern")
        return _list_jobs_for_target_two_query(supabase, **kwargs)


def _list_jobs_across_user_targets(
    supabase: Client,
    *,
    user_target_ids: set[str],
    offset: int,
    page: int,
    page_size: int,
    sort: str,
    ascending: bool,
    min_score: int | None,
    status: str | None,
    company: str | None,
    search: str | None,
    exclude_terms: list[str],
    only_terms: list[str],
    weights_by_target: dict[str, AxisWeights] | None = None,
) -> dict[str, Any]:
    """Untargeted list — returns the union of jobs scored against any of the
    user's active targets, deduplicated by job id.

    Two-query pattern, mirroring ``_list_jobs_for_target_two_query`` but
    aggregating by ``max(score)`` across the user's targets so each job
    appears once.

    ``weights_by_target`` maps target_id → AxisWeights for any user-target
    pairing with custom weights set; absent / None means use raw score.
    The displayed ``score`` per row applies the weights for that row's
    target. The deduplication still keys on raw ``max(score)`` so the
    "best representative target" picked per job is stable across users
    with different weights (only the displayed number differs).
    """
    sort_col = "score" if sort == "score" else sort
    # See ``_list_jobs_for_target_two_query``: the "score" sort orders by
    # the decayed ``recency_score`` when the flag is on; min_score still
    # filters on the raw fit score.
    order_col = (
        "recency_score"
        if sort_col == "score" and settings.recency_decay_enabled
        else "score"
    )

    score_query = (
        supabase.table("scores")
        .select(
            "job_posting_id, target_id, score, recency_score, "
            "axis_scores, score_breakdown, scoring_status"
        )
        .in_("target_id", list(user_target_ids))
        .eq("excluded", False)
    )
    if min_score is not None:
        score_query = score_query.gte("score", min_score)
    score_resp = score_query.execute()
    score_rows = cast(list[dict[str, Any]], score_resp.data or [])

    if not score_rows:
        return {"postings": [], "total": 0, "page": page, "page_size": page_size}

    # Per-job: take the highest score across this user's targets.
    best: dict[str, dict[str, Any]] = {}
    for row in score_rows:
        jid = row["job_posting_id"]
        existing = best.get(jid)
        if existing is None or row["score"] > existing["score"]:
            best[jid] = row

    has_location_filter = bool(exclude_terms or only_terms)
    if (
        sort_col == "score"
        and not status
        and not company
        and not search
        and not has_location_filter
    ):
        # Sort + paginate at the scores layer when no post-fetch filter
        # could drop rows AFTER that pagination (location is post-fetch,
        # so when it's active we have to filter the full set first).
        # ``(score, job_posting_id)`` tuple key gives a deterministic
        # tiebreaker — without the id leg, rows with identical scores
        # could reorder between paginated calls (Python's ``sorted`` is
        # stable, but only with respect to the input order, and the
        # input order is itself non-deterministic since ``best.keys()``
        # iterates a dict).
        ranked_ids = sorted(
            best.keys(),
            key=lambda jid: (best[jid].get(order_col) or 0, jid),
            reverse=not ascending,
        )
        page_ids = ranked_ids[offset : offset + page_size]
        total: int | None = len(ranked_ids)
    else:
        page_ids = list(best.keys())
        total = None  # recomputed after posting-level filters

    if not page_ids:
        return {"postings": [], "total": total or 0, "page": page, "page_size": page_size}

    postings: list[dict[str, Any]] = _fetch_jobs_chunked(
        supabase, page_ids, status=status, company=company, search=search
    )

    weights_by_target = weights_by_target or {}
    for p in postings:
        ts = best.get(p["id"])
        if ts:
            raw_score = int(ts["score"])
            tid = cast(str | None, ts.get("target_id"))
            w = weights_by_target.get(tid) if tid else None
            p["score"] = display_score_or_passthrough(
                ts.get("axis_scores"), raw_score, w
            )
            p["raw_score"] = raw_score
            p["score_breakdown"] = ts.get("score_breakdown")
            p["scoring_status"] = ts.get("scoring_status", "stage1")

    if total is None or sort_col != "score":
        if has_location_filter:
            postings = _apply_location_filter(
                postings,
                exclude_terms=exclude_terms,
                only_terms=only_terms,
            )

        def _sort_key(p: dict[str, Any]) -> Any:
            if sort == "score":
                # Order by recency_score (or raw score when decay is off);
                # read from the per-job best-score lookup so we don't leak
                # an internal column into the postings response.
                ts = best.get(p["id"]) or {}
                return ts.get(order_col) or 0
            val = p.get(sort)
            if val is None:
                return ""
            return val

        postings.sort(key=_sort_key, reverse=not ascending)
        if total is None:
            total = len(postings)
            postings = postings[offset : offset + page_size]
    else:
        # Restore page_ids order — Supabase's in_() filter doesn't preserve
        # list order, so even though page_ids was already sorted by score at
        # the scores layer, the postings query returns rows in storage order.
        order_index = {jid: i for i, jid in enumerate(page_ids)}
        postings.sort(
            key=lambda p: order_index.get(
                p["id"], len(page_ids)
            )
        )

    return {"postings": postings, "total": total, "page": page, "page_size": page_size}


# Sync `def` so FastAPI runs each request in a threadpool worker. The body
# makes multiple blocking supabase `.execute()` calls; `async def` would block
# the event loop and serialize concurrent /jobs reads.


def _parse_location_list(raw: str | None) -> list[str]:
    """Split a comma-separated filter (e.g. ``"India, Brazil, Berlin"``) into
    individual trimmed terms. Empty/None → empty list. Terms are lowercased
    here because the Python-side post-filter does case-insensitive substring
    matching against ``job.location`` (which is stored mixed-case)."""
    if not raw:
        return []
    return [t.strip().lower() for t in raw.split(",") if t.strip()]


# Curated synonyms for short, ambiguous location-filter tokens.
# The previous naive ``term in loc`` matched "us" against "A-us-tin"
# (Austin), "u-s-er" patterns, etc. — any 2-letter code collides with
# fragments of longer words. For these short codes we match at word
# boundaries and expand to common synonyms. Longer terms (≥4 chars)
# fall through to substring matching, which is forgiving for partial
# matches like "California" in "Northern California".
_LOCATION_SYNONYMS: dict[str, frozenset[str]] = {
    "us": frozenset({"us", "usa", "u.s.", "u.s.a.", "united states"}),
    "uk": frozenset({"uk", "u.k.", "united kingdom"}),
    "eu": frozenset({"eu", "europe", "european union"}),
    # "ca" intentionally NOT here — collides with California (US state).
    # Users wanting Canada should search "canada" explicitly.
}


def _term_matches_location(term: str, location_lower: str) -> bool:
    """True when ``term`` matches ``location_lower`` either via curated
    synonym word-boundary check (short codes) or substring (longer
    terms)."""
    candidates = _LOCATION_SYNONYMS.get(term, {term})
    for candidate in candidates:
        if len(candidate) <= 3:
            if re.search(rf"\b{re.escape(candidate)}\b", location_lower):
                return True
        elif candidate in location_lower:
            return True
    return False


def _location_passes(
    location: str | None,
    *,
    exclude_terms: list[str],
    only_terms: list[str],
) -> bool:
    """True when a posting's ``location`` should be visible under the user's
    location filter. ``only_terms`` is OR (any match wins). ``exclude_terms``
    is OR (any match excludes). Missing location is OK for ``only_terms``
    (we can't prove it doesn't match) but excluded only when a term explicitly
    targets ``""`` — the typical case keeps it visible.

    Matching: word-boundary check for 2-3 char tokens + synonyms (so
    "us" doesn't match "Austin"); substring for longer terms. See
    ``_term_matches_location``.

    Note: when ``only_terms`` is set and the location is None/empty,
    this returns False — we can't confirm a match. This matches the
    pre-fix behaviour. If users start complaining about jobs being
    hidden when Greenhouse omits location, flip this to "include
    unknown" with a Sentry log so we know the population at risk.
    """
    loc = (location or "").lower()
    if only_terms and not any(
        _term_matches_location(term, loc) for term in only_terms
    ):
        return False
    return not (
        exclude_terms
        and any(_term_matches_location(term, loc) for term in exclude_terms)
    )


def _apply_location_filter(
    postings: list[dict[str, Any]],
    *,
    exclude_terms: list[str],
    only_terms: list[str],
) -> list[dict[str, Any]]:
    """Drop postings whose ``location`` field fails the include/exclude
    terms. Applied post-fetch so we don't have to thread Supabase ``or_``
    chains through every list-jobs path; the trade-off is that pagination
    becomes approximate (a page can shrink when the filter trims rows),
    which matches how ``status``/``search`` already work in the two-query
    fallback path. Acceptable for an opt-in filter that most users won't
    enable."""
    if not exclude_terms and not only_terms:
        return postings
    return [
        p
        for p in postings
        if _location_passes(
            p.get("location"),
            exclude_terms=exclude_terms,
            only_terms=only_terms,
        )
    ]


@router.get("")
def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("score", pattern="^(score|created_at|company_name|title)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    min_score: int | None = Query(None, ge=0, le=100),
    status: str | None = Query(
        None,
        pattern="^(new|saved|resume_draft|resume_ready|applied|interviewing|offer|rejected|archived)$",
    ),
    company: str | None = Query(None, max_length=200),
    search: str | None = Query(None, max_length=200),
    target_id: str | None = Query(None),
    exclude_locations: str | None = Query(None, max_length=500),
    only_locations: str | None = Query(None, max_length=500),
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> dict[str, Any]:
    exclude_terms = _parse_location_list(exclude_locations)
    only_terms = _parse_location_list(only_locations)
    offset = (page - 1) * page_size
    ascending = order == "asc"

    # Check cache (60s TTL — data only changes on poll/manual-add cycles).
    # user_id participates in the key so per-user views (saved/dismissed,
    # future filtering) never cross-leak between accounts.
    cache_key = make_cache_key(
        jobs_cache_prefix(target_id=target_id),
        page=page,
        page_size=page_size,
        sort=sort,
        order=order,
        min_score=min_score,
        status=status,
        company=company,
        search=search,
        # Comma-joined here so two callers with the same set of terms in
        # different order share a cache entry. Terms are already lowercased
        # by ``_parse_location_list``.
        exclude_locations=",".join(sorted(exclude_terms)) or None,
        only_locations=",".join(sorted(only_terms)) or None,
        user_id=user_id,
    )
    cached: dict[str, Any] | None = job_list_cache.get(cache_key)
    if cached is not None:
        return cached

    # JWT callers see only postings whose target_id is in their user_targets.
    # The api-key path (cron/poller) bypasses scoping — it operates on the
    # whole table by design (e.g. backfill, rescore-all, cost rollup).
    user_target_ids: set[str] | None = None
    if user_id is not None:
        user_target_ids = get_user_target_ids(supabase, user_id)
        if not user_target_ids:
            empty: dict[str, Any] = {
                "postings": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "applied_min_score": min_score,
            }
            job_list_cache.set(cache_key, empty)
            return empty
        if target_id and target_id not in user_target_ids:
            empty = {
                "postings": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "applied_min_score": min_score,
            }
            job_list_cache.set(cache_key, empty)
            return empty

    # When no chip is set, fall back to the user's stored threshold —
    # historically ``user_profiles.job_score_threshold`` only gated SMS
    # notifications, so a senior user with threshold 70 still saw 5k+
    # rows of noise in the list. Caller can pass ``min_score=0`` to
    # explicitly opt out of the default; ``applied_min_score`` is
    # echoed in the response so the UI can render a "filtered to ≥N"
    # chip with a clear affordance.
    if min_score is None and user_id is not None:
        min_score = _default_min_score_for_user(supabase, user_id)

    # Target view: sort/paginate by target-specific scores
    if target_id:
        # Per-pairing axis weights override the displayed score for this
        # user's target view. JWT-only — api-key callers get raw scores
        # (no user identity to scope weights by).
        axis_weights: AxisWeights | None = None
        if user_id is not None:
            ut = get_user_target(supabase, user_id, target_id)
            if ut is not None:
                axis_weights = ut.axis_weights
        result = _list_jobs_for_target(
            supabase,
            target_id=target_id,
            offset=offset,
            page=page,
            page_size=page_size,
            sort=sort,
            ascending=ascending,
            min_score=min_score,
            status=status,
            company=company,
            search=search,
            exclude_terms=exclude_terms,
            only_terms=only_terms,
            axis_weights=axis_weights,
        )
        result["applied_min_score"] = min_score
        job_list_cache.set(cache_key, result)
        return result

    # Untargeted list — for JWT callers, return the union of jobs scored
    # against any of the user's active targets (deduplicated). For api-key
    # callers (cron/poller) we keep the old "table scan" path: they need
    # to operate on the whole table by design (rescore-all, backfill).
    if user_target_ids is not None:
        # Build target_id -> AxisWeights map for any pairings that have
        # custom weights set. Missing entries fall through to raw score.
        weights_by_target: dict[str, AxisWeights] = {}
        for ut in list_user_targets(supabase, user_id):  # type: ignore[arg-type]
            if ut.axis_weights is not None:
                weights_by_target[ut.target_id] = ut.axis_weights
        result = _list_jobs_across_user_targets(
            supabase,
            user_target_ids=user_target_ids,
            offset=offset,
            page=page,
            page_size=page_size,
            sort=sort,
            ascending=ascending,
            min_score=min_score,
            status=status,
            company=company,
            search=search,
            exclude_terms=exclude_terms,
            only_terms=only_terms,
            weights_by_target=weights_by_target or None,
        )
        result["applied_min_score"] = min_score
        job_list_cache.set(cache_key, result)
        return result

    # Operator path (api-key, no JWT): full table view, no target scoping.
    query = supabase.table("jobs").select(
        _JP_SELECT_COLS,
        count=CountMethod.exact,
    )
    if min_score is not None:
        query = query.gte("score", min_score)
    if status:
        query = query.eq("status", status)
    else:
        # Default: hide archived. Operators wanting an archive audit
        # can pass status='archived' explicitly.
        query = query.neq("status", "archived")
    if company:
        query = query.eq("company_name", company)
    query = _apply_title_search(query, search)

    has_location_filter = bool(exclude_terms or only_terms)
    if has_location_filter:
        # Location is post-fetch — server-side ``.range()`` would return
        # a pre-filter page whose total is wrong and whose contents may
        # mostly get trimmed. Fetch the full (pre-location) set ordered
        # server-side, filter in Python, then paginate from the result.
        query = query.order(sort, desc=not ascending)
        resp = query.execute()
        all_rows = cast(list[dict[str, Any]], list(resp.data or []))
        filtered = _apply_location_filter(
            all_rows,
            exclude_terms=exclude_terms,
            only_terms=only_terms,
        )
        operator_result: dict[str, Any] = {
            "postings": filtered[offset : offset + page_size],
            "total": len(filtered),
            "page": page,
            "page_size": page_size,
        }
    else:
        query = query.order(sort, desc=not ascending).range(
            offset, offset + page_size - 1
        )
        resp = query.execute()
        operator_result = {
            "postings": cast(list[dict[str, Any]], list(resp.data or [])),
            "total": resp.count or 0,
            "page": page,
            "page_size": page_size,
            "applied_min_score": min_score,
        }
    job_list_cache.set(cache_key, operator_result)
    return operator_result


@router.post("/validate-url")
async def validate_url(body: UrlValidateRequest) -> UrlValidateResponse:
    result = await validate_job_url(body.url)
    return UrlValidateResponse(
        is_valid=result.is_valid,
        final_url=result.final_url,
        warnings=result.warnings,
        rejection_reason=result.rejection_reason,
    )


@router.post("/manual")
async def add_manual_job(
    body: ManualJobRequest,
    supabase: Client = Depends(get_supabase),
) -> ManualJobResponse:
    """Add a job posting by URL. Extracts metadata via cascade."""
    warnings: list[str] = []

    # Layer 1: Format validation
    cleaned = validate_format(body.url)
    if cleaned is None:
        raise HTTPException(status_code=400, detail="Malformed URL")

    # Layer 2: Banned domain check
    hostname = urlparse(cleaned).hostname or ""
    if is_banned_domain(hostname):
        raise HTTPException(
            status_code=400,
            detail=f"Banned domain: {registrable_domain(hostname)}",
        )

    # SSRF defense — refuse to fetch URLs that resolve to private/internal IPs.
    try:
        assert_safe_host(hostname)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Fetch the page with a hard size cap — without this, a user
    # pasting a URL to a multi-GB payload (CDN downloads, infinite
    # streams) would OOM the API, since ``client.get()`` buffers the
    # whole body before returning. ``get_with_size_cap`` streams and
    # aborts past ``MAX_USER_FETCH_BYTES``.
    try:
        resp, body_bytes = await get_with_size_cap(cleaned)
        final_url = str(resp.url)
    except ResponseTooLargeError as exc:
        raise HTTPException(
            status_code=413,
            detail=f"Page too large to fetch ({exc.size} bytes > {exc.limit}).",
        ) from exc
    except httpx.HTTPError:
        raise HTTPException(status_code=400, detail="Failed to fetch URL") from None

    # Check post-redirect domain
    final_hostname = urlparse(final_url).hostname or ""
    if is_banned_domain(final_hostname):
        raise HTTPException(
            status_code=400,
            detail=f"Redirects to banned domain: {registrable_domain(final_hostname)}",
        )
    if final_hostname and final_hostname != hostname:
        try:
            assert_safe_host(final_hostname)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Redirect target rejected: {exc}",
            ) from exc
    if registrable_domain(hostname) != registrable_domain(final_hostname):
        warnings.append(
            f"redirect_domain_change:"
            f"{registrable_domain(hostname)}->"
            f"{registrable_domain(final_hostname)}"
        )

    # Extract metadata. ``body_bytes`` came from the size-capped
    # streaming read; ``resp.text`` is empty here because the stream
    # was consumed manually, so decode the bytes ourselves.
    html = (
        body_bytes.decode("utf-8", errors="replace")
        if resp.status_code == 200
        else ""
    )
    extraction: ExtractionResult
    if html:
        extraction = extract_job_from_html(html, final_url)
    else:
        warnings.append(f"http_status:{resp.status_code}")
        extraction = ExtractionResult(tier="none", warnings=["fetch_non_200"])

    # Tier 3: Firecrawl fallback if extraction found nothing
    if extraction.tier == "none":
        fc_result = await _extract_from_firecrawl(final_url)
        if fc_result.tier != "none":
            extraction = fc_result
        else:
            warnings.extend(fc_result.warnings)

    warnings.extend(extraction.warnings)

    # Merge: user overrides take precedence
    title = body.title or extraction.title
    company_name = body.company_name or extraction.company_name or ""
    location = body.location or extraction.location
    description_html = extraction.description_html or ""

    extracted_summary = {
        "title": extraction.title,
        "company_name": extraction.company_name,
        "location": extraction.location,
    }

    # If no title, return partial result asking for manual fields
    if not title:
        return ManualJobResponse(
            success=False,
            extracted=extracted_summary,
            extraction_tier=extraction.tier,
            warnings=warnings,
            needs_manual_fields=True,
        )

    # Generate external_id from URL — must be numeric (bigint column)
    external_id = str(int(hashlib.sha256(final_url.encode()).hexdigest()[:15], 16))

    # Extract salary from extraction result or description
    salary = extraction.salary_text
    if not salary and description_html:
        salary = extract_salary_from_text(strip_html(description_html))

    # Upsert into jobs (score starts at 0, updated by target pipeline)
    row: dict[str, Any] = {
        "external_id": external_id,
        "source_id": MANUAL_SOURCE_ID,
        "title": title,
        "company_name": company_name,
        "location": location,
        "department": None,
        "description_html": sanitize_html(description_html) if description_html else "",
        "absolute_url": final_url,
        "score": 0,
        "score_breakdown": {},
        "greenhouse_updated_at": datetime.now(UTC).isoformat(),
        "salary_text": salary,
    }

    resp_db = (
        supabase.table("jobs")
        .upsert(row, on_conflict="source_id,external_id")
        .execute()
    )

    posting_id = None
    if resp_db.data:
        data = cast(dict[str, Any], resp_db.data[0])
        posting_id = data.get("id")

    # Score against all active targets (stages 1+2 inline for manual entry).
    # Each per-target scoring call is independent and IO-bound (the Supabase
    # SDK is sync, so we hand each one to the threadpool and gather). For 10
    # active targets this turns ~10 sequential round-trips into ~1 wall-time.
    if posting_id and title:
        active_targets = get_active_target(supabase)
        parsed = parse_jd(description_html)
        results = await asyncio.gather(
            *[
                asyncio.to_thread(
                    target_score_and_upsert,
                    supabase,
                    job_posting_id=posting_id,
                    title=title,
                    description_html=description_html,
                    target=t,
                    parsed_jd=parsed,
                )
                for t in active_targets
            ],
            return_exceptions=True,
        )
        for t, result in zip(active_targets, results, strict=True):
            if isinstance(result, BaseException):
                logger.error(
                    "Target scoring failed for manual job %s target %s",
                    posting_id,
                    t.id,
                    exc_info=result,
                )
        try:
            update_global_score(supabase, posting_id)
        except Exception:
            logger.exception("Global score update failed for manual job %s", posting_id)

        # Force-include this posting in the user's /jobs view regardless of
        # what the negative-keyword pass decided. The scorer flags
        # ``excluded=True`` whenever a negative keyword matches in the title
        # or any "requirements"/"default" section of the JD — perfectly
        # sensible for the poller (which fires for jobs nobody asked for),
        # but wrong here: the user explicitly pasted this URL. Mentions of
        # "mentor junior engineers" or "collaborate with the data analyst
        # team" silently buried the job. Keep the score breakdown honest
        # (the negative penalty stays in the breakdown so the badge color
        # still tells the user this isn't a great fit) but make the row
        # visible so the user can act on it.
        try:
            supabase.table("scores").update({"excluded": False}).eq(
                "job_posting_id", posting_id
            ).execute()
        except Exception:
            logger.exception(
                "Force-include update failed for manual job %s", posting_id
            )

    # Invalidate job list cache after adding a new posting
    job_list_cache.invalidate()

    return ManualJobResponse(
        success=True,
        posting_id=posting_id,
        extracted=extracted_summary,
        extraction_tier=extraction.tier,
        warnings=warnings,
        needs_manual_fields=False,
    )


@router.post("/rescore/{target_id}", dependencies=[Depends(verify_api_key)])
async def rescore_for_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Re-score all jobs against a target's scoring profile.

    Admin / operator-only: gated by ``verify_api_key`` so an
    unauthenticated caller can't trigger an O(jobs × scoring_keywords)
    DB-heavy re-score by hitting the API directly. Not reachable from
    the wyrdfold FE — only invoked manually from the operator console
    or from CLI scripts that supply the api key.
    """
    target = get_target(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    scored = bulk_score_for_target(supabase, target)
    job_list_cache.invalidate()
    return {"target_id": target_id, "jobs_scored": scored}


@router.post("/backfill-salary", dependencies=[Depends(verify_api_key)])
async def backfill_salary(
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """One-off: extract salary from description_html for jobs missing salary_text.

    Per batch of 500, extract salaries in Python then write all rows in a
    single `bulk_update_salaries` RPC — turns ~N row-by-row UPDATEs
    into one statement per batch.

    Admin-only: gated by ``verify_api_key`` so an unauthenticated
    caller can't trigger a full-table scan + per-row salary extraction.
    Not reachable from the wyrdfold FE.
    """
    batch_size = 500
    offset = 0
    updated = 0

    while True:
        resp = (
            supabase.table("jobs")
            .select("id, description_html")
            .is_("salary_text", "null")
            .range(offset, offset + batch_size - 1)
            .execute()
        )
        rows = cast(list[dict[str, Any]], resp.data or [])
        if not rows:
            break

        updates: list[dict[str, Any]] = []
        for row in rows:
            html = row.get("description_html") or ""
            if not html:
                continue
            salary = extract_salary_from_text(strip_html(html))
            if salary:
                updates.append({"id": row["id"], "salary_text": salary})

        if updates:
            supabase.rpc(
                "bulk_update_salaries", {"p_updates": updates}
            ).execute()
            updated += len(updates)

        if len(rows) < batch_size:
            break
        offset += batch_size

    job_list_cache.invalidate()
    return {"updated": updated}


def _assert_user_owns_posting(
    supabase: Client,
    posting_id: str,
    user_id: str,
    *,
    include_description: bool = False,
) -> dict[str, Any]:
    """Look up a posting and verify the caller is linked (via
    ``user_targets``) to at least one target that has scored this
    posting. 404 on either missing or unowned (don't leak existence of
    postings outside the user's targets).

    ``include_description=True`` adds ``description_html`` to the
    projection — needed by the per-posting detail GET, omitted from the
    other callers (delete, ownership-only checks) so we don't move the
    full JD body across the wire on every status mutation.

    Ownership is derived through ``scores``: the poller writes
    ``scores`` rows keyed by ``(job_posting_id, target_id)``, while
    ``jobs.target_id`` is **not** populated. Checking ``jobs.target_id``
    directly (the previous shape) always 404'd on real postings. This
    mirrors the fix applied in ``status.py`` (PR #676) — same root
    cause, separate copy of the helper.
    """
    # 1. Fetch the posting (and projection).
    select_cols = (
        _JP_DETAIL_SELECT_COLS if include_description else _JP_SELECT_COLS
    )
    posting_resp = (
        supabase.table("jobs")
        .select(select_cols)
        .eq("id", posting_id)
        .limit(1)
        .execute()
    )
    rows = posting_resp.data or []
    if not rows or not isinstance(rows[0], dict):
        raise HTTPException(status_code=404, detail="Posting not found")
    row = cast(dict[str, Any], rows[0])

    # 2. Resolve the caller's target ids.
    user_targets_resp = (
        supabase.table("user_targets")
        .select("target_id")
        .eq("user_id", user_id)
        .execute()
    )
    user_target_ids = {
        cast(dict[str, Any], r)["target_id"]
        for r in user_targets_resp.data or []
    }
    if not user_target_ids:
        raise HTTPException(status_code=404, detail="Posting not found")

    # 3. Confirm at least one of the user's targets has a score row for
    # this posting. Exposing the matched target_id on the returned row
    # so callers can scope cache invalidation, mirroring the old
    # ``jobs.target_id`` contract. Also pull ``score`` + ``score_breakdown``
    # so detail callers can overlay them — ``jobs.score`` and
    # ``jobs.score_breakdown`` are vestigial pre-shared-targets columns
    # that the poller doesn't update (it writes ``scores``), so reading
    # them directly off the posting row yields stale ``0`` / ``{}``.
    score_resp = (
        supabase.table("scores")
        .select("target_id, score, score_breakdown")
        .eq("job_posting_id", posting_id)
        .in_("target_id", list(user_target_ids))
        .order("score", desc=True)
        .limit(1)
        .execute()
    )
    score_rows = cast(list[dict[str, Any]], score_resp.data or [])
    if not score_rows:
        raise HTTPException(status_code=404, detail="Posting not found")
    best = score_rows[0]
    row["target_id"] = best["target_id"]
    # Stash the live score onto the row under an alias so callers can opt
    # in to the overlay without changing the existing ``score`` /
    # ``score_breakdown`` semantics on routes that don't need it.
    row["_target_score"] = best.get("score")
    row["_target_score_breakdown"] = best.get("score_breakdown")
    return row


@router.get("/{posting_id}")
async def get_job(
    posting_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    # Detail GET pulls ``description_html`` so the UI can render the JD
    # body. The list endpoint deliberately omits it for payload size, but
    # there's no rendering of a single posting without the JD text.
    row = _assert_user_owns_posting(
        supabase, posting_id, user_id, include_description=True
    )
    # Overlay the live per-target score + breakdown. The ``jobs.score`` /
    # ``jobs.score_breakdown`` columns are vestigial and never updated
    # by the poller — without this, the detail view reads stale ``0`` /
    # ``{}`` and the "Score Breakdown" panel renders "No factors
    # contributed to this score" for every posting. Use the best score
    # across the user's targets (matches the untargeted list view's
    # per-job aggregation).
    target_score = row.pop("_target_score", None)
    target_breakdown = row.pop("_target_score_breakdown", None)
    if target_score is not None:
        row["score"] = target_score
    if target_breakdown is not None:
        row["score_breakdown"] = target_breakdown
    # Drop the helper target_id column we only fetched for ownership.
    row.pop("target_id", None)
    return row


@router.delete("/{posting_id}")
async def delete_job(
    posting_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    _assert_user_owns_posting(supabase, posting_id, user_id)
    resp = (
        supabase.table("jobs")
        .delete()
        .eq("id", posting_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Posting not found")

    job_list_cache.invalidate()
    return {"success": True, "deleted_id": posting_id}
