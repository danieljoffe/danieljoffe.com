import asyncio
from typing import Any
from unittest.mock import patch

import pytest

from app.services.persistence import ScanRowMissingError
from app.services.scan_queue import ScanJob, ScanQueue
from app.services.scanner import ScanError, ScanResults


async def _wait_until_idle(queue: ScanQueue, timeout: float = 2.0) -> None:
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        if queue.size == 0 and not queue.running:
            return
        await asyncio.sleep(0.01)
    raise AssertionError("queue did not drain")


@pytest.fixture
def fake_results() -> ScanResults:
    return ScanResults(
        lighthouse={"categories": {}, "audits": {}},
        axe={"violations": []},
        page_title="t",
        page_description="d",
        screenshot_url=None,
    )


async def test_queue_executes_job_and_persists_completion(
    fake_results: ScanResults,
) -> None:
    queue = ScanQueue()
    calls: dict[str, Any] = {}

    async def fake_run_scan(url: str, device: str, supabase: Any = None) -> ScanResults:
        calls["run_scan"] = {"url": url, "device": device}
        return fake_results

    async def fake_mark_running(supabase: Any, scan_id: str) -> None:
        calls.setdefault("running", []).append(scan_id)

    async def fake_persist(
        supabase: Any, scan_id: str, results: ScanResults, issues: list[Any]
    ) -> None:
        calls["persist"] = {"scan_id": scan_id, "issues_len": len(issues)}

    async def fake_failed(supabase: Any, scan_id: str, message: str) -> None:
        calls["failed"] = {"scan_id": scan_id, "message": message}

    with (
        patch("app.services.scan_queue.run_scan", fake_run_scan),
        patch("app.services.scan_queue.mark_scan_running", fake_mark_running),
        patch("app.services.scan_queue.persist_scan_completion", fake_persist),
        patch("app.services.scan_queue.mark_scan_failed", fake_failed),
        patch("app.services.scan_queue.get_supabase_client", return_value=None),
    ):
        await queue.enqueue(
            ScanJob(scan_id="s1", url="https://x.com", device="mobile")
        )
        await _wait_until_idle(queue)
        await queue.stop()

    assert calls["run_scan"] == {"url": "https://x.com", "device": "mobile"}
    assert calls["running"] == ["s1"]
    assert calls["persist"]["scan_id"] == "s1"
    assert "failed" not in calls


async def test_queue_marks_failed_on_scan_error() -> None:
    queue = ScanQueue()
    calls: dict[str, Any] = {}

    async def raising_run_scan(*args: Any, **kwargs: Any) -> ScanResults:
        raise ScanError("lh exploded")

    async def fake_failed(supabase: Any, scan_id: str, message: str) -> None:
        calls["failed"] = {"scan_id": scan_id, "message": message}

    async def noop_running(supabase: Any, scan_id: str) -> None:
        return None

    async def noop_persist(*args: Any, **kwargs: Any) -> None:
        return None

    with (
        patch("app.services.scan_queue.run_scan", raising_run_scan),
        patch("app.services.scan_queue.mark_scan_running", noop_running),
        patch("app.services.scan_queue.persist_scan_completion", noop_persist),
        patch("app.services.scan_queue.mark_scan_failed", fake_failed),
        patch("app.services.scan_queue.get_supabase_client", return_value=None),
    ):
        await queue.enqueue(
            ScanJob(scan_id="s2", url="https://x.com", device="mobile")
        )
        await _wait_until_idle(queue)
        await queue.stop()

    assert calls["failed"] == {"scan_id": "s2", "message": "lh exploded"}


async def test_queue_skips_mark_failed_when_row_is_missing() -> None:
    queue = ScanQueue()
    calls: dict[str, Any] = {}

    async def raising_running(supabase: Any, scan_id: str) -> None:
        raise ScanRowMissingError(f"scans row {scan_id} not found")

    async def fake_failed(supabase: Any, scan_id: str, message: str) -> None:
        calls["failed"] = {"scan_id": scan_id, "message": message}

    async def noop_run_scan(*args: Any, **kwargs: Any) -> ScanResults:
        calls["ran_scan"] = True
        raise AssertionError("run_scan should not be reached")

    async def noop_persist(*args: Any, **kwargs: Any) -> None:
        return None

    with (
        patch("app.services.scan_queue.mark_scan_running", raising_running),
        patch("app.services.scan_queue.run_scan", noop_run_scan),
        patch("app.services.scan_queue.persist_scan_completion", noop_persist),
        patch("app.services.scan_queue.mark_scan_failed", fake_failed),
        patch("app.services.scan_queue.get_supabase_client", return_value=None),
    ):
        await queue.enqueue(
            ScanJob(scan_id="s-missing", url="https://x.com", device="mobile")
        )
        await _wait_until_idle(queue)
        await queue.stop()

    assert "failed" not in calls
    assert "ran_scan" not in calls


async def test_queue_serializes_concurrent_jobs(fake_results: ScanResults) -> None:
    queue = ScanQueue()
    running_now = 0
    max_concurrent = 0

    async def slow_run_scan(*args: Any, **kwargs: Any) -> ScanResults:
        nonlocal running_now, max_concurrent
        running_now += 1
        max_concurrent = max(max_concurrent, running_now)
        await asyncio.sleep(0.05)
        running_now -= 1
        return fake_results

    async def noop(*args: Any, **kwargs: Any) -> None:
        return None

    with (
        patch("app.services.scan_queue.run_scan", slow_run_scan),
        patch("app.services.scan_queue.mark_scan_running", noop),
        patch("app.services.scan_queue.persist_scan_completion", noop),
        patch("app.services.scan_queue.mark_scan_failed", noop),
        patch("app.services.scan_queue.get_supabase_client", return_value=None),
    ):
        for i in range(3):
            await queue.enqueue(
                ScanJob(scan_id=f"s{i}", url="https://x.com", device="mobile")
            )
        await _wait_until_idle(queue, timeout=3.0)
        await queue.stop()

    assert max_concurrent == 1
