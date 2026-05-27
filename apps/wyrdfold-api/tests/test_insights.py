"""Tests for insights aggregation logic (#512)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

from app.services.insights import compute_pipeline, compute_skills_cost, compute_targets

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOW = datetime.now(UTC)
_WEEK_AGO = _NOW - timedelta(days=7)


def _ts(dt: datetime) -> str:
    return dt.isoformat()


def _mock_supabase(tables: dict[str, list[dict]]) -> MagicMock:
    """Build a MagicMock that simulates chained Supabase queries.

    *tables* maps table name → list of dicts that .execute().data returns.
    Every chained method (.select, .eq, .gte, .order, .limit) returns the
    same mock, so the final .execute() always resolves.
    """
    client = MagicMock()

    def table_side_effect(name: str) -> MagicMock:
        tbl = MagicMock()
        result = MagicMock()
        result.data = tables.get(name, [])

        # Every chainable method returns the same table mock
        for method in ("select", "eq", "gte", "lt", "lte", "order", "limit", "neq", "in_"):
            getattr(tbl, method).return_value = tbl
        tbl.execute.return_value = result
        return tbl

    client.table.side_effect = table_side_effect
    return client


# ===========================================================================
# Pipeline
# ===========================================================================


class TestComputePipeline:
    def test_basic_funnel_counts(self):
        postings = [
            {"id": "1", "status": "new", "created_at": _ts(_NOW)},
            {"id": "2", "status": "new", "created_at": _ts(_NOW)},
            {"id": "3", "status": "applied", "created_at": _ts(_NOW)},
            {"id": "4", "status": "interviewing", "created_at": _ts(_NOW)},
            {"id": "5", "status": "offer", "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({"jobs": postings})
        result = compute_pipeline(sb, since=None)

        assert result.total_applications == 3  # applied + interviewing + offer
        assert result.total_interviews == 2  # interviewing + offer
        assert result.total_offers == 1

        funnel_map = {f.stage: f.count for f in result.funnel}
        assert funnel_map["new"] == 2
        assert funnel_map["applied"] == 1
        assert funnel_map["interviewing"] == 1
        assert funnel_map["offer"] == 1

    def test_response_rate(self):
        postings = [
            {"id": "1", "status": "applied", "created_at": _ts(_NOW)},
            {"id": "2", "status": "applied", "created_at": _ts(_NOW)},
            {"id": "3", "status": "interviewing", "created_at": _ts(_NOW)},
            {"id": "4", "status": "offer", "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({"jobs": postings})
        result = compute_pipeline(sb, since=None)

        # 4 applied-or-beyond, 2 interviewing-or-beyond → 0.5
        assert result.response_rate == 0.5

    def test_avg_days_to_response(self):
        logs = [
            {
                "posting_id": "1",
                "old_status": "resume_ready",
                "new_status": "applied",
                "created_at": _ts(_NOW - timedelta(days=10)),
            },
            {
                "posting_id": "1",
                "old_status": "applied",
                "new_status": "interviewing",
                "created_at": _ts(_NOW - timedelta(days=4)),
            },
        ]
        postings = [{"id": "1", "status": "interviewing", "created_at": _ts(_NOW)}]
        sb = _mock_supabase({"jobs": postings, "status_log": logs})
        result = compute_pipeline(sb, since=None)

        assert result.avg_days_to_response == 6.0

    def test_empty_data(self):
        sb = _mock_supabase({})
        result = compute_pipeline(sb, since=None)

        assert result.total_applications == 0
        assert result.response_rate is None
        assert result.avg_days_to_response is None
        assert result.velocity == []

    def test_velocity_grouping(self):
        resumes = [
            {"job_posting_id": "1", "created_at": _ts(_NOW)},
            {"job_posting_id": "2", "created_at": _ts(_NOW - timedelta(days=1))},
            {"job_posting_id": "3", "created_at": _ts(_NOW - timedelta(days=8))},
        ]
        sb = _mock_supabase({"documents": resumes})
        result = compute_pipeline(sb, since=None)

        # Should group into weeks — at least 1 or 2 week buckets
        assert len(result.velocity) >= 1
        total_resumes = sum(v.resumes_generated for v in result.velocity)
        assert total_resumes == 3

    def test_previous_is_none_without_prior_window(self):
        sb = _mock_supabase({})
        result = compute_pipeline(sb, since=None)
        assert result.previous is None

    def test_previous_populated_when_prior_window_supplied(self):
        # Mock supabase ignores filter args, so both windows resolve to the
        # same row set. We're asserting that a prior_window triggers the
        # second aggregation pass — not the math, which is covered above.
        postings = [
            {"id": "1", "status": "applied", "created_at": _ts(_NOW)},
            {"id": "2", "status": "interviewing", "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({"jobs": postings})
        prior_until = _NOW - timedelta(days=30)
        prior_since = _NOW - timedelta(days=60)
        result = compute_pipeline(
            sb, since=_NOW - timedelta(days=30), prior_window=(prior_since, prior_until)
        )
        assert result.previous is not None
        assert result.previous.total_applications == 2
        assert result.previous.total_interviews == 1
        assert result.previous.total_offers == 0
        assert result.previous.response_rate == 0.5


# ===========================================================================
# Targets
# ===========================================================================


class TestComputeTargets:
    def test_basic_target_comparison(self):
        targets = [
            {"id": "t1", "label": "Frontend"},
            {"id": "t2", "label": "Backend"},
        ]
        postings = [
            {"id": "1", "target_id": "t1", "score": 80, "status": "applied", "created_at": _ts(_NOW)},
            {"id": "2", "target_id": "t1", "score": 60, "status": "new", "created_at": _ts(_NOW)},
            {"id": "3", "target_id": "t2", "score": 90, "status": "interviewing", "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({"targets": targets, "jobs": postings})
        result = compute_targets(sb, since=None)

        assert len(result.targets) == 2
        fe = next(t for t in result.targets if t.target_label == "Frontend")
        assert fe.job_count == 2
        assert fe.avg_score == 70.0
        assert fe.applied_count == 1

        be = next(t for t in result.targets if t.target_label == "Backend")
        assert be.job_count == 1
        assert be.avg_score == 90.0

    def test_targets_with_no_jobs_are_filtered_out(self):
        targets = [
            {"id": "t1", "label": "Frontend"},
            {"id": "t2", "label": "Backend"},
            {"id": "t3", "label": "DevOps"},  # no postings — should be dropped
        ]
        postings = [
            {"id": "1", "target_id": "t1", "score": 80, "status": "new", "created_at": _ts(_NOW)},
            {"id": "2", "target_id": "t2", "score": 70, "status": "new", "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({"targets": targets, "jobs": postings})
        result = compute_targets(sb, since=None)

        labels = {t.target_label for t in result.targets}
        assert labels == {"Frontend", "Backend"}
        assert "DevOps" not in labels

    def test_unscored_postings_excluded_from_distribution(self):
        """Postings with score=None bump unscored_count, not the 0-10 bucket."""
        postings = [
            {"id": "1", "target_id": None, "score": None, "status": "new", "created_at": _ts(_NOW)},
            {"id": "2", "target_id": None, "score": None, "status": "new", "created_at": _ts(_NOW)},
            {"id": "3", "target_id": None, "score": 5, "status": "new", "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({"jobs": postings})
        result = compute_targets(sb, since=None)

        assert result.unscored_count == 2
        bucket_map = {b.bucket: b.count for b in result.score_distribution}
        # Only the score=5 row contributes to 0-10
        assert bucket_map["0-10"] == 1

    def test_score_distribution(self):
        postings = [
            {"id": "1", "target_id": None, "score": 15, "status": "new", "created_at": _ts(_NOW)},
            {"id": "2", "target_id": None, "score": 85, "status": "new", "created_at": _ts(_NOW)},
            {"id": "3", "target_id": None, "score": 85, "status": "new", "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({"jobs": postings})
        result = compute_targets(sb, since=None)

        bucket_map = {b.bucket: b.count for b in result.score_distribution}
        assert bucket_map["10-20"] == 1
        assert bucket_map["80-90"] == 2
        assert bucket_map["0-10"] == 0

    def test_empty_targets(self):
        sb = _mock_supabase({})
        result = compute_targets(sb, since=None)

        assert result.targets == []
        assert len(result.score_distribution) == 10  # Always 10 buckets
        assert result.score_trend == []
        assert result.unscored_count == 0

    def test_score_trend(self):
        postings = [
            {"id": "1", "target_id": None, "score": 60, "status": "new", "created_at": _ts(_NOW)},
            {"id": "2", "target_id": None, "score": 80, "status": "new", "created_at": _ts(_NOW - timedelta(days=8))},
        ]
        sb = _mock_supabase({"jobs": postings})
        result = compute_targets(sb, since=None)

        # At least 1 week bucket
        assert len(result.score_trend) >= 1

    def test_per_user_path_excludes_excluded_scores(self):
        """Scores marked ``excluded=true`` (closed jobs, irrelevant matches)
        must not inflate the funnel / distribution. The list endpoint
        filters ``excluded = False`` and insights has to mirror that —
        otherwise pipeline funnel counts balloon by ~4x (one excluded
        scores row per posting per re-poll).

        This test mocks the mock to track that ``.eq("excluded", False)``
        is invoked on the ``scores`` table query — exact filter values
        can't be asserted with the current _mock_supabase shape, so we
        spy on the chain. A regression here would mean the production
        funnel returns counts that don't match the list view.
        """
        # The MagicMock chain returns the same table mock for every call,
        # so we record the .eq() arguments to assert excluded filter.
        eq_calls: list[tuple] = []

        sb = MagicMock()
        tbl = MagicMock()

        def eq_recorder(*args, **kwargs):
            eq_calls.append(args)
            return tbl

        tbl.select.return_value = tbl
        tbl.eq.side_effect = eq_recorder
        tbl.in_.return_value = tbl
        tbl.gte.return_value = tbl
        tbl.lt.return_value = tbl
        tbl.order.return_value = tbl
        tbl.limit.return_value = tbl
        tbl.execute.return_value.data = []
        sb.table.return_value = tbl

        compute_targets(sb, since=None, target_ids={"t1"})

        # At least one .eq("excluded", False) on the scores table path.
        assert ("excluded", False) in eq_calls, (
            f"expected scores query to filter excluded=False, "
            f"got eq() calls: {eq_calls}"
        )

    def test_per_user_path_pivots_through_scores_table(self):
        """When ``target_ids`` is passed, membership + score come from
        the ``scores`` table — ``jobs.target_id`` is vestigial and
        ``jobs.score`` is the global blended score, neither is
        authoritative for per-target rollups. Same architectural
        invariant as #676 / #678 ownership checks."""
        targets = [
            {"id": "t1", "label": "Frontend"},
            {"id": "t2", "label": "Backend"},
        ]
        # Postings carry NO ``target_id`` or ``score`` — production
        # reality (the poller writes both into ``scores``, not back
        # onto ``jobs``).
        postings = [
            {"id": "1", "status": "applied", "created_at": _ts(_NOW)},
            {"id": "2", "status": "new", "created_at": _ts(_NOW)},
            {"id": "3", "status": "interviewing", "created_at": _ts(_NOW)},
        ]
        scores = [
            {"job_posting_id": "1", "target_id": "t1", "score": 80},
            {"job_posting_id": "2", "target_id": "t1", "score": 60},
            {"job_posting_id": "3", "target_id": "t2", "score": 90},
        ]
        sb = _mock_supabase(
            {"targets": targets, "jobs": postings, "scores": scores}
        )
        result = compute_targets(sb, since=None, target_ids={"t1", "t2"})

        assert len(result.targets) == 2
        fe = next(t for t in result.targets if t.target_label == "Frontend")
        assert fe.job_count == 2
        assert fe.avg_score == 70.0
        assert fe.applied_count == 1
        be = next(t for t in result.targets if t.target_label == "Backend")
        assert be.avg_score == 90.0
        assert be.interview_count == 1


# ===========================================================================
# Skills + Cost
# ===========================================================================


class TestComputeSkillsCost:
    def test_basic_skill_frequencies(self):
        analyses = [
            {
                "scorecard": {
                    "skills_matched": [
                        {"name": "Python", "matched": True, "confidence": "high", "evidence": ""},
                        {"name": "React", "matched": False, "confidence": "low", "evidence": ""},
                    ],
                    "skills_missing": ["Docker"],
                },
                "created_at": _ts(_NOW),
            },
            {
                "scorecard": {
                    "skills_matched": [
                        {"name": "Python", "matched": True, "confidence": "high", "evidence": ""},
                    ],
                    "skills_missing": ["React", "Docker"],
                },
                "created_at": _ts(_NOW),
            },
        ]
        sb = _mock_supabase({"analyses": analyses})
        result = compute_skills_cost(sb, since=None)

        skill_map = {s.skill: s for s in result.top_skills}
        assert "Python" in skill_map
        assert skill_map["Python"].matched_count == 2
        assert skill_map["Python"].missing_count == 0

        # React: 1 unmatched in skills_matched + 1 in skills_missing
        assert "React" in skill_map
        assert skill_map["React"].missing_count == 2

        assert "Docker" in skill_map
        assert skill_map["Docker"].missing_count == 2

        # Docker is never matched → should be in top_missing
        missing_skills = [m.skill for m in result.top_missing]
        assert "Docker" in missing_skills

    def test_top_missing_ranked_by_score_weighted_priority(self):
        """A skill missing from one 90-score job outranks a skill missing
        from two 30-score jobs, since 90 > 30+30."""
        analyses = [
            {
                "job_posting_id": "high-1",
                "scorecard": {
                    "skills_matched": [],
                    "skills_missing": ["Kubernetes"],
                },
                "created_at": _ts(_NOW),
            },
            {
                "job_posting_id": "low-1",
                "scorecard": {
                    "skills_matched": [],
                    "skills_missing": ["Rust"],
                },
                "created_at": _ts(_NOW),
            },
            {
                "job_posting_id": "low-2",
                "scorecard": {
                    "skills_matched": [],
                    "skills_missing": ["Rust"],
                },
                "created_at": _ts(_NOW),
            },
        ]
        postings = [
            {"id": "high-1", "llm_score": 90.0, "created_at": _ts(_NOW)},
            {"id": "low-1", "llm_score": 30.0, "created_at": _ts(_NOW)},
            {"id": "low-2", "llm_score": 30.0, "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({"analyses": analyses, "jobs": postings})
        result = compute_skills_cost(sb, since=None)

        skills = [m.skill for m in result.top_missing]
        assert skills[0] == "Kubernetes"  # priority 90 beats 60
        assert skills[1] == "Rust"

        kubernetes = next(m for m in result.top_missing if m.skill == "Kubernetes")
        assert kubernetes.missing_count == 1
        assert kubernetes.avg_job_score == 90.0
        assert kubernetes.priority_score == 90.0

        rust = next(m for m in result.top_missing if m.skill == "Rust")
        assert rust.missing_count == 2
        assert rust.avg_job_score == 30.0
        assert rust.priority_score == 60.0

    def test_top_missing_falls_back_to_count_when_no_scores(self):
        """If no posting has llm_score, ranking should still produce a
        stable order using missing_count."""
        analyses = [
            {
                "job_posting_id": "p1",
                "scorecard": {"skills_matched": [], "skills_missing": ["A", "A", "B"]},
                "created_at": _ts(_NOW),
            },
        ]
        # postings with no llm_score
        postings = [{"id": "p1", "llm_score": None, "created_at": _ts(_NOW)}]
        sb = _mock_supabase({"analyses": analyses, "jobs": postings})
        result = compute_skills_cost(sb, since=None)

        by_skill = {m.skill: m for m in result.top_missing}
        assert by_skill["A"].avg_job_score is None
        assert by_skill["A"].priority_score == 2.0  # missing_count fallback
        assert by_skill["B"].priority_score == 1.0
        # A ranks above B
        assert result.top_missing[0].skill == "A"

    def test_cost_over_time(self):
        resume_costs = [
            {"cost_usd": "0.0050", "created_at": _ts(_NOW)},
            {"cost_usd": "0.0030", "created_at": _ts(_NOW - timedelta(days=1))},
        ]
        cost_logs = [
            {"purpose": "tailor", "cost_usd": "0.0080", "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({
            "documents": resume_costs,
            "llm_costs": cost_logs,
        })
        result = compute_skills_cost(sb, since=None)

        assert result.total_cost == 0.008
        assert result.avg_cost_per_resume is not None
        assert len(result.cost_over_time) >= 1
        total_resume_cost = sum(c.total_cost for c in result.cost_over_time)
        assert total_resume_cost == 0.008

    def test_cost_by_purpose(self):
        cost_logs = [
            {"purpose": "tailor", "cost_usd": "0.01", "created_at": _ts(_NOW)},
            {"purpose": "tailor", "cost_usd": "0.02", "created_at": _ts(_NOW)},
            {"purpose": "analysis", "cost_usd": "0.005", "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({"llm_costs": cost_logs})
        result = compute_skills_cost(sb, since=None)

        purpose_map = {p.purpose: p for p in result.cost_by_purpose}
        assert purpose_map["tailor"].total_cost == 0.03
        assert purpose_map["tailor"].call_count == 2
        assert purpose_map["analysis"].total_cost == 0.005

    def test_empty_data(self):
        sb = _mock_supabase({})
        result = compute_skills_cost(sb, since=None)

        assert result.top_skills == []
        assert result.top_missing == []
        assert result.cost_over_time == []
        assert result.total_cost == 0.0
        assert result.avg_cost_per_resume is None
