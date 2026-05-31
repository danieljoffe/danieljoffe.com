"""Regression tests for /jobs response ordering.

The score-sorted fast path computes ``page_ids`` in the correct order at
the scores layer, then re-fetches postings via ``.in_("id", page_ids)``.
Supabase's ``in_()`` does not preserve list order — without an explicit
re-sort, the postings come back in storage order and the API returns the
right rows in the wrong order.
"""

from typing import Any
from unittest.mock import MagicMock

from app.routers.jobs import (
    _list_jobs_across_user_targets,
    _list_jobs_for_target_two_query,
)


class _Resp:
    def __init__(self, data: list[dict[str, Any]], count: int | None = None) -> None:
        self.data = data
        self.count = count


class _Chain:
    """Fluent stub — every builder method returns self; execute() returns the preloaded response."""

    def __init__(self, resp: _Resp) -> None:
        self._resp = resp

    def select(self, *_a: Any, **_kw: Any) -> "_Chain":
        return self

    def eq(self, *_a: Any, **_kw: Any) -> "_Chain":
        return self

    def in_(self, *_a: Any, **_kw: Any) -> "_Chain":
        return self

    def gte(self, *_a: Any, **_kw: Any) -> "_Chain":
        return self

    def ilike(self, *_a: Any, **_kw: Any) -> "_Chain":
        return self

    def order(self, *_a: Any, **_kw: Any) -> "_Chain":
        return self

    def range(self, *_a: Any, **_kw: Any) -> "_Chain":
        return self

    def execute(self) -> _Resp:
        return self._resp


def _supabase_with(table_resps: dict[str, _Resp]) -> MagicMock:
    sb = MagicMock()
    sb.table.side_effect = lambda name: _Chain(table_resps[name])
    return sb


def test_target_two_query_restores_score_desc_order() -> None:
    # Scores returned in score-desc order (highest first) — this is what
    # Supabase produces because the query chains .order("score", desc=True).
    ts_rows = [
        {"job_posting_id": "j-high", "score": 90, "score_breakdown": {}, "scoring_status": "complete"},
        {"job_posting_id": "j-mid", "score": 60, "score_breakdown": {}, "scoring_status": "complete"},
        {"job_posting_id": "j-low", "score": 30, "score_breakdown": {}, "scoring_status": "complete"},
    ]
    # Postings returned by .in_("id", page_ids) in DIFFERENT (storage) order.
    # The bug: without an explicit re-sort, the API returned this order.
    postings_in_storage_order = [
        {"id": "j-low", "title": "low"},
        {"id": "j-high", "title": "high"},
        {"id": "j-mid", "title": "mid"},
    ]
    sb = _supabase_with(
        {"scores": _Resp(ts_rows, count=3), "jobs": _Resp(postings_in_storage_order)}
    )

    result = _list_jobs_for_target_two_query(
        sb,
        target_id="t-1",
        offset=0,
        page=1,
        page_size=10,
        sort="score",
        ascending=False,
        min_score=None,
        status=None,
        company=None,
        search=None,
        exclude_terms=[],
        only_terms=[],
    )

    assert [p["id"] for p in result["postings"]] == ["j-high", "j-mid", "j-low"]
    assert [p["score"] for p in result["postings"]] == [90, 60, 30]
    assert result["total"] == 3


def test_across_user_targets_restores_score_desc_order() -> None:
    # Same shape, different aggregator (max score across the user's targets).
    score_rows = [
        {"job_posting_id": "j-high", "target_id": "t-1", "score": 80, "score_breakdown": {}, "scoring_status": "complete"},
        {"job_posting_id": "j-mid", "target_id": "t-1", "score": 50, "score_breakdown": {}, "scoring_status": "complete"},
        {"job_posting_id": "j-low", "target_id": "t-2", "score": 20, "score_breakdown": {}, "scoring_status": "complete"},
    ]
    postings_in_storage_order = [
        {"id": "j-mid", "title": "mid"},
        {"id": "j-low", "title": "low"},
        {"id": "j-high", "title": "high"},
    ]
    sb = _supabase_with(
        {"scores": _Resp(score_rows), "jobs": _Resp(postings_in_storage_order)}
    )

    result = _list_jobs_across_user_targets(
        sb,
        user_target_ids={"t-1", "t-2"},
        offset=0,
        page=1,
        page_size=10,
        sort="score",
        ascending=False,
        min_score=None,
        status=None,
        company=None,
        search=None,
        exclude_terms=[],
        only_terms=[],
    )

    assert [p["id"] for p in result["postings"]] == ["j-high", "j-mid", "j-low"]
    assert [p["score"] for p in result["postings"]] == [80, 50, 20]
    assert result["total"] == 3


def test_target_two_query_location_filter_paginates_post_filter_set() -> None:
    """Regression: when a location filter is active, ``total`` must reflect
    the post-filter row count — not the pre-filter scores-layer count.
    Previously the API returned ``total=3`` for a query that only matched 1
    row after filtering, which made the UI render 4+ near-empty pages."""
    ts_rows = [
        {"job_posting_id": "j-remote", "score": 90, "score_breakdown": {}, "scoring_status": "complete"},
        {"job_posting_id": "j-india", "score": 70, "score_breakdown": {}, "scoring_status": "complete"},
        {"job_posting_id": "j-brazil", "score": 50, "score_breakdown": {}, "scoring_status": "complete"},
    ]
    postings = [
        {"id": "j-remote", "title": "remote role", "location": "Remote · US"},
        {"id": "j-india", "title": "india role", "location": "Bangalore, India"},
        {"id": "j-brazil", "title": "brazil role", "location": "São Paulo, Brazil"},
    ]
    sb = _supabase_with(
        {"scores": _Resp(ts_rows, count=3), "jobs": _Resp(postings)}
    )

    result = _list_jobs_for_target_two_query(
        sb,
        target_id="t-1",
        offset=0,
        page=1,
        page_size=10,
        sort="score",
        ascending=False,
        min_score=None,
        status=None,
        company=None,
        search=None,
        exclude_terms=["india", "brazil"],
        only_terms=[],
    )

    assert [p["id"] for p in result["postings"]] == ["j-remote"]
    # The crux of the regression: total should be the post-filter count,
    # not the 3 pre-filter scores rows.
    assert result["total"] == 1
