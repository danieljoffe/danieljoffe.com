"""Tests for periodic job-URL health checks (#12)."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.url_health import (
    _STATUS_NETWORK_ERROR,
    _archive_with_data_drop,
    _head_one,
    _merge_check_results,
    run_url_health_check,
)

# ---- _head_one -------------------------------------------------------------


@pytest.mark.asyncio
async def test_head_one_returns_status_on_2xx() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    client.head.return_value = MagicMock(status_code=200)
    assert await _head_one(client, "https://example.com/job/1") == 200


@pytest.mark.asyncio
async def test_head_one_substitutes_405_to_200() -> None:
    """Some job boards reject HEAD; the URL exists, just method-not-allowed."""
    client = AsyncMock(spec=httpx.AsyncClient)
    client.head.return_value = MagicMock(status_code=405)
    assert await _head_one(client, "https://example.com/job/2") == 200


@pytest.mark.asyncio
async def test_head_one_returns_404_unchanged() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    client.head.return_value = MagicMock(status_code=404)
    assert await _head_one(client, "https://example.com/job/dead") == 404


@pytest.mark.asyncio
async def test_head_one_treats_transport_error_as_unreachable() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    client.head.side_effect = httpx.TransportError("dns failure")
    assert await _head_one(client, "https://does-not-exist.invalid/") == _STATUS_NETWORK_ERROR


@pytest.mark.asyncio
async def test_head_one_treats_timeout_as_unreachable() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    client.head.side_effect = httpx.TimeoutException("timed out")
    assert await _head_one(client, "https://slow.example.com/") == _STATUS_NETWORK_ERROR


# ---- _merge_check_results --------------------------------------------------


class _UpdateChain:
    """Minimal mock for ``supabase.table('x').update({...}).eq(...).execute()``."""

    def __init__(self, sink: list[dict[str, Any]]) -> None:
        self._sink = sink
        self._payload: dict[str, Any] | None = None
        self._eq_args: tuple[str, Any] | None = None

    def update(self, payload: dict[str, Any]) -> _UpdateChain:
        self._payload = payload
        return self

    def eq(self, col: str, val: Any) -> _UpdateChain:
        self._eq_args = (col, val)
        return self

    def in_(self, col: str, vals: list[Any]) -> _UpdateChain:
        self._eq_args = (col, vals)
        return self

    def execute(self) -> Any:
        self._sink.append({
            "payload": self._payload,
            "eq": self._eq_args,
        })
        return MagicMock(data=[])


def _mock_supabase(updates_sink: list[dict[str, Any]]) -> MagicMock:
    sb = MagicMock()
    sb.table.side_effect = lambda _name: _UpdateChain(updates_sink)
    return sb


def test_merge_check_results_resets_counter_on_2xx() -> None:
    sink: list[dict[str, Any]] = []
    sb = _mock_supabase(sink)
    rows = [{"id": "j1", "url_check_failure_count": 2}]
    _merge_check_results(sb, rows, {"j1": 200})
    assert sink[0]["payload"]["url_check_status"] == 200
    assert sink[0]["payload"]["url_check_failure_count"] == 0


def test_merge_check_results_increments_on_404() -> None:
    sink: list[dict[str, Any]] = []
    sb = _mock_supabase(sink)
    rows = [{"id": "j1", "url_check_failure_count": 1}]
    _merge_check_results(sb, rows, {"j1": 404})
    assert sink[0]["payload"]["url_check_status"] == 404
    assert sink[0]["payload"]["url_check_failure_count"] == 2


def test_merge_check_results_increments_on_network_error() -> None:
    sink: list[dict[str, Any]] = []
    sb = _mock_supabase(sink)
    rows = [{"id": "j1", "url_check_failure_count": 0}]
    _merge_check_results(sb, rows, {"j1": _STATUS_NETWORK_ERROR})
    assert sink[0]["payload"]["url_check_failure_count"] == 1


def test_merge_check_results_leaves_counter_on_5xx() -> None:
    """Server hiccups should NOT count against the job — not the job's fault."""
    sink: list[dict[str, Any]] = []
    sb = _mock_supabase(sink)
    rows = [{"id": "j1", "url_check_failure_count": 1}]
    _merge_check_results(sb, rows, {"j1": 503})
    assert sink[0]["payload"]["url_check_failure_count"] == 1


# ---- _archive_with_data_drop ----------------------------------------------


def test_archive_with_data_drop_nulls_heavy_fields() -> None:
    """Archive nulls description_html on jobs and axis_scores/fit_reasoning/
    score_breakdown/matched_keywords on scores. Keeps identity intact."""
    sink: list[dict[str, Any]] = []
    sb = _mock_supabase(sink)
    n = _archive_with_data_drop(sb, ["j1", "j2"])
    assert n == 2
    # First update: jobs table — status + description_html=null.
    jobs_payload = sink[0]["payload"]
    assert jobs_payload["status"] == "archived"
    assert jobs_payload["description_html"] is None
    assert "updated_at" in jobs_payload
    # Second update: scores table — heavy fields NULL'd.
    scores_payload = sink[1]["payload"]
    assert scores_payload == {
        "axis_scores": None,
        "fit_reasoning": None,
        "score_breakdown": None,
        "matched_keywords": None,
    }


def test_archive_with_data_drop_noop_on_empty() -> None:
    sb = MagicMock()
    n = _archive_with_data_drop(sb, [])
    assert n == 0
    sb.table.assert_not_called()


# ---- run_url_health_check end-to-end --------------------------------------


@pytest.mark.asyncio
async def test_run_url_health_check_empty_input_returns_zero_summary() -> None:
    sb = MagicMock()
    sb.table.return_value.select.return_value.not_.in_.return_value.is_.return_value.limit.return_value.execute.return_value = MagicMock(data=[])
    summary = await run_url_health_check(sb, batch_size=10, concurrency=2, age_threshold_hours=24, failure_threshold=3)
    assert summary == {
        "checked": 0,
        "healthy": 0,
        "failures": 0,
        "server_errors": 0,
        "archived": 0,
    }


@pytest.mark.asyncio
async def test_run_url_health_check_archives_on_threshold() -> None:
    """End-to-end: a job at failure_count = threshold - 1 gets one more
    failure, ticks over threshold, and is archived (with data drop)."""
    rows_due = [
        {"id": "alive", "absolute_url": "https://ok.example.com/job/1", "url_check_failure_count": 0},
        {"id": "dying", "absolute_url": "https://dead.example.com/job/2", "url_check_failure_count": 2},
    ]
    with (
        patch("app.services.url_health._select_due_jobs", return_value=rows_due),
        patch("app.services.url_health._head_batch", new=AsyncMock(return_value={"alive": 200, "dying": 404})),
        patch("app.services.url_health._merge_check_results") as merge,
        patch("app.services.url_health._archive_with_data_drop", return_value=1) as archive,
    ):
        sb = MagicMock()
        # The post-merge refetch returns only the dying job (at threshold).
        sb.table.return_value.select.return_value.in_.return_value.gte.return_value.execute.return_value = MagicMock(data=[{"id": "dying", "url_check_failure_count": 3}])
        summary = await run_url_health_check(
            sb, batch_size=10, concurrency=2, age_threshold_hours=24, failure_threshold=3
        )
    assert summary["checked"] == 2
    assert summary["healthy"] == 1
    assert summary["failures"] == 1
    assert summary["archived"] == 1
    merge.assert_called_once()
    archive.assert_called_once_with(sb, ["dying"])


@pytest.mark.asyncio
async def test_run_url_health_check_does_not_archive_below_threshold() -> None:
    """A single 404 on a previously-healthy job bumps the counter but
    does NOT archive."""
    rows_due = [
        {"id": "blip", "absolute_url": "https://example.com/blip", "url_check_failure_count": 0},
    ]
    with (
        patch("app.services.url_health._select_due_jobs", return_value=rows_due),
        patch("app.services.url_health._head_batch", new=AsyncMock(return_value={"blip": 404})),
        patch("app.services.url_health._merge_check_results"),
        patch("app.services.url_health._archive_with_data_drop", return_value=0) as archive,
    ):
        sb = MagicMock()
        # Post-merge refetch finds NO jobs at threshold yet (counter = 1).
        sb.table.return_value.select.return_value.in_.return_value.gte.return_value.execute.return_value = MagicMock(data=[])
        summary = await run_url_health_check(
            sb, batch_size=10, concurrency=2, age_threshold_hours=24, failure_threshold=3
        )
    assert summary["failures"] == 1
    assert summary["archived"] == 0
    archive.assert_called_once_with(sb, [])
