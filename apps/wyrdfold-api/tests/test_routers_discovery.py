"""Tests for the cron-facing bulk discovery router."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.dependencies import get_supabase, verify_api_key
from app.main import app
from app.services.source_discovery import DiscoveryRunStats


def _stats(target_id: str, *, inserted: int = 0) -> DiscoveryRunStats:
    return DiscoveryRunStats(
        target_id=target_id,
        queries_issued=6,
        urls_examined=12,
        inserted=inserted,
        duplicates=1,
        unclassified=2,
        filtered=3,
    )


def _client(supabase: MagicMock) -> TestClient:
    app.dependency_overrides[get_supabase] = lambda: supabase
    app.dependency_overrides[verify_api_key] = lambda: None
    return TestClient(app)


def teardown_function() -> None:
    app.dependency_overrides.clear()


def test_run_all_aggregates_per_target_stats() -> None:
    supabase = MagicMock()
    t1, t2 = MagicMock(id="t-1"), MagicMock(id="t-2")

    fake_run = AsyncMock(side_effect=[_stats("t-1", inserted=4), _stats("t-2", inserted=1)])
    with (
        patch("app.routers.discovery.crud.get_active", return_value=[t1, t2]),
        patch("app.routers.discovery.run_discovery_for_target", fake_run),
    ):
        resp = _client(supabase).post("/discovery/run")

    assert resp.status_code == 200
    body = resp.json()
    assert body["targets_processed"] == 2
    assert body["queries_issued"] == 12
    assert body["inserted"] == 5
    assert body["errors"] == []
    assert [t["target_id"] for t in body["per_target"]] == ["t-1", "t-2"]


def test_run_all_records_error_and_continues() -> None:
    supabase = MagicMock()
    t1, t2 = MagicMock(id="t-1"), MagicMock(id="t-2")

    fake_run = AsyncMock(side_effect=[RuntimeError("brave down"), _stats("t-2", inserted=2)])
    with (
        patch("app.routers.discovery.crud.get_active", return_value=[t1, t2]),
        patch("app.routers.discovery.run_discovery_for_target", fake_run),
    ):
        resp = _client(supabase).post("/discovery/run")

    assert resp.status_code == 200
    body = resp.json()
    assert body["targets_processed"] == 1
    assert body["inserted"] == 2
    assert body["errors"] == ["t-1: discovery failed"]


def test_run_all_with_no_active_targets_is_a_noop() -> None:
    supabase = MagicMock()
    with patch("app.routers.discovery.crud.get_active", return_value=[]):
        resp = _client(supabase).post("/discovery/run")

    assert resp.status_code == 200
    assert resp.json()["targets_processed"] == 0


def test_run_all_requires_api_key() -> None:
    app.dependency_overrides[get_supabase] = lambda: MagicMock()
    # No verify_api_key override — the real dependency must reject.
    resp = TestClient(app).post("/discovery/run")
    assert resp.status_code in (401, 403)
