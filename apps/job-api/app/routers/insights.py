"""Insights router (#512).

Three GET endpoints return pre-aggregated analytics for the insights
dashboard.  Each accepts a ``?period=`` query param (7d/30d/90d/all)
and delegates to the corresponding service function.
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.dependencies import get_supabase, verify_api_key_or_session
from app.models.insights import PipelineInsights, SkillsCostInsights, TargetInsights
from app.services.insights import compute_pipeline, compute_skills_cost, compute_targets

router = APIRouter(
    prefix="/insights",
    tags=["insights"],
    dependencies=[Depends(verify_api_key_or_session)],
)

_PERIOD_DAYS: dict[str, int | None] = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "all": None,
}


def _since(period: str) -> datetime | None:
    days = _PERIOD_DAYS.get(period)
    if days is None:
        return None
    return datetime.now(UTC) - timedelta(days=days)


@router.get("/pipeline")
async def pipeline_insights(
    period: str = Query("30d", pattern=r"^(7d|30d|90d|all)$"),
    supabase: Client = Depends(get_supabase),
) -> PipelineInsights:
    return compute_pipeline(supabase, _since(period))


@router.get("/targets")
async def target_insights(
    period: str = Query("30d", pattern=r"^(7d|30d|90d|all)$"),
    supabase: Client = Depends(get_supabase),
) -> TargetInsights:
    return compute_targets(supabase, _since(period))


@router.get("/skills-cost")
async def skills_cost_insights(
    period: str = Query("30d", pattern=r"^(7d|30d|90d|all)$"),
    supabase: Client = Depends(get_supabase),
) -> SkillsCostInsights:
    return compute_skills_cost(supabase, _since(period))
