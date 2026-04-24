import hashlib
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
)
from app.services.sanitize import sanitize_html
from app.services.scoring import score_job
from app.services.validate import (
    is_banned_domain,
    registrable_domain,
    validate_format,
    validate_job_url,
)

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
    dependencies=[Depends(verify_api_key_or_session)],
)


@router.get("")
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("score", pattern="^(score|created_at|company_name|title)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    min_score: int | None = Query(None, ge=0, le=100),
    status: str | None = Query(
        None, pattern="^(new|saved|applied|rejected|archived)$"
    ),
    company: str | None = Query(None, max_length=200),
    search: str | None = Query(None, max_length=200),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    offset = (page - 1) * page_size
    ascending = order == "asc"

    query = supabase.table("job_postings").select(
        "id, external_id, source_id, title, company_name, location, department, "
        "absolute_url, score, score_breakdown, status, first_seen_at, created_at",
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
        "postings": resp.data or [],
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
        raise HTTPException(status_code=400, detail="Failed to fetch URL")

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

    # Generate external_id from URL
    external_id = hashlib.sha256(final_url.encode()).hexdigest()[:16]

    # Score the job
    score_result = score_job(title, description_html, keyword_config)

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

    return ManualJobResponse(
        success=True,
        posting_id=posting_id,
        extracted=extracted_summary,
        extraction_tier=extraction.tier,
        warnings=warnings,
        needs_manual_fields=False,
    )


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
