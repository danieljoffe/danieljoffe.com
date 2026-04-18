from types import SimpleNamespace
from typing import Any

import pytest

from app.services.issues import ParsedIssue
from app.services.persistence import (
    ScanRowMissingError,
    mark_scan_failed,
    mark_scan_running,
    persist_scan_completion,
)
from app.services.scanner import ScanResults


class _FakeQuery:
    def __init__(self, log: list[tuple[str, dict[str, Any]]]) -> None:
        self._log = log
        self._table = ""
        self._op = ""
        self._payload: Any = None

    def update(self, payload: dict[str, Any]) -> "_FakeQuery":
        self._op = "update"
        self._payload = payload
        return self

    def insert(self, rows: list[dict[str, Any]]) -> "_FakeQuery":
        self._op = "insert"
        self._payload = rows
        return self

    def eq(self, column: str, value: Any) -> "_FakeQuery":
        self._payload = {"filter_column": column, "filter_value": value, "payload": self._payload}
        return self

    def execute(self) -> SimpleNamespace:
        self._log.append((f"{self._table}.{self._op}", self._payload))
        return SimpleNamespace(data=[{"ok": True}])


class _FakeSupabase:
    def __init__(self) -> None:
        self.log: list[tuple[str, Any]] = []

    def table(self, name: str) -> _FakeQuery:
        q = _FakeQuery(self.log)
        q._table = name
        return q


@pytest.fixture
def fake_supabase() -> _FakeSupabase:
    return _FakeSupabase()


@pytest.fixture
def scan_results() -> ScanResults:
    return ScanResults(
        lighthouse={
            "categories": {
                "performance": {"score": 0.82},
                "accessibility": {"score": 0.95},
                "seo": {"score": 0.90},
                "best-practices": {"score": 0.70},
            },
            "audits": {
                "first-contentful-paint": {"numericValue": 1500},
                "largest-contentful-paint": {"numericValue": 2400},
                "total-blocking-time": {"numericValue": 200},
                "cumulative-layout-shift": {"numericValue": 0.05},
                "speed-index": {"numericValue": 3200},
            },
        },
        axe={"violations": []},
        page_title="Example Page",
        page_description="A description",
        screenshot_url="https://supa.example/shots/abc.jpg",
    )


async def test_mark_scan_running_updates_status(fake_supabase: _FakeSupabase) -> None:
    await mark_scan_running(fake_supabase, "scan-1")
    assert fake_supabase.log == [
        (
            "scans.update",
            {"filter_column": "id", "filter_value": "scan-1", "payload": {"status": "running"}},
        )
    ]


async def test_mark_scan_running_noops_when_supabase_is_none() -> None:
    await mark_scan_running(None, "scan-1")  # no error, no write


async def test_mark_scan_running_raises_when_row_missing() -> None:
    class _EmptySupabase:
        def table(self, _name: str) -> "_EmptySupabase":
            return self

        def update(self, _payload: dict[str, Any]) -> "_EmptySupabase":
            return self

        def eq(self, _col: str, _val: Any) -> "_EmptySupabase":
            return self

        def execute(self) -> SimpleNamespace:
            return SimpleNamespace(data=[])

    with pytest.raises(ScanRowMissingError):
        await mark_scan_running(_EmptySupabase(), "scan-missing")


async def test_persist_scan_completion_writes_scores_and_cwv(
    fake_supabase: _FakeSupabase, scan_results: ScanResults
) -> None:
    await persist_scan_completion(fake_supabase, "scan-2", scan_results, [])
    assert len(fake_supabase.log) == 1
    op, payload = fake_supabase.log[0]
    assert op == "scans.update"
    scan_update = payload["payload"]
    assert scan_update["score_performance"] == 82
    assert scan_update["score_accessibility"] == 95
    assert scan_update["score_best_practices"] == 70
    assert scan_update["grade_overall"] in {"A", "B"}
    assert scan_update["fcp_ms"] == 1500
    assert scan_update["lcp_ms"] == 2400
    assert scan_update["page_title"] == "Example Page"


async def test_persist_scan_completion_inserts_issue_rows(
    fake_supabase: _FakeSupabase, scan_results: ScanResults
) -> None:
    issues = [
        ParsedIssue(
            category="performance",
            severity="critical",
            title="slow",
            description="desc",
            impact="impact",
            fix_difficulty="easy",
            technical_detail={"auditId": "x"},
        ),
        ParsedIssue(
            category="accessibility",
            severity="warning",
            title="alt",
            description="desc",
            impact="impact",
            fix_difficulty="easy",
            technical_detail={"auditId": "y"},
        ),
    ]
    await persist_scan_completion(fake_supabase, "scan-3", scan_results, issues)
    insert_entries = [e for e in fake_supabase.log if e[0] == "scan_issues.insert"]
    assert len(insert_entries) == 1
    rows = insert_entries[0][1]
    assert len(rows) == 2
    assert rows[0]["scan_id"] == "scan-3"
    assert rows[0]["sort_order"] == 0
    assert rows[1]["sort_order"] == 1


async def test_mark_scan_failed_records_error(fake_supabase: _FakeSupabase) -> None:
    await mark_scan_failed(fake_supabase, "scan-4", "boom")
    assert fake_supabase.log == [
        (
            "scans.update",
            {
                "filter_column": "id",
                "filter_value": "scan-4",
                "payload": {"status": "failed", "error_message": "boom"},
            },
        )
    ]
