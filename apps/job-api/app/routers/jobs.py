from typing import Any

from fastapi import APIRouter, Depends, Query
from postgrest.types import CountMethod
from supabase import Client

from app.dependencies import get_supabase, verify_api_key_or_session

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
    dependencies=[Depends(verify_api_key_or_session)],
)


@router.get("")
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("score", regex="^(score|created_at|company_name|title)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    min_score: int | None = Query(None, ge=0, le=100),
    status: str | None = Query(None),
    company: str | None = Query(None),
    search: str | None = Query(None),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    offset = (page - 1) * page_size
    ascending = order == "asc"

    query = supabase.table("job_postings").select(
        "id, greenhouse_id, source_id, title, company_name, location, department, "
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
