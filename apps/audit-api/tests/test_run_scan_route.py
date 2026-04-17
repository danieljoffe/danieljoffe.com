from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.scan_queue import ScanJob, get_queue


def test_run_scan_requires_api_key() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/run-scan",
            json={"scan_id": "s1", "url": "https://example.com"},
        )
    assert response.status_code == 401


def test_run_scan_rejects_invalid_device_mode() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/run-scan",
            headers={"x-api-key": "testkey"},
            json={"scan_id": "s1", "url": "https://example.com", "device_mode": "tv"},
        )
    assert response.status_code == 422


def test_run_scan_enqueues_job_and_returns_accepted() -> None:
    queue = get_queue()
    with patch.object(queue, "enqueue", new_callable=AsyncMock) as mock_enqueue:
        with TestClient(app) as client:
            response = client.post(
                "/run-scan",
                headers={"x-api-key": "testkey"},
                json={
                    "scan_id": "s1",
                    "url": "https://example.com",
                    "device_mode": "desktop",
                },
            )
        assert response.status_code == 200
        assert response.json() == {"status": "accepted", "scan_id": "s1"}
        mock_enqueue.assert_awaited_once()
        enqueued: ScanJob = mock_enqueue.await_args.args[0]
        assert enqueued.scan_id == "s1"
        assert enqueued.device == "desktop"


def test_health_reports_queue_state() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "queue" in body
    assert "running" in body
