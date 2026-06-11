"""Read-only: where did the LLM spend go? Groups llm_costs by purpose/day/user.

Run with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env. Pass --since/--until
ISO dates to bound the window (default 2026-06-04 .. 2026-06-11).
"""

from __future__ import annotations

import argparse
import os
from collections import defaultdict

from supabase import create_client


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", default="2026-06-04")
    ap.add_argument("--until", default="2026-06-11")
    args = ap.parse_args()

    url = os.environ.get("SUPABASE_URL") or os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    sb = create_client(url, os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    rows: list[dict] = []
    page = 0
    while True:
        chunk = (
            sb.table("llm_costs")
            .select("cost_usd,purpose,user_id,created_at,metadata")
            .gte("created_at", args.since)
            .lt("created_at", args.until)
            .order("created_at")
            .range(page * 1000, page * 1000 + 999)
            .execute()
            .data
            or []
        )
        rows.extend(chunk)
        if len(chunk) < 1000:
            break
        page += 1

    total = sum(float(r.get("cost_usd") or 0) for r in rows)
    print(f"window {args.since} .. {args.until}: {len(rows)} calls, ${total:.2f} total\n")

    by_purpose: dict[str, list[float]] = defaultdict(list)
    by_day: dict[str, float] = defaultdict(float)
    by_user: dict[str, float] = defaultdict(float)
    by_target: dict[str, float] = defaultdict(float)
    for r in rows:
        c = float(r.get("cost_usd") or 0)
        by_purpose[r.get("purpose") or "?"].append(c)
        by_day[str(r.get("created_at"))[:10]] += c
        by_user[str(r.get("user_id"))] += c
        meta = r.get("metadata") or {}
        tid = meta.get("target_id") if isinstance(meta, dict) else None
        if tid:
            by_target[str(tid)] += c

    print("BY PURPOSE (cost desc):")
    for p, costs in sorted(by_purpose.items(), key=lambda kv: -sum(kv[1])):
        print(f"  {p:35} ${sum(costs):8.2f}  calls={len(costs):6d}  avg=${sum(costs)/len(costs):.4f}")

    print("\nBY DAY:")
    for d in sorted(by_day):
        print(f"  {d}  ${by_day[d]:8.2f}")

    print("\nBY USER:")
    for u, c in sorted(by_user.items(), key=lambda kv: -kv[1]):
        print(f"  {u:40} ${c:8.2f}")

    print("\nBY TARGET (where metadata.target_id present):")
    for t, c in sorted(by_target.items(), key=lambda kv: -kv[1])[:10]:
        print(f"  {t:40} ${c:8.2f}")


if __name__ == "__main__":
    main()
