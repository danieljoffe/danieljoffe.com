"""Insights router (#512).

Three GET endpoints return pre-aggregated analytics for the insights
dashboard.  Each accepts a ``?period=`` query param (7d/30d/90d/all)
and delegates to the corresponding service function.

All aggregations are scoped to the JWT subject — the service-role
Supabase client bypasses RLS, so the router resolves the caller's
target_ids and passes them down to bound every query.
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.dependencies import (
    get_current_user_id,
    get_supabase,
    verify_supabase_jwt,
)
from app.models.insights import PipelineInsights, SkillsCostInsights, TargetInsights
from app.services.insights import compute_pipeline, compute_skills_cost, compute_targets
from app.services.targets.crud import get_user_target_ids

# JWT-only — insights are personal analytics. The api-key path would let a
# leaked operator key dump cross-tenant aggregates.
router = APIRouter(
    prefix="/insights",
    tags=["insights"],
    dependencies=[Depends(verify_supabase_jwt)],
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


def _empty_pipeline() -> PipelineInsights:
    return PipelineInsights(
        total_applications=0,
        total_interviews=0,
        total_offers=0,
        response_rate=None,
        avg_days_to_response=None,
        velocity=[],
        funnel=[],
        previous=None,
    )


def _empty_targets() -> TargetInsights:
    return TargetInsights(
        targets=[],
        score_distribution=[],
        score_trend=[],
        unscored_count=0,
    )


def _empty_skills_cost() -> SkillsCostInsights:
    return SkillsCostInsights(
        top_skills=[],
        top_missing=[],
        cost_over_time=[],
        cost_by_purpose=[],
        total_cost=0,
        avg_cost_per_resume=None,
    )


# Handlers are sync `def` so FastAPI runs each request in a threadpool worker.
# These endpoints make multiple sync supabase `.execute()` calls; using `async
# def` would block the event loop and serialize concurrent requests.


@router.get("/pipeline")
def pipeline_insights(
    period: str = Query("30d", pattern=r"^(7d|30d|90d|all)$"),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> PipelineInsights:
    target_ids = get_user_target_ids(supabase, user_id)
    if not target_ids:
        return _empty_pipeline()
    return compute_pipeline(
        supabase, _since(period), _prior_window(period), target_ids=target_ids
    )


@router.get("/targets")
def target_insights(
    period: str = Query("30d", pattern=r"^(7d|30d|90d|all)$"),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> TargetInsights:
    target_ids = get_user_target_ids(supabase, user_id)
    if not target_ids:
        return _empty_targets()
    return compute_targets(supabase, _since(period), target_ids=target_ids)


@router.get("/skills-cost")
def skills_cost_insights(
    period: str = Query("30d", pattern=r"^(7d|30d|90d|all)$"),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> SkillsCostInsights:
    target_ids = get_user_target_ids(supabase, user_id)
    if not target_ids:
        return _empty_skills_cost()
    return compute_skills_cost(
        supabase, _since(period), user_id=user_id, target_ids=target_ids
    )
