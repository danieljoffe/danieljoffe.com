"""Sources router — global job-board catalog.

Sources are operator-managed (job boards, ATS providers). Reads are
available to any authenticated user; mutations (`POST /sources`,
`POST /sources/seed`) are gated to the cron API key only — a leaked
operator key is the only way they should be reachable, and even
authenticated users must not be able to add/remove/toggle the global
source list.
"""

from typing import Any, cast

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.dependencies import (
    get_supabase,
    verify_api_key,
    verify_api_key_or_jwt,
)
from app.http_client import get_http_client
from app.models.schemas import SourceAction
from app.seed.company_seed import COMPANY_SEED
from app.services.ats_detect import detect_ats
from app.services.greenhouse import GREENHOUSE_BASE

# Default dependency = read auth (JWT or api-key). Write endpoints below
# layer on `verify_api_key` to restrict to operator/cron callers.
router = APIRouter(
    prefix="/sources",
    tags=["sources"],
    dependencies=[Depends(verify_api_key_or_jwt)],
)

# Public projection for the source-list endpoint. Excludes operational
# columns (last_polled_at, poll_interval_minutes, created_at) that
# leaked through the previous select("*") and have no business surfacing
# to JWT callers — those are operator-tuned cron internals.
_SOURCE_LIST_COLS = "id, board_token, company_name, provider, enabled, job_count"


@router.get("")
async def list_sources(supabase: Client = Depends(get_supabase)) -> dict[str, Any]:
    resp = (
        supabase.table("sources")
        .select(_SOURCE_LIST_COLS)
        .order("company_name")
        .execute()
    )
    return {"sources": resp.data or []}


@router.post("", dependencies=[Depends(verify_api_key)])
async def manage_source(
    body: SourceAction,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    if body.action == "add":
        if not body.company_name:
            raise HTTPException(status_code=422, detail="company_name required for add")
        resp = (
            supabase.table("sources")
            .upsert(
                {
                    "board_token": body.board_token,
                    "company_name": body.company_name,
                    "provider": body.provider,
                },
                on_conflict="board_token",
            )
            .execute()
        )
        return {"success": True, "source": resp.data[0] if resp.data else None}

    elif body.action == "remove":
        supabase.table("sources").delete().eq("board_token", body.board_token).execute()
        return {"success": True}

    elif body.action == "toggle":
        current = (
            supabase.table("sources")
            .select("enabled")
            .eq("board_token", body.board_token)
            .single()
            .execute()
        )
        if current.data:
            row = cast(dict[str, Any], current.data)
            new_enabled = not row["enabled"]
            supabase.table("sources").update({"enabled": new_enabled}).eq(
                "board_token", body.board_token
            ).execute()
            return {"success": True, "enabled": new_enabled}
        return {"error": "Source not found"}

    # Pydantic validates body.action as Literal["add","remove","toggle"] at
    # parse time — the if/elif chain above is exhaustive, so no fallback
    # is needed (mypy warn_unreachable confirms).


@router.get("/verify")
async def verify_board_token(
    board_token: str = Query(pattern=r"^[a-z0-9][a-z0-9-]{1,80}$"),
) -> dict[str, Any]:
    url = f"{GREENHOUSE_BASE}/{board_token}"
    client = get_http_client()
    try:
        resp = await client.get(url)
    except httpx.HTTPError:
        return {"valid": False}
    if resp.status_code != 200:
        return {"valid": False}
    data = resp.json()
    return {
        "valid": True,
        "company_name": data.get("name", ""),
    }


@router.get("/detect")
async def detect_provider(
    q: str = Query(min_length=1, max_length=200),
) -> dict[str, Any]:
    result = await detect_ats(q)
    if not result:
        return {"found": False}
    return {
        "found": True,
        "provider": result.provider,
        "board_token": result.board_token,
        "company_name": result.company_name,
        "job_count": result.job_count,
    }


@router.post("/seed", dependencies=[Depends(verify_api_key)])
async def seed_sources(supabase: Client = Depends(get_supabase)) -> dict[str, Any]:
    supabase.table("sources").upsert(
        list(COMPANY_SEED), on_conflict="board_token"
    ).execute()
    return {"success": True, "seeded": len(COMPANY_SEED)}
