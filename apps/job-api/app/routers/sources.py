from typing import Any, cast

import httpx
from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.dependencies import get_supabase, verify_api_key_or_session
from app.models.schemas import SourceAction
from app.seed.company_seed import COMPANY_SEED
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
                {"board_token": body.board_token, "company_name": body.company_name},
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


@router.post("/seed")
async def seed_sources(supabase: Client = Depends(get_supabase)) -> dict[str, Any]:
    inserted = 0
    for company in COMPANY_SEED:
        supabase.table("job_sources").upsert(company, on_conflict="board_token").execute()
        inserted += 1
    return {"success": True, "seeded": inserted}
