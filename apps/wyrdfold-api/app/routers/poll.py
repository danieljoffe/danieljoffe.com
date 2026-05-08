from fastapi import APIRouter, Depends
from supabase import Client

from app.cache import job_list_cache
from app.dependencies import get_supabase, verify_api_key
from app.models.schemas import PollResult
from app.services.poller import poll_all_sources, poll_due_sources

router = APIRouter(tags=["poll"], dependencies=[Depends(verify_api_key)])


@router.post("/poll", response_model=PollResult)
async def trigger_poll(supabase: Client = Depends(get_supabase)) -> PollResult:
    """Force-poll every enabled source. Ignores ``poll_interval_minutes``.

    Use sparingly — this is the manual hammer. Routine polling should
    go through ``/poll/due`` (or the in-process scheduler that calls
    ``poll_due_sources`` directly).
    """
    result = await poll_all_sources(supabase)
    job_list_cache.invalidate()
    return result


@router.post("/poll/due", response_model=PollResult)
async def trigger_poll_due(supabase: Client = Depends(get_supabase)) -> PollResult:
    """Poll only sources whose interval has elapsed.

    Same authentication as ``/poll`` but cheap to call frequently —
    sources that were polled recently are skipped. Mirrors what the
    in-process scheduler does, exposed as an HTTP endpoint so external
    cron callers (pg_cron, GitHub Actions) can drive it without
    running APScheduler in the API.
    """
    result = await poll_due_sources(supabase)
    if result.sources_polled > 0:
        job_list_cache.invalidate()
    return result
