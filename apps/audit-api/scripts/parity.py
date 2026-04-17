"""Parity test: compare Node vs Python audit services on the same URLs.

Usage:
    uv run --package audit-api python apps/audit-api/scripts/parity.py

Reads configuration from environment (see PARITY_* + SUPABASE_* vars below).
Fires both services against a fixed set of URLs, polls Supabase until both
finish, then prints a per-URL diff table and exits non-zero on meaningful
mismatches. Tolerance bands are wide for performance (network variance) and
tight for a11y/seo/best-practices (deterministic dimensions).
"""

from __future__ import annotations

import asyncio
import os
import sys
import time
import uuid
from dataclasses import dataclass
from typing import Any

import httpx
from supabase import create_client

TEST_URLS = [
    "https://example.com",
    "https://web.dev",
    "https://vercel.com",
]

SCORE_TOLERANCES = {
    "score_performance": 10,
    "score_accessibility": 3,
    "score_seo": 3,
    "score_best_practices": 3,
}

CWV_TOLERANCE_PCT = 0.3  # 30% band for LCP/FCP/TBT/SI
ISSUE_COUNT_TOLERANCE = 3

POLL_INTERVAL_SEC = 3
POLL_TIMEOUT_SEC = 180


@dataclass
class ServiceConfig:
    name: str
    url: str
    api_key: str


@dataclass
class ScanRow:
    id: str
    status: str
    score_performance: int | None
    score_accessibility: int | None
    score_seo: int | None
    score_best_practices: int | None
    grade_overall: str | None
    lcp_ms: float | None
    fcp_ms: float | None
    tbt_ms: float | None
    cls: float | None
    si_ms: float | None
    error_message: str | None


def load_env() -> tuple[ServiceConfig, ServiceConfig, Any]:
    def _require(key: str) -> str:
        value = os.environ.get(key)
        if not value:
            sys.exit(f"missing required env var: {key}")
        return value

    node = ServiceConfig(
        name="node",
        url=_require("PARITY_NODE_SERVICE_URL").rstrip("/"),
        api_key=_require("PARITY_NODE_SERVICE_API_KEY"),
    )
    python = ServiceConfig(
        name="python",
        url=_require("PARITY_PYTHON_SERVICE_URL").rstrip("/"),
        api_key=_require("PARITY_PYTHON_SERVICE_API_KEY"),
    )
    supabase = create_client(
        _require("SUPABASE_URL"),
        _require("SUPABASE_SERVICE_ROLE_KEY"),
    )
    return node, python, supabase


async def _post_scan(
    client: httpx.AsyncClient, service: ServiceConfig, scan_id: str, url: str
) -> None:
    response = await client.post(
        f"{service.url}/run-scan",
        headers={"x-api-key": service.api_key, "content-type": "application/json"},
        json={"scan_id": scan_id, "url": url, "device_mode": "mobile"},
        timeout=30,
    )
    response.raise_for_status()


def _insert_queued(supabase: Any, scan_id: str, url: str) -> None:
    supabase.table("scans").insert(
        {"id": scan_id, "url": url, "status": "queued"}
    ).execute()


def _fetch_row(supabase: Any, scan_id: str) -> ScanRow:
    res = supabase.table("scans").select("*").eq("id", scan_id).single().execute()
    d = res.data or {}
    return ScanRow(
        id=d.get("id", scan_id),
        status=d.get("status", "unknown"),
        score_performance=d.get("score_performance"),
        score_accessibility=d.get("score_accessibility"),
        score_seo=d.get("score_seo"),
        score_best_practices=d.get("score_best_practices"),
        grade_overall=d.get("grade_overall"),
        lcp_ms=d.get("lcp_ms"),
        fcp_ms=d.get("fcp_ms"),
        tbt_ms=d.get("tbt_ms"),
        cls=d.get("cls"),
        si_ms=d.get("si_ms"),
        error_message=d.get("error_message"),
    )


def _count_issues(supabase: Any, scan_id: str) -> dict[str, int]:
    res = (
        supabase.table("scan_issues")
        .select("category", count="exact")
        .eq("scan_id", scan_id)
        .execute()
    )
    counts: dict[str, int] = {}
    for row in res.data or []:
        category = row.get("category", "unknown")
        counts[category] = counts.get(category, 0) + 1
    return counts


def _wait_for_completion(supabase: Any, scan_id: str) -> ScanRow:
    deadline = time.monotonic() + POLL_TIMEOUT_SEC
    while time.monotonic() < deadline:
        row = _fetch_row(supabase, scan_id)
        if row.status in ("completed", "failed"):
            return row
        time.sleep(POLL_INTERVAL_SEC)
    raise TimeoutError(f"scan {scan_id} did not finish in {POLL_TIMEOUT_SEC}s")


def _diff_scores(node: ScanRow, python: ScanRow) -> list[str]:
    failures: list[str] = []
    for field, tolerance in SCORE_TOLERANCES.items():
        a = getattr(node, field)
        b = getattr(python, field)
        if a is None or b is None:
            failures.append(f"{field}: node={a} python={b} (missing)")
            continue
        if abs(a - b) > tolerance:
            failures.append(f"{field}: node={a} python={b} diff={abs(a - b)} (>{tolerance})")
    if node.grade_overall != python.grade_overall:
        failures.append(f"grade_overall: node={node.grade_overall} python={python.grade_overall}")
    return failures


def _diff_cwv(node: ScanRow, python: ScanRow) -> list[str]:
    failures: list[str] = []
    for field in ("lcp_ms", "fcp_ms", "tbt_ms", "si_ms"):
        a = getattr(node, field)
        b = getattr(python, field)
        if a is None or b is None:
            continue
        if a == 0 and b == 0:
            continue
        ref = max(a, b, 1)
        if abs(a - b) / ref > CWV_TOLERANCE_PCT:
            pct = int(CWV_TOLERANCE_PCT * 100)
            failures.append(f"{field}: node={a:.0f} python={b:.0f} diff>{pct}%")
    return failures


def _diff_issues(node_counts: dict[str, int], python_counts: dict[str, int]) -> list[str]:
    failures: list[str] = []
    for category in set(node_counts) | set(python_counts):
        a = node_counts.get(category, 0)
        b = python_counts.get(category, 0)
        if abs(a - b) > ISSUE_COUNT_TOLERANCE:
            failures.append(f"issues.{category}: node={a} python={b} diff={abs(a - b)}")
    return failures


def _format_row(row: ScanRow, counts: dict[str, int]) -> str:
    lcp = f"{row.lcp_ms:.0f}ms" if row.lcp_ms is not None else "-"
    return (
        f"{row.status:<10} grade={row.grade_overall or '-'} "
        f"perf={row.score_performance} a11y={row.score_accessibility} "
        f"seo={row.score_seo} bp={row.score_best_practices} "
        f"lcp={lcp} issues={sum(counts.values())} {dict(counts)}"
    )


async def run_one(
    client: httpx.AsyncClient,
    node: ServiceConfig,
    python: ServiceConfig,
    supabase: Any,
    url: str,
) -> tuple[bool, list[str]]:
    node_id = str(uuid.uuid4())
    python_id = str(uuid.uuid4())

    print(f"\n=== {url}")
    print(f"  node_id   = {node_id}")
    print(f"  python_id = {python_id}")

    _insert_queued(supabase, node_id, url)
    _insert_queued(supabase, python_id, url)

    await asyncio.gather(
        _post_scan(client, node, node_id, url),
        _post_scan(client, python, python_id, url),
    )
    print("  both /run-scan accepted; polling for completion...")

    node_row, python_row = await asyncio.gather(
        asyncio.to_thread(_wait_for_completion, supabase, node_id),
        asyncio.to_thread(_wait_for_completion, supabase, python_id),
    )
    node_counts = _count_issues(supabase, node_id)
    python_counts = _count_issues(supabase, python_id)

    print(f"  NODE   {_format_row(node_row, node_counts)}")
    print(f"  PYTHON {_format_row(python_row, python_counts)}")

    if node_row.status != "completed":
        return False, [f"node scan failed: {node_row.error_message}"]
    if python_row.status != "completed":
        return False, [f"python scan failed: {python_row.error_message}"]

    failures = _diff_scores(node_row, python_row)
    failures += _diff_cwv(node_row, python_row)
    failures += _diff_issues(node_counts, python_counts)
    return not failures, failures


async def main() -> int:
    node, python, supabase = load_env()
    print(f"Node service:   {node.url}")
    print(f"Python service: {python.url}")
    print(f"Test URLs:      {len(TEST_URLS)}")

    all_pass = True
    async with httpx.AsyncClient() as client:
        for url in TEST_URLS:
            ok, failures = await run_one(client, node, python, supabase, url)
            if ok:
                print("  PARITY OK")
            else:
                all_pass = False
                print("  PARITY FAILURES:")
                for failure in failures:
                    print(f"    - {failure}")

    print("\n" + ("=" * 40))
    print("OVERALL: PASS" if all_pass else "OVERALL: FAIL")
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
