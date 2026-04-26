import hashlib
import logging
from datetime import UTC, datetime
from typing import Any, cast
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from postgrest.types import CountMethod
from supabase import Client

from app.dependencies import get_supabase, verify_api_key_or_session
from app.http_client import get_http_client
from app.models.schemas import (
    ManualJobRequest,
    ManualJobResponse,
    UrlValidateRequest,
    UrlValidateResponse,
)
from app.seed.keyword_config import keyword_config
from app.services.extract import (
    MANUAL_SOURCE_ID,
    ExtractionResult,
    _extract_from_firecrawl,
    extract_job_from_html,
    extract_salary_from_text,
)
from app.services.sanitize import sanitize_html
from app.services.scoring import score_job, strip_html
from app.services.target_scoring import bulk_score_for_target
from app.services.target_scoring import (
    score_and_upsert as target_score_and_upsert,
)
from app.services.targets.crud import get as get_target
from app.services.targets.crud import get_active as get_active_target
from app.services.validate import (
    is_banned_domain,
    registrable_domain,
    validate_format,
    validate_job_url,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
    dependencies=[Depends(verify_api_key_or_session)],
)

_JP_SELECT_COLS = (
    "id, external_id, source_id, title, company_name, location, department, "
    "absolute_url, score, score_breakdown, status, salary_text, "
    "greenhouse_updated_at, first_seen_at, created_at"
)


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

    Queries job_target_scores first so pagination reflects target relevance,
    then fetches posting details and overlays the target scores.
    """
    # Step 1: Get qualifying target scores (score >= min_score, not excluded)
    ts_query = (
        supabase.table("job_target_scores")
        .select("job_posting_id, score, score_breakdown")
        .eq("target_id", target_id)
        .eq("excluded", False)
    )
    if min_score is not None:
        ts_query = ts_query.gte("score", min_score)
    ts_resp = ts_query.execute()
    ts_rows = cast(list[dict[str, Any]], ts_resp.data or [])

    if not ts_rows:
        return {"postings": [], "total": 0, "page": page, "page_size": page_size}

    score_lookup = {r["job_posting_id"]: r for r in ts_rows}
    qualifying_ids = list(score_lookup.keys())

    # Step 2: Fetch posting details for qualifying IDs
    jp_query = (
        supabase.table("job_postings")
        .select(_JP_SELECT_COLS)
        .in_("id", qualifying_ids)
    )
    if status:
        jp_query = jp_query.eq("status", status)
    if company:
        jp_query = jp_query.eq("company_name", company)
    if search:
        jp_query = jp_query.ilike("title", f"%{search}%")

    jp_resp = jp_query.execute()
    postings = list(jp_resp.data or [])

    # Overlay target scores onto posting rows
    for posting in postings:
        p = cast(dict[str, Any], posting)
        ts = score_lookup.get(p["id"])
        if ts:
            p["score"] = ts["score"]
            p["score_breakdown"] = ts.get("score_breakdown")

    # Sort by requested field (score is now the target score)
    def _sort_key(p: Any) -> Any:
        val = cast(dict[str, Any], p).get(sort)
        if val is None:
            return 0 if sort == "score" else ""
        return val

    postings.sort(key=_sort_key, reverse=not ascending)

    total = len(postings)
    postings = postings[offset : offset + page_size]

    return {"postings": postings, "total": total, "page": page, "page_size": page_size}


@router.get("")
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("score", pattern="^(score|created_at|company_name|title)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    min_score: int | None = Query(None, ge=0, le=100),
    status: str | None = Query(
        None, pattern="^(new|saved|applied|rejected|archived|resume_draft)$"
    ),
    company: str | None = Query(None, max_length=200),
    search: str | None = Query(None, max_length=200),
    target_id: str | None = Query(None),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    offset = (page - 1) * page_size
    ascending = order == "asc"

    # Default min_score for target views — omit low-relevance jobs
    if target_id and min_score is None:
        min_score = 45

    # Target view: sort/paginate by target-specific scores
    if target_id:
        return _list_jobs_for_target(
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

    # Global view
    query = supabase.table("job_postings").select(
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

    return {
        "postings": list(resp.data or []),
        "total": resp.count or 0,
        "page": page,
        "page_size": page_size,
    }


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
        if fc_result:
            extraction = fc_result

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

    # Score the job
    score_result = score_job(title, description_html, keyword_config)

    # Extract salary from extraction result or description
    salary = extraction.salary_text
    if not salary and description_html:
        salary = extract_salary_from_text(strip_html(description_html))

    # Upsert into job_postings
    row = {
        "external_id": external_id,
        "source_id": MANUAL_SOURCE_ID,
        "title": title,
        "company_name": company_name,
        "location": location,
        "department": None,
        "description_html": sanitize_html(description_html) if description_html else "",
        "absolute_url": final_url,
        "score": score_result.score,
        "score_breakdown": score_result.breakdown.model_dump(),
        "greenhouse_updated_at": datetime.now(UTC).isoformat(),
        "salary_text": salary,
    }

    resp_db = (
        supabase.table("job_postings")
        .upsert(row, on_conflict="source_id,external_id")
        .execute()
    )

    posting_id = None
    if resp_db.data:
        data = cast(dict[str, Any], resp_db.data[0])
        posting_id = data.get("id")

    # Score against active target (#502)
    if posting_id and title:
        active_target = get_active_target(supabase, user_id=None)
        if active_target:
            try:
                target_score_and_upsert(
                    supabase,
                    job_posting_id=posting_id,
                    title=title,
                    description_html=description_html,
                    target=active_target,
                )
            except Exception:
                logger.exception("Target scoring failed for manual job %s", posting_id)

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
    return {"target_id": target_id, "jobs_scored": scored}


@router.post("/backfill-salary")
async def backfill_salary(
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """One-off: extract salary from description_html for jobs missing salary_text."""
    batch_size = 500
    offset = 0
    updated = 0

    while True:
        resp = (
            supabase.table("job_postings")
            .select("id, description_html")
            .is_("salary_text", "null")
            .range(offset, offset + batch_size - 1)
            .execute()
        )
        rows = cast(list[dict[str, Any]], resp.data or [])
        if not rows:
            break

        for row in rows:
            html = row.get("description_html") or ""
            if not html:
                continue
            salary = extract_salary_from_text(strip_html(html))
            if salary:
                supabase.table("job_postings").update(
                    {"salary_text": salary}
                ).eq("id", row["id"]).execute()
                updated += 1

        if len(rows) < batch_size:
            break
        offset += batch_size

    return {"updated": updated}


@router.delete("/{posting_id}")
async def delete_job(
    posting_id: str,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    resp = (
        supabase.table("job_postings")
        .delete()
        .eq("id", posting_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Posting not found")

    return {"success": True, "deleted_id": posting_id}
