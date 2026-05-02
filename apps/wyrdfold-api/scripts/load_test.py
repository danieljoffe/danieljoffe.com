"""Lightweight async load generator for the wyrdfold-api.

Hits read-heavy endpoints with a configurable number of concurrent virtual
users for a fixed wall-clock duration. Reports p50/p95/p99 latency per
endpoint. Intended to populate `pg_stat_statements` with realistic query
patterns so we can identify hot/slow queries:

    SELECT query, calls, mean_exec_time, total_exec_time
      FROM pg_stat_statements
      ORDER BY total_exec_time DESC
      LIMIT 20;

Usage:

    WYRDFOLD_API_BASE_URL=http://localhost:8001 \
    WYRDFOLD_API_KEY=$(grep WYRDFOLD_API_KEY .env.local | cut -d= -f2) \
    uv run python scripts/load_test.py --duration 30 --vus 25

Reset stats before a fresh run:

    psql -c 'SELECT pg_stat_statements_reset();'
"""

from __future__ import annotations

import argparse
import asyncio
import os
import statistics
import time
from dataclasses import dataclass, field

import httpx

ENDPOINTS: list[tuple[str, str]] = [
    ("GET", "/jobs?limit=50"),
    ("GET", "/jobs?limit=50&search=engineer"),
    ("GET", "/insights/pipeline"),
    ("GET", "/insights/targets"),
    ("GET", "/insights/skills-cost"),
    ("GET", "/targets"),
    ("GET", "/targets/mine"),
    ("GET", "/targets/active"),
    ("GET", "/experience/optimized"),
    ("GET", "/experience/gap-health"),
]


@dataclass
class EndpointStats:
    method: str
    path: str
    durations_ms: list[float] = field(default_factory=list)
    statuses: dict[int, int] = field(default_factory=dict)
    errors: int = 0


async def _vu_loop(
    client: httpx.AsyncClient,
    deadline: float,
    stats: dict[str, EndpointStats],
) -> None:
    """One virtual user — round-robins through endpoints until deadline."""
    idx = 0
    while time.monotonic() < deadline:
        method, path = ENDPOINTS[idx % len(ENDPOINTS)]
        idx += 1
        key = f"{method} {path}"
        slot = stats[key]
        started = time.perf_counter()
        try:
            response = await client.request(method, path)
            elapsed_ms = (time.perf_counter() - started) * 1000.0
            slot.durations_ms.append(elapsed_ms)
            slot.statuses[response.status_code] = slot.statuses.get(response.status_code, 0) + 1
        except (httpx.HTTPError, TimeoutError):
            slot.errors += 1


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    sorted_values = sorted(values)
    k = max(0, min(len(sorted_values) - 1, int(round((pct / 100.0) * len(sorted_values)) - 1)))
    return sorted_values[k]


def _print_report(stats: dict[str, EndpointStats], elapsed: float, vus: int) -> None:
    total_requests = sum(len(s.durations_ms) for s in stats.values())
    total_errors = sum(s.errors for s in stats.values())
    rps = total_requests / elapsed if elapsed > 0 else 0

    print()
    print("=" * 96)
    print(
        f"  duration={elapsed:.1f}s  vus={vus}  requests={total_requests}  "
        f"errors={total_errors}  rps={rps:.1f}"
    )
    print("=" * 96)
    print(f"  {'endpoint':<48} {'n':>6} {'p50':>8} {'p95':>8} {'p99':>8} {'mean':>8}")
    print("-" * 96)

    rows = sorted(stats.values(), key=lambda s: -_percentile(s.durations_ms, 95))
    for slot in rows:
        if not slot.durations_ms:
            continue
        n = len(slot.durations_ms)
        p50 = _percentile(slot.durations_ms, 50)
        p95 = _percentile(slot.durations_ms, 95)
        p99 = _percentile(slot.durations_ms, 99)
        mean = statistics.mean(slot.durations_ms)
        label = f"{slot.method} {slot.path}"
        print(f"  {label:<48} {n:>6} {p50:>7.1f}ms {p95:>7.1f}ms {p99:>7.1f}ms {mean:>7.1f}ms")
        non_2xx = {code: count for code, count in slot.statuses.items() if code >= 300}
        if non_2xx or slot.errors:
            print(f"      ↳ non-2xx={non_2xx} errors={slot.errors}")
    print("=" * 96)
    print()
    print("Next: inspect pg_stat_statements for hot queries:")
    print(
        "  SELECT substring(query, 1, 80) AS q, calls, "
        "round(mean_exec_time::numeric, 2) AS mean_ms, "
        "round(total_exec_time::numeric, 1) AS total_ms"
    )
    print("    FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;")


async def _run(base_url: str, api_key: str, duration: int, vus: int) -> None:
    headers = {"x-api-key": api_key} if api_key else {}
    stats = {f"{m} {p}": EndpointStats(method=m, path=p) for m, p in ENDPOINTS}
    deadline = time.monotonic() + duration
    started = time.monotonic()

    async with httpx.AsyncClient(
        base_url=base_url,
        headers=headers,
        timeout=httpx.Timeout(30.0),
        limits=httpx.Limits(max_connections=vus * 2, max_keepalive_connections=vus),
    ) as client:
        tasks = [asyncio.create_task(_vu_loop(client, deadline, stats)) for _ in range(vus)]
        await asyncio.gather(*tasks)

    _print_report(stats, time.monotonic() - started, vus)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--duration", type=int, default=30, help="seconds (default 30)")
    parser.add_argument("--vus", type=int, default=20, help="virtual users (default 20)")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("WYRDFOLD_API_BASE_URL", "http://localhost:8001"),
    )
    parser.add_argument("--api-key", default=os.environ.get("WYRDFOLD_API_KEY", ""))
    args = parser.parse_args()

    if not args.api_key:
        print("warning: no WYRDFOLD_API_KEY set — protected endpoints will return 401")

    asyncio.run(_run(args.base_url, args.api_key, args.duration, args.vus))


if __name__ == "__main__":
    main()
