"""Aggregation logic for the insights dashboard (#512).

Each compute function fetches filtered rows from Supabase and aggregates
in Python.  Supabase REST has no GROUP BY, but at personal-tool scale
(hundreds to low thousands of rows) this is efficient.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Any, cast

from supabase import Client

from app.models.insights import (
    CostBucket,
    FunnelStage,
    MissingSkill,
    PipelineInsights,
    PipelinePeriodKpis,
    PurposeCost,
    ScoreBucket,
    ScoreTrendPoint,
    SkillFrequency,
    SkillsCostInsights,
    TargetComparison,
    TargetInsights,
    WeeklyCount,
)

# Supabase .execute().data is typed as list[JSON] (a broad union).
# In practice every row is a dict — this alias makes casts readable.
Row = dict[str, Any]

# Funnel stage ordering (used for consistent display)
FUNNEL_ORDER = [
    "new",
    "saved",
    "resume_draft",
    "resume_ready",
    "applied",
    "interviewing",
    "offer",
]

APPLIED_STATUSES = {"applied", "interviewing", "offer"}


def _iso_week_start(dt: datetime | date) -> date:
    """Return the Monday of the ISO week containing *dt*."""
    if isinstance(dt, datetime):
        d = dt.date()
    else:
        d = dt
    return d - timedelta(days=d.weekday())


def _parse_dt(value: str) -> datetime:
    """Parse an ISO timestamp from Supabase (may include tz offset)."""
    return datetime.fromisoformat(value)


# ── Target membership ────────────────────────────────────────────────────────


def _posting_target_map(
    supabase: Client, target_ids: set[str] | None
) -> dict[str, set[str]] | None:
    """Return ``{job_posting_id → {target_id, ...}}`` for the user's targets.

    Returns ``None`` when ``target_ids`` is ``None`` (caller wants the
    unscoped global view). Returns an empty dict when the user has no
    targets — callers must early-return on an empty membership.

    The whole insights module previously filtered by ``jobs.target_id``
    (and ``documents.target_id``). ``jobs.target_id`` is a vestigial
    pre-shared-targets column the poller never populates — same root
    cause as the bugs fixed in #676 / #678 — so every per-target
    aggregation silently returned zero rows. ``documents.target_id``
    doesn't exist at all (the table was renamed from
    ``tailored_resumes`` without ever adding that column), which is
    why the pipeline + skills-cost endpoints currently 500. Pivot all
    target scoping through the ``scores`` table, which is the actual
    source of truth.
    """
    if target_ids is None:
        return None
    if not target_ids:
        return {}
    resp = (
        supabase.table("scores")
        .select("job_posting_id, target_id")
        .in_("target_id", list(target_ids))
        .eq("excluded", False)
        .execute()
    )
    out: dict[str, set[str]] = defaultdict(set)
    for r in cast(list[Row], resp.data or []):
        out[r["job_posting_id"]].add(r["target_id"])
    return dict(out)


def _flatten_posting_ids(
    membership: dict[str, set[str]] | None,
) -> set[str] | None:
    """Flatten ``_posting_target_map`` into a posting-id set.

    Returns ``None`` for the unscoped global view, propagating that
    "no filter" signal to consumers."""
    if membership is None:
        return None
    return set(membership.keys())


# ── Pipeline ─────────────────────────────────────────────────────────────────


def _fetch_postings_window(
    supabase: Client,
    since: datetime | None,
    until: datetime | None,
    target_ids: set[str] | None,
) -> list[Row]:
    posting_ids = _flatten_posting_ids(_posting_target_map(supabase, target_ids))
    if posting_ids is not None and not posting_ids:
        return []
    q = supabase.table("jobs").select("id, status, created_at")
    if since:
        q = q.gte("created_at", since.isoformat())
    if until:
        q = q.lt("created_at", until.isoformat())
    if posting_ids is not None:
        q = q.in_("id", list(posting_ids))
    return cast(list[Row], q.execute().data or [])


def _fetch_status_logs_window(
    supabase: Client,
    since: datetime | None,
    until: datetime | None,
    posting_ids: set[str] | None,
) -> list[Row]:
    if posting_ids is not None and not posting_ids:
        return []
    sq = supabase.table("status_log").select(
        "posting_id, old_status, new_status, created_at"
    )
    if since:
        sq = sq.gte("created_at", since.isoformat())
    if until:
        sq = sq.lt("created_at", until.isoformat())
    if posting_ids is not None:
        sq = sq.in_("posting_id", list(posting_ids))
    return cast(list[Row], sq.execute().data or [])


def _kpis_from(postings: list[Row], status_logs: list[Row]) -> PipelinePeriodKpis:
    """Pure aggregation: derive the 5 top-line KPIs from already-fetched
    postings + status logs for one window. Used for both the current and
    prior periods so the math stays in one place."""
    status_counts: Counter[str] = Counter()
    for p in postings:
        status_counts[p["status"]] += 1

    total_applications = sum(status_counts.get(s, 0) for s in APPLIED_STATUSES)
    total_interviews = status_counts.get("interviewing", 0) + status_counts.get("offer", 0)
    total_offers = status_counts.get("offer", 0)
    response_rate = (total_interviews / total_applications) if total_applications > 0 else None

    applied_times: dict[str, datetime] = {}
    interview_times: dict[str, datetime] = {}
    for log in status_logs:
        posting_id = log["posting_id"]
        ts = _parse_dt(log["created_at"])
        if log["new_status"] == "applied" and posting_id not in applied_times:
            applied_times[posting_id] = ts
        if log["new_status"] == "interviewing" and posting_id not in interview_times:
            interview_times[posting_id] = ts

    response_days: list[float] = []
    for pid, interview_ts in interview_times.items():
        if pid in applied_times:
            delta = (interview_ts - applied_times[pid]).total_seconds() / 86400
            if delta >= 0:
                response_days.append(delta)
    avg_days = (sum(response_days) / len(response_days)) if response_days else None

    return PipelinePeriodKpis(
        total_applications=total_applications,
        total_interviews=total_interviews,
        total_offers=total_offers,
        response_rate=round(response_rate, 3) if response_rate is not None else None,
        avg_days_to_response=round(avg_days, 1) if avg_days is not None else None,
    )


def compute_pipeline(
    supabase: Client,
    since: datetime | None,
    prior_window: tuple[datetime, datetime] | None = None,
    target_ids: set[str] | None = None,
) -> PipelineInsights:
    """Compute pipeline insights for the current window. When *prior_window*
    is supplied as ``(prior_since, prior_until)``, also compute the same KPIs
    over that window so the dashboard can render trend deltas. Velocity and
    funnel are scoped to the current window only.

    When *target_ids* is supplied, all queries are bounded to the user's
    target set — required for multi-tenant safety since wyrdfold-api uses
    service-role and bypasses RLS.
    """
    postings = _fetch_postings_window(supabase, since, None, target_ids)
    posting_ids = {str(p["id"]) for p in postings}
    status_logs = _fetch_status_logs_window(supabase, since, None, posting_ids)

    # Fetch tailored resumes for velocity (current window only). The
    # ``documents`` table has no ``target_id`` column (it was renamed
    # from ``tailored_resumes`` without that column ever being added),
    # so scoping goes through ``job_posting_id`` against the same
    # posting set the window query just resolved. Skip the query
    # entirely when target scoping is requested but the user has zero
    # matching postings — ``.in_("…", [])`` would otherwise relax to
    # an unbounded SELECT.
    if target_ids is not None and not posting_ids:
        resumes: list[Row] = []
    else:
        rq = supabase.table("documents").select("job_posting_id, created_at")
        if since:
            rq = rq.gte("created_at", since.isoformat())
        rq = rq.eq("document_type", "resume")
        if target_ids is not None:
            rq = rq.in_("job_posting_id", list(posting_ids))
        resumes = cast(list[Row], rq.execute().data or [])

    # --- Funnel counts ---
    status_counts: Counter[str] = Counter()
    for p in postings:
        status_counts[p["status"]] += 1
    funnel = [FunnelStage(stage=s, count=status_counts.get(s, 0)) for s in FUNNEL_ORDER]

    # --- Top-line KPIs (current window) ---
    current = _kpis_from(postings, status_logs)

    # --- Prior-period KPIs (only when caller asked for a comparison) ---
    previous: PipelinePeriodKpis | None = None
    if prior_window is not None:
        prior_since, prior_until = prior_window
        prior_postings = _fetch_postings_window(
            supabase, prior_since, prior_until, target_ids
        )
        prior_posting_ids = {str(p["id"]) for p in prior_postings}
        prior_logs = _fetch_status_logs_window(
            supabase, prior_since, prior_until, prior_posting_ids
        )
        previous = _kpis_from(prior_postings, prior_logs)

    # --- Weekly velocity ---
    week_resumes: Counter[date] = Counter()
    for r in resumes:
        week_resumes[_iso_week_start(_parse_dt(r["created_at"]))] += 1

    week_apps: Counter[date] = Counter()
    for log in status_logs:
        if log["new_status"] in APPLIED_STATUSES and log["old_status"] not in APPLIED_STATUSES:
            week_apps[_iso_week_start(_parse_dt(log["created_at"]))] += 1

    all_weeks = sorted(set(week_resumes.keys()) | set(week_apps.keys()))
    velocity = [
        WeeklyCount(
            week_start=w,
            resumes_generated=week_resumes.get(w, 0),
            applications_submitted=week_apps.get(w, 0),
        )
        for w in all_weeks
    ]

    return PipelineInsights(
        total_applications=current.total_applications,
        total_interviews=current.total_interviews,
        total_offers=current.total_offers,
        response_rate=current.response_rate,
        avg_days_to_response=current.avg_days_to_response,
        velocity=velocity,
        funnel=funnel,
        previous=previous,
    )


# ── Targets ──────────────────────────────────────────────────────────────────


def compute_targets(
    supabase: Client,
    since: datetime | None,
    target_ids: set[str] | None = None,
) -> TargetInsights:
    """Compute target insights. When *target_ids* is supplied, only those
    targets and their postings are aggregated."""
    # Fetch only the user's targets for labels
    tq = supabase.table("targets").select("id, label")
    if target_ids is not None:
        tq = tq.in_("id", list(target_ids))
    targets_data = cast(list[Row], tq.execute().data or [])
    target_labels = {t["id"]: t["label"] for t in targets_data}

    # Resolve target membership via the ``scores`` table. ``jobs.target_id``
    # is vestigial — the poller never writes it, so the previous filter
    # collapsed every per-target bucket to empty. Same architectural
    # fix as ownership checks in #676 / #678.
    membership = _posting_target_map(supabase, target_ids)
    posting_ids = _flatten_posting_ids(membership)
    if target_ids is not None and not posting_ids:
        return TargetInsights(
            targets=[],
            score_distribution=[
                ScoreBucket(
                    bucket=f"{lo}-{lo + 10 if lo < 90 else 100}", count=0
                )
                for lo in range(0, 100, 10)
            ],
            score_trend=[],
            unscored_count=0,
        )

    # Fetch postings within the user's target set, hydrating with status
    # + created_at; per-target scores come from the ``scores`` table
    # (jobs.score is the global blended score, not the per-target one).
    # In the unscoped / admin path (``target_ids=None``) we also need
    # the legacy inline ``target_id`` + ``score`` columns so callers
    # that didn't pass per-user scoping still get a meaningful answer.
    select_cols = (
        "id, status, created_at"
        if target_ids is not None
        else "id, target_id, score, status, created_at"
    )
    q = supabase.table("jobs").select(select_cols)
    if since:
        q = q.gte("created_at", since.isoformat())
    if posting_ids is not None:
        q = q.in_("id", list(posting_ids))
    postings = cast(list[Row], q.execute().data or [])

    # Per-target score lookup: ``(posting_id, target_id) → score``. Fetched
    # once so the aggregation below stays O(n) over postings x their
    # targets without repeated table queries.
    score_lookup: dict[tuple[str, str], int] = {}
    if posting_ids:
        sq = (
            supabase.table("scores")
            .select("job_posting_id, target_id, score")
            .eq("excluded", False)
        )
        if target_ids is not None:
            sq = sq.in_("target_id", list(target_ids))
        sq = sq.in_("job_posting_id", list(posting_ids))
        for r in cast(list[Row], sq.execute().data or []):
            score_lookup[(r["job_posting_id"], r["target_id"])] = int(
                r.get("score") or 0
            )

    # --- Per-target aggregation ---
    # Targets with no jobs in the window are dropped from the response
    # (they're noise in the comparison chart). Postings with no signal
    # — null OR zero score — are tracked separately as unscored_count
    # so they don't bloat the 0-10 bucket of the distribution. (A
    # legitimate score of 0 is vanishingly rare; in practice 0 means
    # "default value, never scored".)
    target_jobs: defaultdict[str, list[tuple[Row, int]]] = defaultdict(list)
    scored_values: list[int] = []
    unscored_count = 0
    for p in postings:
        pid = str(p["id"])
        if target_ids is None:
            # Admin / global path — historically the only path. Read
            # ``target_id`` and ``score`` straight off the posting row.
            # ``jobs.target_id`` is NULL in production today (vestigial
            # column) so this path mainly surfaces the unscored count
            # + score distribution from the inline ``score`` column.
            inline_score = p.get("score")
            if inline_score is None or inline_score == 0:
                unscored_count += 1
            else:
                scored_values.append(int(inline_score))
            inline_tid = p.get("target_id")
            if inline_tid and inline_tid in target_labels:
                target_jobs[inline_tid].append((p, int(inline_score or 0)))
            continue

        tids = (membership.get(pid, set()) if membership else set()) or set()
        if not tids:
            # Posting outside the user's target set — skip (shouldn't
            # happen because we filtered postings by posting_ids above,
            # but defensive).
            continue
        # A posting can be scored against multiple targets; surface the
        # best per-target score in that target's distribution rather
        # than collapsing across targets.
        seen_any_score = False
        for tid in tids:
            if tid not in target_labels:
                continue
            score = score_lookup.get((pid, tid), 0)
            if score:
                seen_any_score = True
                scored_values.append(score)
                target_jobs[tid].append((p, score))
            else:
                target_jobs[tid].append((p, 0))
        if not seen_any_score:
            unscored_count += 1

    comparisons: list[TargetComparison] = []
    for tid, label in target_labels.items():
        rows = target_jobs.get(tid, [])
        if not rows:
            continue
        scores = [s for _, s in rows]
        statuses = [r["status"] for r, _ in rows]
        applied = sum(1 for s in statuses if s in APPLIED_STATUSES)
        interviews = sum(1 for s in statuses if s in {"interviewing", "offer"})
        comparisons.append(
            TargetComparison(
                target_id=tid,
                target_label=label,
                job_count=len(rows),
                avg_score=round(sum(scores) / len(scores), 1),
                applied_count=applied,
                interview_count=interviews,
                conversion_rate=round(interviews / applied, 3)
                if applied > 0
                else None,
            )
        )

    # --- Score distribution (excluding unscored postings) ---
    bucket_counts: Counter[str] = Counter()
    for s in scored_values:
        clamped = max(0, min(s, 100))
        bucket_idx = min(clamped // 10, 9)
        lo = bucket_idx * 10
        hi = lo + 10 if lo < 90 else 100
        bucket_counts[f"{lo}-{hi}"] += 1

    buckets = [
        ScoreBucket(
            bucket=f"{lo}-{lo + 10 if lo < 90 else 100}",
            count=bucket_counts.get(f"{lo}-{lo + 10 if lo < 90 else 100}", 0),
        )
        for lo in range(0, 100, 10)
    ]

    # --- Score trend by week (scored postings only) ---
    # Per-user path: use the highest per-target score across the user's
    # targets so a posting that's a great fit for one target and a
    # poor fit for another contributes its strength signal. Global
    # path: fall back to the inline ``jobs.score`` column.
    week_scores: defaultdict[date, list[int]] = defaultdict(list)
    for p in postings:
        pid = str(p["id"])
        if target_ids is None:
            inline = p.get("score")
            if inline is None:
                continue
            week_scores[_iso_week_start(_parse_dt(p["created_at"]))].append(
                int(inline)
            )
            continue
        tids = (membership.get(pid, set()) if membership else set()) or set()
        per_target = [score_lookup.get((pid, t), 0) for t in tids]
        best = max(per_target, default=0)
        if best <= 0:
            continue
        week_scores[_iso_week_start(_parse_dt(p["created_at"]))].append(best)

    score_trend = sorted(
        [
            ScoreTrendPoint(week_start=w, avg_score=round(sum(ss) / len(ss), 1))
            for w, ss in week_scores.items()
        ],
        key=lambda x: x.week_start,
    )

    return TargetInsights(
        targets=comparisons,
        score_distribution=buckets,
        score_trend=score_trend,
        unscored_count=unscored_count,
    )


# ── Skills + Cost ────────────────────────────────────────────────────────────


def compute_skills_cost(
    supabase: Client,
    since: datetime | None,
    user_id: str | None = None,
    target_ids: set[str] | None = None,
) -> SkillsCostInsights:
    """Compute skills + cost insights.

    *target_ids* scopes job-posting / analyses / documents queries to the
    user's targets. *user_id* scopes ``llm_costs`` which has its own
    direct ``user_id`` column.
    """
    # Resolve target-scoped posting membership via ``scores`` (the only
    # table that actually records per-target attribution — ``jobs.target_id``
    # is a vestigial pre-shared-targets column that's never populated).
    membership = _posting_target_map(supabase, target_ids)
    target_scoped_posting_ids = _flatten_posting_ids(membership)

    # Fetch posting scores. ``jobs.llm_score`` is the globally-blended
    # LLM score the poller writes back to ``jobs`` after analysis —
    # fine to read directly off the postings row for the missing-skill
    # priority calculation below.
    pq = supabase.table("jobs").select("id, llm_score")
    if since:
        pq = pq.gte("created_at", since.isoformat())
    if target_scoped_posting_ids is not None:
        if not target_scoped_posting_ids:
            posting_rows: list[Row] = []
        else:
            pq = pq.in_("id", list(target_scoped_posting_ids))
            posting_rows = cast(list[Row], pq.execute().data or [])
    else:
        posting_rows = cast(list[Row], pq.execute().data or [])
    posting_scores: dict[str, float] = {}
    visible_posting_ids: set[str] = set()
    for p in posting_rows:
        pid = str(p["id"])
        visible_posting_ids.add(pid)
        score = p.get("llm_score")
        if score is not None:
            posting_scores[pid] = float(score)

    # Fetch analyses for skill extraction
    aq = supabase.table("analyses").select("job_posting_id, scorecard, created_at")
    if since:
        aq = aq.gte("created_at", since.isoformat())
    if target_ids is not None:
        # Target-scope via posting_id so we don't surface analyses for
        # postings the caller can't see. (analyses.target_id was added
        # later and may be NULL for older rows.)
        if not visible_posting_ids:
            analyses: list[Row] = []
        else:
            aq = aq.in_("job_posting_id", list(visible_posting_ids))
            analyses = cast(list[Row], aq.execute().data or [])
    else:
        analyses = cast(list[Row], aq.execute().data or [])

    # Fetch LLM cost log — has a direct user_id column.
    cq = supabase.table("llm_costs").select("purpose, cost_usd, created_at")
    if since:
        cq = cq.gte("created_at", since.isoformat())
    if user_id is not None:
        cq = cq.eq("user_id", user_id)
    cost_logs = cast(list[Row], cq.execute().data or [])

    # Fetch tailored resumes for per-resume cost. ``documents`` has no
    # ``target_id`` column (renamed from ``tailored_resumes`` without
    # the column ever being added), so target scoping pivots through
    # ``job_posting_id`` against the membership map.
    if target_ids is not None and not visible_posting_ids:
        resume_costs: list[Row] = []
    else:
        rq = supabase.table("documents").select("cost_usd, created_at")
        if since:
            rq = rq.gte("created_at", since.isoformat())
        rq = rq.eq("document_type", "resume")
        if target_ids is not None:
            rq = rq.in_("job_posting_id", list(visible_posting_ids))
        resume_costs = cast(list[Row], rq.execute().data or [])

    # --- Skill frequencies ---
    matched_counts: Counter[str] = Counter()
    missing_counts: Counter[str] = Counter()
    missing_score_sum: defaultdict[str, float] = defaultdict(float)
    missing_score_count: Counter[str] = Counter()

    for a in analyses:
        scorecard = a.get("scorecard")
        if not isinstance(scorecard, dict):
            continue
        posting_id = a.get("job_posting_id")
        score = posting_scores.get(str(posting_id)) if posting_id else None

        for sm in scorecard.get("skills_matched", []):
            if isinstance(sm, dict) and sm.get("name"):
                if sm.get("matched"):
                    matched_counts[sm["name"]] += 1
                else:
                    missing_counts[sm["name"]] += 1
                    if score is not None:
                        missing_score_sum[sm["name"]] += score
                        missing_score_count[sm["name"]] += 1
        for skill_name in scorecard.get("skills_missing", []):
            if isinstance(skill_name, str):
                missing_counts[skill_name] += 1
                if score is not None:
                    missing_score_sum[skill_name] += score
                    missing_score_count[skill_name] += 1

    # Combine and rank by total frequency
    all_skills = set(matched_counts.keys()) | set(missing_counts.keys())
    skill_freqs = sorted(
        [
            SkillFrequency(
                skill=s,
                matched_count=matched_counts.get(s, 0),
                missing_count=missing_counts.get(s, 0),
            )
            for s in all_skills
        ],
        key=lambda x: x.matched_count + x.missing_count,
        reverse=True,
    )[:15]

    # Top missing (skills never matched), ranked by score-weighted priority.
    # priority_score = sum(llm_score for jobs missing this skill); skills
    # missing in many high-scoring jobs rank highest. When no job has a
    # score, fall back to raw missing_count so ranking stays stable.
    # Limitation: skills are still treated as binary present/absent per
    # analysis — a skill matched in some jobs but missing in others is
    # excluded entirely.
    pure_missing_skills = [s for s in missing_counts if matched_counts.get(s, 0) == 0]
    missing_records = []
    for skill in pure_missing_skills:
        count = missing_counts[skill]
        score_count = missing_score_count[skill]
        score_sum = missing_score_sum[skill]
        avg = (score_sum / score_count) if score_count > 0 else None
        priority = score_sum if score_count > 0 else float(count)
        missing_records.append(
            MissingSkill(
                skill=skill,
                missing_count=count,
                avg_job_score=avg,
                priority_score=round(priority, 4),
            )
        )
    pure_missing = sorted(
        missing_records,
        key=lambda r: r.priority_score,
        reverse=True,
    )[:10]

    # --- Cost over time ---
    week_cost: defaultdict[date, float] = defaultdict(float)
    week_resume_count: Counter[date] = Counter()
    for rc in resume_costs:
        w = _iso_week_start(_parse_dt(rc["created_at"]))
        week_cost[w] += float(rc.get("cost_usd") or 0)
        week_resume_count[w] += 1

    all_cost_weeks = sorted(set(week_cost.keys()) | set(week_resume_count.keys()))
    cost_over_time = [
        CostBucket(
            week_start=w,
            total_cost=round(week_cost.get(w, 0), 4),
            resume_count=week_resume_count.get(w, 0),
        )
        for w in all_cost_weeks
    ]

    # --- Cost by purpose ---
    purpose_totals: defaultdict[str, float] = defaultdict(float)
    purpose_counts: Counter[str] = Counter()
    for cl in cost_logs:
        purpose = cl.get("purpose", "unknown")
        purpose_totals[purpose] += float(cl.get("cost_usd") or 0)
        purpose_counts[purpose] += 1

    cost_by_purpose = sorted(
        [
            PurposeCost(
                purpose=p,
                total_cost=round(purpose_totals[p], 4),
                call_count=purpose_counts[p],
            )
            for p in purpose_totals
        ],
        key=lambda x: x.total_cost,
        reverse=True,
    )

    # --- Totals ---
    total_cost = sum(float(cl.get("cost_usd") or 0) for cl in cost_logs)
    total_resumes = len(resume_costs)
    avg_cost_per_resume = (total_cost / total_resumes) if total_resumes > 0 else None

    return SkillsCostInsights(
        top_skills=skill_freqs,
        top_missing=pure_missing,
        cost_over_time=cost_over_time,
        cost_by_purpose=cost_by_purpose,
        total_cost=round(total_cost, 4),
        avg_cost_per_resume=(
            round(avg_cost_per_resume, 4) if avg_cost_per_resume is not None else None
        ),
    )
