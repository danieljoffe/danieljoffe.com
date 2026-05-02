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


# ── Pipeline ─────────────────────────────────────────────────────────────────


def _fetch_postings_window(
    supabase: Client, since: datetime | None, until: datetime | None
) -> list[Row]:
    q = supabase.table("jobs").select("id, status, created_at")
    if since:
        q = q.gte("created_at", since.isoformat())
    if until:
        q = q.lt("created_at", until.isoformat())
    return cast(list[Row], q.execute().data or [])


def _fetch_status_logs_window(
    supabase: Client, since: datetime | None, until: datetime | None
) -> list[Row]:
    sq = supabase.table("status_log").select(
        "posting_id, old_status, new_status, created_at"
    )
    if since:
        sq = sq.gte("created_at", since.isoformat())
    if until:
        sq = sq.lt("created_at", until.isoformat())
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
) -> PipelineInsights:
    """Compute pipeline insights for the current window. When *prior_window*
    is supplied as ``(prior_since, prior_until)``, also compute the same KPIs
    over that window so the dashboard can render trend deltas. Velocity and
    funnel are scoped to the current window only."""
    postings = _fetch_postings_window(supabase, since, None)
    status_logs = _fetch_status_logs_window(supabase, since, None)

    # Fetch tailored resumes for velocity (current window only)
    rq = supabase.table("documents").select("job_posting_id, created_at")
    if since:
        rq = rq.gte("created_at", since.isoformat())
    rq = rq.eq("document_type", "resume")
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
        prior_postings = _fetch_postings_window(supabase, prior_since, prior_until)
        prior_logs = _fetch_status_logs_window(supabase, prior_since, prior_until)
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


def compute_targets(supabase: Client, since: datetime | None) -> TargetInsights:
    # Fetch all targets for labels
    targets_data = cast(
        list[Row],
        supabase.table("targets").select("id, label").execute().data or [],
    )
    target_labels = {t["id"]: t["label"] for t in targets_data}

    # Fetch postings with target + score + status
    q = supabase.table("jobs").select("id, target_id, score, status, created_at")
    if since:
        q = q.gte("created_at", since.isoformat())
    postings = cast(list[Row], q.execute().data or [])

    # --- Per-target aggregation ---
    # Targets with no jobs in the window are dropped from the response
    # (they're noise in the comparison chart). Postings with no signal
    # — null OR zero score — are tracked separately as unscored_count
    # so they don't bloat the 0-10 bucket of the distribution. (A
    # legitimate score of 0 is vanishingly rare; in practice 0 means
    # "default value, never scored".)
    target_jobs: defaultdict[str, list[Row]] = defaultdict(list)
    scored_values: list[int] = []
    unscored_count = 0
    for p in postings:
        score = p.get("score")
        if score is None or score == 0:
            unscored_count += 1
        else:
            scored_values.append(int(score))
        tid = p.get("target_id")
        if tid and tid in target_labels:
            target_jobs[tid].append(p)

    comparisons: list[TargetComparison] = []
    for tid, label in target_labels.items():
        jobs = target_jobs.get(tid, [])
        if not jobs:
            continue
        scores = [j.get("score", 0) or 0 for j in jobs]
        applied = sum(1 for j in jobs if j["status"] in APPLIED_STATUSES)
        interviews = sum(
            1 for j in jobs if j["status"] in {"interviewing", "offer"}
        )
        comparisons.append(
            TargetComparison(
                target_id=tid,
                target_label=label,
                job_count=len(jobs),
                avg_score=round(sum(scores) / len(scores), 1),
                applied_count=applied,
                interview_count=interviews,
                conversion_rate=round(interviews / applied, 3) if applied > 0 else None,
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
    week_scores: defaultdict[date, list[int]] = defaultdict(list)
    for p in postings:
        score = p.get("score")
        if score is None:
            continue
        week_scores[_iso_week_start(_parse_dt(p["created_at"]))].append(int(score))

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


def compute_skills_cost(supabase: Client, since: datetime | None) -> SkillsCostInsights:
    # Fetch analyses for skill extraction
    aq = supabase.table("analyses").select("job_posting_id, scorecard, created_at")
    if since:
        aq = aq.gte("created_at", since.isoformat())
    analyses = cast(list[Row], aq.execute().data or [])

    # Fetch posting scores so we can rank skill gaps by impact (sum of
    # llm_score across jobs missing the skill). Postings without a score
    # contribute to missing_count but not priority_score.
    pq = supabase.table("jobs").select("id, llm_score")
    if since:
        pq = pq.gte("created_at", since.isoformat())
    posting_rows = cast(list[Row], pq.execute().data or [])
    posting_scores: dict[str, float] = {}
    for p in posting_rows:
        score = p.get("llm_score")
        if score is not None:
            posting_scores[str(p["id"])] = float(score)

    # Fetch LLM cost log
    cq = supabase.table("llm_costs").select("purpose, cost_usd, created_at")
    if since:
        cq = cq.gte("created_at", since.isoformat())
    cost_logs = cast(list[Row], cq.execute().data or [])

    # Fetch tailored resumes for per-resume cost
    rq = supabase.table("documents").select("cost_usd, created_at")
    if since:
        rq = rq.gte("created_at", since.isoformat())
    rq = rq.eq("document_type", "resume")
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
