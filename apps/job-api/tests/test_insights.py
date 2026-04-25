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
        for method in ("select", "eq", "gte", "lte", "order", "limit", "neq", "in_"):
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
        sb = _mock_supabase({"job_postings": postings})
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
        sb = _mock_supabase({"job_postings": postings})
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
        sb = _mock_supabase({"job_postings": postings, "job_status_log": logs})
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
        sb = _mock_supabase({"tailored_resumes": resumes})
        result = compute_pipeline(sb, since=None)

        # Should group into weeks — at least 1 or 2 week buckets
        assert len(result.velocity) >= 1
        total_resumes = sum(v.resumes_generated for v in result.velocity)
        assert total_resumes == 3


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
        sb = _mock_supabase({"job_targets": targets, "job_postings": postings})
        result = compute_targets(sb, since=None)

        assert len(result.targets) == 2
        fe = next(t for t in result.targets if t.target_label == "Frontend")
        assert fe.job_count == 2
        assert fe.avg_score == 70.0
        assert fe.applied_count == 1

        be = next(t for t in result.targets if t.target_label == "Backend")
        assert be.job_count == 1
        assert be.avg_score == 90.0

    def test_score_distribution(self):
        postings = [
            {"id": "1", "target_id": None, "score": 15, "status": "new", "created_at": _ts(_NOW)},
            {"id": "2", "target_id": None, "score": 85, "status": "new", "created_at": _ts(_NOW)},
            {"id": "3", "target_id": None, "score": 85, "status": "new", "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({"job_postings": postings})
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

    def test_score_trend(self):
        postings = [
            {"id": "1", "target_id": None, "score": 60, "status": "new", "created_at": _ts(_NOW)},
            {"id": "2", "target_id": None, "score": 80, "status": "new", "created_at": _ts(_NOW - timedelta(days=8))},
        ]
        sb = _mock_supabase({"job_postings": postings})
        result = compute_targets(sb, since=None)

        # At least 1 week bucket
        assert len(result.score_trend) >= 1


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
        sb = _mock_supabase({"job_analyses": analyses})
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
        assert "Docker" in result.top_missing

    def test_cost_over_time(self):
        resume_costs = [
            {"cost_usd": "0.0050", "created_at": _ts(_NOW)},
            {"cost_usd": "0.0030", "created_at": _ts(_NOW - timedelta(days=1))},
        ]
        cost_logs = [
            {"purpose": "tailor", "cost_usd": "0.0080", "created_at": _ts(_NOW)},
        ]
        sb = _mock_supabase({
            "tailored_resumes": resume_costs,
            "llm_cost_log": cost_logs,
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
        sb = _mock_supabase({"llm_cost_log": cost_logs})
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
