"""Post-deploy verification for the OpenRouter + logistics rollout.

Run after flipping LLM_PROVIDER=openrouter and
LOGISTICS_EXTRACTION_ENABLED=true to confirm both changes are
actually flowing through production. Hits Supabase read-only.

Usage:
    cd apps/wyrdfold-api
    PYTHONPATH=. uv run python scripts/check_openrouter_rollout.py
"""

from __future__ import annotations

import statistics
from datetime import UTC, datetime, timedelta
from typing import Any, cast

from app.supabase_pool import get_supabase_pool, init_supabase

_LOOKBACK_HOURS = 24


def _query_recent_costs(sb: Any, purpose_prefix: str) -> list[dict[str, Any]]:
    since = (datetime.now(UTC) - timedelta(hours=_LOOKBACK_HOURS)).isoformat()
    resp = (
        sb.table("llm_costs")
        .select(
            "model, purpose, input_tokens, output_tokens, "
            "cache_read_input_tokens, cost_usd, latency_ms, created_at"
        )
        .like("purpose", f"{purpose_prefix}%")
        .gte("created_at", since)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return cast(list[dict[str, Any]], resp.data or [])


def _check_phase2(sb: Any) -> None:
    rows = _query_recent_costs(sb, "fit.job")
    print(f"\n## Phase 2 (`fit.job`) — last {_LOOKBACK_HOURS}h")
    print(f"Calls: {len(rows)}")
    if not rows:
        print(
            "  ⚠  No recent calls. Either the poller hasn't run since the "
            "deploy, or no jobs reached Phase 2. Trigger a poll cycle or "
            "re-grade a target to see results here."
        )
        return

    models = {r.get("model") for r in rows}
    costs = [float(r.get("cost_usd", 0)) for r in rows]
    latencies = [int(r.get("latency_ms", 0)) for r in rows]
    cache_hits = sum(
        1 for r in rows if int(r.get("cache_read_input_tokens", 0)) > 0
    )

    print(f"  Models seen: {sorted(m for m in models if m)}")
    print(f"  Mean cost/call: ${statistics.mean(costs):.5f}")
    print(f"  Median cost/call: ${statistics.median(costs):.5f}")
    print(f"  Median latency: {int(statistics.median(latencies))}ms")
    print(f"  Prompt-cache hits: {cache_hits}/{len(rows)}")
    print("  ✓  Phase 2 is succeeding (calls reached the LLM + persisted).")
    print(
        "     Note: llm_costs.model stores the internal ModelId, not the "
        "OpenRouter response slug, so it can't distinguish OR vs Anthropic-"
        "direct. Confirm route via Railway env var: LLM_PROVIDER=openrouter."
    )


def _check_logistics(sb: Any) -> None:
    print("\n## Logistics extraction (`scores.logistics_filters`)")
    since = (datetime.now(UTC) - timedelta(hours=_LOOKBACK_HOURS)).isoformat()

    # Count: how many scores rows have been updated in the last 24h
    # AND have logistics_filters populated?
    populated = (
        sb.table("scores")
        .select("id", count="exact")
        .gte("updated_at", since)
        .not_.is_("logistics_filters", "null")
        .limit(1)
        .execute()
    )
    not_populated = (
        sb.table("scores")
        .select("id", count="exact")
        .gte("updated_at", since)
        .is_("logistics_filters", "null")
        .limit(1)
        .execute()
    )
    pop_count = int(populated.count or 0)
    null_count = int(not_populated.count or 0)
    total = pop_count + null_count

    print(f"  Scores rows updated in last {_LOOKBACK_HOURS}h: {total}")
    print(f"  With logistics_filters populated: {pop_count}")
    print(f"  Still NULL: {null_count}")

    if total == 0:
        print("  ⚠  No score updates yet — same caveat as Phase 2 above.")
    elif pop_count == 0:
        print(
            "  ✗  No logistics_filters populated. "
            "LOGISTICS_EXTRACTION_ENABLED might still be false, OR the "
            "grader is being called via the old code path (less likely)."
        )
    elif null_count == 0:
        print("  ✓  Every recent score row has logistics_filters populated.")
    else:
        print(
            f"  ⚠  Partial: {pop_count}/{total} populated. Could be "
            f"normal if the flag flipped mid-cycle. Re-check in an hour."
        )

    # Sample one populated row so we can eyeball the shape.
    sample = (
        sb.table("scores")
        .select("logistics_filters")
        .gte("updated_at", since)
        .not_.is_("logistics_filters", "null")
        .limit(1)
        .execute()
    )
    sample_rows = cast(list[dict[str, Any]], sample.data or [])
    if sample_rows:
        print(f"  Sample shape: {sample_rows[0].get('logistics_filters')}")


def main() -> None:
    init_supabase()
    sb = get_supabase_pool()
    if sb is None:
        raise RuntimeError("Supabase not configured — check .env")

    print("=" * 60)
    print("OpenRouter + Logistics rollout verification")
    print("=" * 60)

    _check_phase2(sb)
    _check_logistics(sb)

    print(
        "\nIf both checks ✓: rollout is healthy. "
        "Move on to the backfill if you want logistics on historical "
        "rows (scripts/backfill_phase2_fit.py)."
    )
    print(
        "If either ⚠/✗: re-check Railway env vars and confirm the "
        "container restart picked them up.\n"
    )


if __name__ == "__main__":
    main()
