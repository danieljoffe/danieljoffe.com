from unittest.mock import AsyncMock, patch

import pytest
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


@pytest.mark.parametrize(
    "bad_url",
    [
        "file:///etc/passwd",
        "chrome://net-internals",
        "javascript:alert(1)",
        "http://localhost:8000",
        "http://127.0.0.1",
        "https://10.0.0.5",
        "http://169.254.169.254/latest/meta-data/",
        "http://192.168.1.1",
        "http://metadata.google.internal",
        "http://[::1]",
        "ftp://example.com",
        "not-a-url",
    ],
)
def test_run_scan_rejects_unsafe_url(bad_url: str) -> None:
    with TestClient(app) as client:
        response = client.post(
            "/run-scan",
            headers={"x-api-key": "testkey"},
            json={"scan_id": "s1", "url": bad_url},
        )
    assert response.status_code == 422, bad_url


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
        # 202 Accepted — scan is queued for async processing, not completed.
        assert response.status_code == 202
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
