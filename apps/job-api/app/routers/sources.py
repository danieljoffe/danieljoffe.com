from typing import Any, cast

import httpx
from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.dependencies import get_supabase, verify_api_key_or_session
from app.models.schemas import SourceAction
from app.seed.company_seed import COMPANY_SEED
from app.services.ats_detect import detect_ats
from app.services.greenhouse import GREENHOUSE_BASE, REQUEST_TIMEOUT

router = APIRouter(
    prefix="/sources",
    tags=["sources"],
    dependencies=[Depends(verify_api_key_or_session)],
)


@router.get("")
async def list_sources(supabase: Client = Depends(get_supabase)) -> dict[str, Any]:
    resp = supabase.table("job_sources").select("*").order("company_name").execute()
    return {"sources": resp.data or []}


@router.post("")
async def manage_source(
    body: SourceAction,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    if body.action == "add":
        if not body.company_name:
            return {"error": "company_name required for add"}
        resp = (
            supabase.table("job_sources")
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
        supabase.table("job_sources").delete().eq("board_token", body.board_token).execute()
        return {"success": True}

    elif body.action == "toggle":
        current = (
            supabase.table("job_sources")
            .select("enabled")
            .eq("board_token", body.board_token)
            .single()
            .execute()
        )
        if current.data:
            row = cast(dict[str, Any], current.data)
            new_enabled = not row["enabled"]
            supabase.table("job_sources").update({"enabled": new_enabled}).eq(
                "board_token", body.board_token
            ).execute()
            return {"success": True, "enabled": new_enabled}
        return {"error": "Source not found"}

    return {"error": f"Unknown action: {body.action}"}


@router.get("/verify")
async def verify_board_token(
    board_token: str = Query(pattern=r"^[a-z0-9][a-z0-9-]{1,80}$"),
) -> dict[str, Any]:
    url = f"{GREENHOUSE_BASE}/{board_token}"
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
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


@router.post("/seed")
async def seed_sources(supabase: Client = Depends(get_supabase)) -> dict[str, Any]:
    supabase.table("job_sources").upsert(
        list(COMPANY_SEED), on_conflict="board_token"
    ).execute()
    return {"success": True, "seeded": len(COMPANY_SEED)}
