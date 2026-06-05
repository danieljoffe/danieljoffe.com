"""Compute the per-target funnel report for issue #845.

Reads only — no LLM calls, no writes. Safe to run against prod.

The funnel surfaces the *DB-visible* drops:
  fetched → upserted → scored (stage1) → graded (stage2/phase2) → not_excluded → ≥ floor

Three pre-DB drops are invisible here (non-US, title pre-match, Phase 1
unpromising). See ``app/services/poller.py`` for the funnel-log
instrumentation that captures those at poll time.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast

from postgrest.types import CountMethod
from supabase import Client

from app.models.diagnostics import (
    FunnelNomenclature,
    FunnelScoreBuckets,
    FunnelSourceStaleness,
    FunnelStageCounts,
    FunnelUserContext,
    TargetFunnelResponse,
)
from app.services.fit.daily_cap import phase2_quota_remaining
from app.services.targets import crud

# Bucket edges for the score histogram. Width=10 gives enough resolution
# to see whether the list_min_score floor is biting at a real boundary.
_BUCKET_EDGES: tuple[tuple[int, int, str], ...] = (
    (0, 10, "0-9"),
    (10, 20, "10-19"),
    (20, 30, "20-29"),
    (30, 40, "30-39"),
    (40, 50, "40-49"),
    (50, 60, "50-59"),
    (60, 70, "60-69"),
    (70, 80, "70-79"),
    (80, 90, "80-89"),
    (90, 101, "90-100"),
)


def _bucketize(scores: list[int]) -> dict[str, int]:
    out = {label: 0 for _, _, label in _BUCKET_EDGES}
    for s in scores:
        for lo, hi, label in _BUCKET_EDGES:
            if lo <= s < hi:
                out[label] += 1
                break
    return out


def _count(query: Any) -> int:
    """``count='exact'`` returns it on the response, not in data."""
    return int(getattr(query.execute(), "count", 0) or 0)


def _stage_counts(supabase: Client, target_id: str) -> FunnelStageCounts:
    base = supabase.table("scores").select("id", count=CountMethod.exact)

    scores_total = _count(base.eq("target_id", target_id).limit(1))
    promising_true = _count(
        supabase.table("scores")
        .select("id", count=CountMethod.exact)
        .eq("target_id", target_id)
        .eq("promising", True)
        .limit(1)
    )
    promising_false = _count(
        supabase.table("scores")
        .select("id", count=CountMethod.exact)
        .eq("target_id", target_id)
        .eq("promising", False)
        .limit(1)
    )
    promising_null = _count(
        supabase.table("scores")
        .select("id", count=CountMethod.exact)
        .eq("target_id", target_id)
        .is_("promising", "null")
        .limit(1)
    )

    by_status: dict[str, int] = {}
    for status in ("stage1", "stage2", "complete"):
        by_status[status] = _count(
            supabase.table("scores")
            .select("id", count=CountMethod.exact)
            .eq("target_id", target_id)
            .eq("scoring_status", status)
            .limit(1)
        )

    excluded_true = _count(
        supabase.table("scores")
        .select("id", count=CountMethod.exact)
        .eq("target_id", target_id)
        .eq("excluded", True)
        .limit(1)
    )
    excluded_false = _count(
        supabase.table("scores")
        .select("id", count=CountMethod.exact)
        .eq("target_id", target_id)
        .eq("excluded", False)
        .limit(1)
    )

    graded = _count(
        supabase.table("scores")
        .select("id", count=CountMethod.exact)
        .eq("target_id", target_id)
        .eq("promising", True)
        .neq("scoring_status", "stage1")
        .limit(1)
    )
    complete = by_status["complete"]
    stuck_in_stage1 = _count(
        supabase.table("scores")
        .select("id", count=CountMethod.exact)
        .eq("target_id", target_id)
        .eq("promising", True)
        .eq("scoring_status", "stage1")
        .limit(1)
    )

    return FunnelStageCounts(
        scores_total=scores_total,
        promising_true=promising_true,
        promising_false=promising_false,
        promising_null=promising_null,
        by_status=by_status,
        excluded_true=excluded_true,
        excluded_false=excluded_false,
        graded=graded,
        complete=complete,
        stuck_in_stage1=stuck_in_stage1,
    )


def _histogram(
    supabase: Client, target_id: str, floor: int
) -> FunnelScoreBuckets:
    resp = (
        supabase.table("scores")
        .select("score")
        .eq("target_id", target_id)
        .eq("excluded", False)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    scores = [int(r["score"]) for r in rows if r.get("score") is not None]
    above = sum(1 for s in scores if s >= floor)
    return FunnelScoreBuckets(
        buckets=_bucketize(scores),
        total=len(scores),
        max_score=max(scores) if scores else None,
        floor=floor,
        above_floor=above,
    )


def _user_context(
    supabase: Client, target_id: str, default_floor: int
) -> list[FunnelUserContext]:
    """One entry per user with an active link to this target."""
    ut_resp = (
        supabase.table("user_targets")
        .select("user_id, is_active")
        .eq("target_id", target_id)
        .execute()
    )
    user_rows = cast(list[dict[str, Any]], ut_resp.data or [])

    out: list[FunnelUserContext] = []
    for row in user_rows:
        user_id = row["user_id"]
        prof_resp = (
            supabase.table("user_profiles")
            .select("list_min_score")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        prof_rows = cast(list[dict[str, Any]], prof_resp.data or [])
        list_min_score = (
            prof_rows[0].get("list_min_score") if prof_rows else None
        )
        out.append(
            FunnelUserContext(
                user_id=user_id,
                list_min_score=(
                    int(list_min_score) if list_min_score is not None else None
                ),
                phase2_quota_remaining=phase2_quota_remaining(
                    supabase, target_id
                ),
            )
        )
    # No active users: still return the empty list so the operator sees
    # "0 users on this target" rather than missing data — that's itself
    # a diagnosis ("nobody activated it; sourcing is moot").
    return out


def _hours_since(ts: datetime | None) -> float | None:
    if ts is None:
        return None
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=UTC)
    return round((datetime.now(UTC) - ts).total_seconds() / 3600.0, 1)


def _sources(supabase: Client) -> list[FunnelSourceStaleness]:
    resp = (
        supabase.table("sources")
        .select(
            "id, company_name, provider, enabled, last_polled_at, job_count"
        )
        .order("last_polled_at", desc=True, nullsfirst=True)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    out: list[FunnelSourceStaleness] = []
    for r in rows:
        last_polled_raw = r.get("last_polled_at")
        last_polled = (
            datetime.fromisoformat(last_polled_raw)
            if isinstance(last_polled_raw, str)
            else None
        )
        out.append(
            FunnelSourceStaleness(
                id=r["id"],
                company_name=r.get("company_name") or "?",
                provider=r.get("provider") or "?",
                enabled=bool(r.get("enabled", False)),
                last_polled_at=last_polled,
                hours_since_polled=_hours_since(last_polled),
                job_count=r.get("job_count"),
            )
        )
    return out


def _default_floor_from_users(users: list[FunnelUserContext]) -> int:
    """If multiple users, the *lowest* floor across them — that's the
    most permissive view of the histogram. Single-user is the common
    case; multi-user falls back to 0 when nobody has set a floor."""
    floors = [u.list_min_score for u in users if u.list_min_score is not None]
    return min(floors) if floors else 0


def compute_target_funnel(
    supabase: Client, target_id: str
) -> TargetFunnelResponse:
    """Build the full funnel report for ``target_id``.

    Read-only. The response is designed so a console paste makes the
    collapse stage obvious without follow-up queries.
    """
    target = crud.get(supabase, target_id)
    if target is None:
        raise ValueError(f"Target {target_id!r} not found")

    nomenclature = FunnelNomenclature(
        target_id=target.id,
        label=target.label,
        normalized_label=target.normalized_label,
        is_active=target.is_active,
        activation_status=target.activation_status,
        profile_version=target.profile_version,
        seniority_hint=target.seniority_hint,
        domain_hints=target.domain_hints,
        example_promising_titles=target.example_promising_titles,
        example_unpromising_titles=target.example_unpromising_titles,
        search_keywords=target.search_keywords,
        scoring_profile=target.scoring_profile.model_dump(),
    )

    stages = _stage_counts(supabase, target_id)
    # User context first — we need their floor for the histogram view.
    users = _user_context(supabase, target_id, default_floor=0)
    floor = _default_floor_from_users(users)
    histogram = _histogram(supabase, target_id, floor=floor)
    sources = _sources(supabase)

    return TargetFunnelResponse(
        generated_at=datetime.now(UTC),
        nomenclature=nomenclature,
        stages=stages,
        scores_histogram=histogram,
        users=users,
        sources=sources,
        pre_db_hint=(
            "Pre-DB drops (non-US, title pre-match, Phase 1 "
            "unpromising) aren't in this report — they leave no row. "
            "Search Railway logs for `poll_funnel ` (a structured line "
            "emitted by _poll_one_source) to read per-source drop "
            "counts from the most recent poll cycle."
        ),
    )
