"""Insights router (#512).

Three GET endpoints return pre-aggregated analytics for the insights
dashboard.  Each accepts a ``?period=`` query param (7d/30d/90d/all)
and delegates to the corresponding service function.
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.dependencies import get_supabase, verify_api_key_or_jwt
from app.models.insights import PipelineInsights, SkillsCostInsights, TargetInsights
from app.services.insights import compute_pipeline, compute_skills_cost, compute_targets

router = APIRouter(
    prefix="/insights",
    tags=["insights"],
    dependencies=[Depends(verify_api_key_or_jwt)],
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


def _prior_window(period: str) -> tuple[datetime, datetime] | None:
    """Return ``(prior_since, prior_until)`` covering the period of equal length
    immediately before the current window. Returns None for ``'all'`` (no
    meaningful prior)."""
    days = _PERIOD_DAYS.get(period)
    if days is None:
        return None
    now = datetime.now(UTC)
    prior_until = now - timedelta(days=days)
    prior_since = now - timedelta(days=days * 2)
    return (prior_since, prior_until)


# Handlers are sync `def` so FastAPI runs each request in a threadpool worker.
# These endpoints make multiple sync supabase `.execute()` calls; using `async
# def` would block the event loop and serialize concurrent requests.


@router.get("/pipeline")
def pipeline_insights(
    period: str = Query("30d", pattern=r"^(7d|30d|90d|all)$"),
    supabase: Client = Depends(get_supabase),
) -> PipelineInsights:
    return compute_pipeline(supabase, _since(period), _prior_window(period))


@router.get("/targets")
def target_insights(
    period: str = Query("30d", pattern=r"^(7d|30d|90d|all)$"),
    supabase: Client = Depends(get_supabase),
) -> TargetInsights:
    return compute_targets(supabase, _since(period))


@router.get("/skills-cost")
def skills_cost_insights(
    period: str = Query("30d", pattern=r"^(7d|30d|90d|all)$"),
    supabase: Client = Depends(get_supabase),
) -> SkillsCostInsights:
    return compute_skills_cost(supabase, _since(period))
