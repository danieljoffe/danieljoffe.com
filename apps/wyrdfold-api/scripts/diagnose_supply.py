"""Read-only supply/level cut for #845 — is the collapse supply or scoring?

For the target: classify promising jobs by seniority level (director+ vs
manager vs other) and at score>=50, and check whether target-driven source
discovery has run. READ-ONLY.
"""

from __future__ import annotations

import os
import re

from supabase import create_client

TARGET_ID = "4195d651-2009-4c43-bc6b-beec4d3fca0b"

DIR_PLUS = re.compile(r"\b(director|head of|vp|vice president|chief|svp|cxo)\b", re.I)
MANAGER = re.compile(r"\b(manager|lead|supervisor)\b", re.I)


def _level(title: str) -> str:
    if DIR_PLUS.search(title):
        return "director+"
    if MANAGER.search(title):
        return "manager"
    return "other"


def main() -> None:
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    sb = create_client(url, os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    t = TARGET_ID

    # All non-excluded scored rows for the target, with title + score.
    rows = (
        sb.table("scores")
        .select("score,promising,jobs(title,location)")
        .eq("target_id", t)
        .eq("excluded", False)
        .limit(5000)
        .execute()
        .data
    )
    levels: dict[str, int] = {"director+": 0, "manager": 0, "other": 0}
    promising_levels = {"director+": 0, "manager": 0, "other": 0}
    ge50_levels = {"director+": 0, "manager": 0, "other": 0}
    dir_ge40 = []
    for r in rows:
        jp = r.get("jobs") or {}
        title = jp.get("title") or ""
        lvl = _level(title)
        levels[lvl] += 1
        if r.get("promising"):
            promising_levels[lvl] += 1
        if (r.get("score") or 0) >= 50:
            ge50_levels[lvl] += 1
        if lvl == "director+" and (r.get("score") or 0) >= 40:
            dir_ge40.append((r.get("score"), title[:60], (jp.get("location") or "")[:24]))

    print(f"\n=== SUPPLY/LEVEL CUT (target {t}) ===")
    print(f"non-excluded scored rows analyzed: {len(rows)}")
    print("\nby seniority level (all non-excluded):")
    for k, v in levels.items():
        print(f"  {k:10}: {v}")
    print("\npromising=TRUE by level:")
    for k, v in promising_levels.items():
        print(f"  {k:10}: {v}")
    print("\nscore>=50 by level:")
    for k, v in ge50_levels.items():
        print(f"  {k:10}: {v}")

    print(f"\ndirector+ roles scoring >=40 ({len(dir_ge40)}):")
    for s, title, loc in sorted(dir_ge40, reverse=True)[:30]:
        print(f"  [{s:3}] {title:60} | {loc}")

    # Has target-driven source discovery run?
    disc_total = (
        sb.table("source_discoveries").select("id", count="exact").eq("target_id", t).execute().count
    )
    disc_added = (
        sb.table("source_discoveries")
        .select("id", count="exact")
        .eq("target_id", t)
        .eq("outcome", "inserted")
        .execute()
        .count
    )
    last = (
        sb.table("source_discoveries")
        .select("discovered_at,outcome,detected_company_name")
        .eq("target_id", t)
        .order("discovered_at", desc=True)
        .limit(5)
        .execute()
        .data
    )
    print("\n=== SOURCE DISCOVERY for this target ===")
    print(f"discovery rows total : {disc_total}")
    print(f"outcome=added        : {disc_added}")
    print("most recent:")
    for d in last:
        print(f"  {d.get('discovered_at')}  {d.get('outcome'):10} {d.get('detected_company_name')}")


if __name__ == "__main__":
    main()
