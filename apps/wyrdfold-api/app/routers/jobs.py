import asyncio
import hashlib
import logging
from datetime import UTC, datetime
from typing import Any, cast
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from postgrest.types import CountMethod
from supabase import Client

from app.cache import job_list_cache, jobs_cache_prefix, make_cache_key
from app.dependencies import (
    get_current_user_id,
    get_current_user_id_optional,
    get_supabase,
    verify_api_key_or_jwt,
)
from app.http_client import get_http_client
from app.models.schemas import (
    ManualJobRequest,
    ManualJobResponse,
    UrlValidateRequest,
    UrlValidateResponse,
)
from app.services.extract import (
    MANUAL_SOURCE_ID,
    ExtractionResult,
    _extract_from_firecrawl,
    extract_job_from_html,
    extract_salary_from_text,
)
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
from app.services.targets.crud import get_user_target_ids
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
) -> dict[str, Any]:
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
) -> dict[str, Any]:
    """Fallback: two-query pattern with pagination pushed to the scores layer."""
    sort_col = "score" if sort == "score" else sort
    ts_query = (
        supabase.table("scores")
        .select("job_posting_id, score, score_breakdown, scoring_status", count=CountMethod.exact)
        .eq("target_id", target_id)
        .eq("excluded", False)
    )
    if min_score is not None:
        ts_query = ts_query.gte("score", min_score)

    # Push sort + pagination to the scores query when sorting by score
    if sort_col == "score":
        ts_query = ts_query.order("score", desc=not ascending)
    # For non-score sorts we still need all qualifying IDs (sorted in Python after join)
    # but we can at least get the total count from Supabase
    ts_resp = ts_query.execute()
    ts_rows = cast(list[dict[str, Any]], ts_resp.data or [])

    if not ts_rows:
        return {"postings": [], "total": 0, "page": page, "page_size": page_size}

    score_lookup = {r["job_posting_id"]: r for r in ts_rows}

    # For score-sorted queries, paginate at the scores layer
    if sort_col == "score" and not status and not company and not search:
        page_ids = [r["job_posting_id"] for r in ts_rows[offset : offset + page_size]]
        total = len(ts_rows) if ts_resp.count is None else ts_resp.count
    else:
        page_ids = list(score_lookup.keys())
        total = None  # will be computed after posting-level filters

    jp_query = (
        supabase.table("jobs")
        .select(_JP_SELECT_COLS)
        .in_("id", page_ids)
    )
    if status:
        jp_query = jp_query.eq("status", status)
    if company:
        jp_query = jp_query.eq("company_name", company)
    if search:
        jp_query = jp_query.ilike("title", f"%{search}%")

    jp_resp = jp_query.execute()
    postings = list(jp_resp.data or [])

    # Overlay target scores
    for posting in postings:
        p = cast(dict[str, Any], posting)
        ts = score_lookup.get(p["id"])
        if ts:
            p["score"] = ts["score"]
            p["score_breakdown"] = ts.get("score_breakdown")
            p["scoring_status"] = ts.get("scoring_status", "stage1")

    # Sort + paginate in Python only when we couldn't do it server-side
    if total is None or sort_col != "score":
        def _sort_key(p: Any) -> Any:
            val = cast(dict[str, Any], p).get(sort)
            if val is None:
                return 0 if sort == "score" else ""
            return val

        postings.sort(key=_sort_key, reverse=not ascending)
        if total is None:
            total = len(postings)
            postings = postings[offset : offset + page_size]

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
) -> dict[str, Any]:
    """List jobs for a target view, sorted/paginated by target-specific scores.

    Tries the server-side RPC join first (single round-trip). Falls back to the
    optimized two-query pattern if the RPC function hasn't been deployed yet.
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
    }
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
) -> dict[str, Any]:
    """Untargeted list — returns the union of jobs scored against any of the
    user's active targets, deduplicated by job id.

    Two-query pattern, mirroring ``_list_jobs_for_target_two_query`` but
    aggregating by ``max(score)`` across the user's targets so each job
    appears once. Replaces the previous "global view" path which filtered
    by ``jobs.target_id`` — a column the poller never populates, so that
    filter rejected every row.
    """
    sort_col = "score" if sort == "score" else sort

    score_query = (
        supabase.table("scores")
        .select("job_posting_id, target_id, score, score_breakdown, scoring_status")
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

    if sort_col == "score" and not status and not company and not search:
        # Sort + paginate at the scores layer when no posting-level filters
        # require us to load every candidate posting first.
        ranked_ids = sorted(
            best.keys(),
            key=lambda jid: best[jid]["score"],
            reverse=not ascending,
        )
        page_ids = ranked_ids[offset : offset + page_size]
        total: int | None = len(ranked_ids)
    else:
        page_ids = list(best.keys())
        total = None  # recomputed after posting-level filters

    if not page_ids:
        return {"postings": [], "total": total or 0, "page": page, "page_size": page_size}

    jp_query = supabase.table("jobs").select(_JP_SELECT_COLS).in_("id", page_ids)
    if status:
        jp_query = jp_query.eq("status", status)
    if company:
        jp_query = jp_query.eq("company_name", company)
    if search:
        jp_query = jp_query.ilike("title", f"%{search}%")
    jp_resp = jp_query.execute()
    postings = list(jp_resp.data or [])

    for posting in postings:
        p = cast(dict[str, Any], posting)
        ts = best.get(p["id"])
        if ts:
            p["score"] = ts["score"]
            p["score_breakdown"] = ts.get("score_breakdown")
            p["scoring_status"] = ts.get("scoring_status", "stage1")

    if total is None or sort_col != "score":

        def _sort_key(p: Any) -> Any:
            val = cast(dict[str, Any], p).get(sort)
            if val is None:
                return 0 if sort == "score" else ""
            return val

        postings.sort(key=_sort_key, reverse=not ascending)
        if total is None:
            total = len(postings)
            postings = postings[offset : offset + page_size]

    return {"postings": postings, "total": total, "page": page, "page_size": page_size}


# Sync `def` so FastAPI runs each request in a threadpool worker. The body
# makes multiple blocking supabase `.execute()` calls; `async def` would block
# the event loop and serialize concurrent /jobs reads.


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
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> dict[str, Any]:
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
            }
            job_list_cache.set(cache_key, empty)
            return empty
        if target_id and target_id not in user_target_ids:
            empty = {
                "postings": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
            }
            job_list_cache.set(cache_key, empty)
            return empty

    # Target view: sort/paginate by target-specific scores
    if target_id:
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
        )
        job_list_cache.set(cache_key, result)
        return result

    # Untargeted list — for JWT callers, return the union of jobs scored
    # against any of the user's active targets (deduplicated). For api-key
    # callers (cron/poller) we keep the old "table scan" path: they need
    # to operate on the whole table by design (rescore-all, backfill).
    if user_target_ids is not None:
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
        )
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
    if company:
        query = query.eq("company_name", company)
    if search:
        query = query.ilike("title", f"%{search}%")

    query = query.order(sort, desc=not ascending).range(offset, offset + page_size - 1)
    resp = query.execute()

    operator_result: dict[str, Any] = {
        "postings": list(resp.data or []),
        "total": resp.count or 0,
        "page": page,
        "page_size": page_size,
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

    # Fetch the page
    client = get_http_client()
    try:
        resp = await client.get(cleaned)
        final_url = str(resp.url)
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

    # Extract metadata
    html = resp.text if resp.status_code == 200 else ""
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


@router.post("/rescore/{target_id}")
async def rescore_for_target(
    target_id: str,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Re-score all jobs against a target's scoring profile."""
    target = get_target(supabase, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    scored = bulk_score_for_target(supabase, target)
    job_list_cache.invalidate()
    return {"target_id": target_id, "jobs_scored": scored}


@router.post("/backfill-salary")
async def backfill_salary(
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """One-off: extract salary from description_html for jobs missing salary_text.

    Per batch of 500, extract salaries in Python then write all rows in a
    single `bulk_update_salaries` RPC — turns ~N row-by-row UPDATEs
    into one statement per batch.
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
