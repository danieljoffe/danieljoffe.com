from fastapi import APIRouter, Depends
from supabase import Client

from app.dependencies import get_supabase, verify_api_key
from app.models.schemas import PollResult
from app.services.poller import poll_all_sources

router = APIRouter(tags=["poll"], dependencies=[Depends(verify_api_key)])


@router.post("/poll", response_model=PollResult)
async def trigger_poll(supabase: Client = Depends(get_supabase)) -> PollResult:
    return await poll_all_sources(supabase)
