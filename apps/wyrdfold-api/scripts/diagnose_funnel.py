"""Read-only WyrdFold matching-funnel diagnostic (#845).

Dumps, for a single (user, target):
  - target config (the "nomenclature" suspect)
  - job_target_scores stage counts + score histogram vs list_min_score
  - job_sources health (enabled count + last_polled_at staleness)
  - job_postings supply freshness
  - a sample of the top-scored jobs for eyeballing

STRICTLY READ-ONLY: only .select() calls, no writes, no LLM, no polling.

Run:
  set -a && . ../../.env.prod && set +a && \
  SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  uv run --package wyrdfold-api python scripts/diagnose_funnel.py
"""

from __future__ import annotations

import argparse
import os
from collections import Counter
from datetime import UTC, datetime, timedelta

from supabase import create_client

TARGET_ID = "4195d651-2009-4c43-bc6b-beec4d3fca0b"
USER_ID = "4e0bed0e-05a1-479c-a346-5ff5a940a92b"


def _count(query) -> int:
    return query.execute().count or 0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", default=TARGET_ID)
    ap.add_argument("--user", default=USER_ID)
    args = ap.parse_args()
    t, u = args.target, args.user

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    if not url:
        raise SystemExit("SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL not set")
    sb = create_client(url, key)

    print(f"\n{'='*70}\nWYRDFOLD FUNNEL DIAGNOSTIC (#845)\ntarget={t}\nuser={u}\n{'='*70}")

    # ---- Step 1: target config (nomenclature suspect) -------------------
    tgt = sb.table("targets").select("*").eq("id", t).execute().data
    if not tgt:
        print("!! target not found")
        return
    tg = tgt[0]
    sp = tg.get("scoring_profile") or {}
    cats = sp.get("categories") or {}
    print("\n--- STEP 1: TARGET CONFIG ---")
    print(f"label           : {tg.get('label')!r}")
    print(f"is_active       : {tg.get('is_active')}")
    print(f"profile_version : {tg.get('profile_version')}")
    print(f"activation      : {tg.get('activation_status')}")
    print(f"seniority_hint  : {tg.get('seniority_hint')}")
    print(f"search_keywords : {tg.get('search_keywords')}")
    print(f"example_promising_titles   : {tg.get('example_promising_titles')}")
    print(f"example_unpromising_titles : {tg.get('example_unpromising_titles')}")
    print(f"scoring categories ({len(cats)}):")
    for name, c in cats.items():
        kws = (c or {}).get("keywords") or {}
        print(f"   {name} (w={(c or {}).get('weight')}): {list(kws.keys())}")
    print(f"scoring_profile.seniority : {sp.get('seniority')}")
    print(f"scoring_profile.negative  : {sp.get('negative')}")

    # ---- Step 2: DB-side funnel counts ----------------------------------
    sc = lambda: sb.table("scores").select("id", count="exact").eq("target_id", t)  # noqa: E731
    prof = sb.table("user_profiles").select("list_min_score").eq("user_id", u).execute().data
    min_score = (prof[0]["list_min_score"] if prof else None)

    total = _count(sc())
    promising = _count(sc().eq("promising", True))
    promising_null = _count(sc().is_("promising", "null"))
    graded = _count(sc().eq("promising", True).neq("scoring_status", "stage1"))
    complete = _count(sc().eq("scoring_status", "complete"))
    not_excluded = _count(sc().eq("excluded", False))

    print("\n--- STEP 2: SCORE-TABLE FUNNEL (job_target_scores) ---")
    print(f"list_min_score (user_profiles) : {min_score}")
    print(f"total scored rows for target   : {total}")
    print(f"  promising = TRUE             : {promising}")
    print(f"  promising = NULL (ungated)   : {promising_null}")
    print(f"  graded (promising, !=stage1) : {graded}")
    print(f"  scoring_status = complete    : {complete}")
    print(f"  excluded = FALSE             : {not_excluded}")

    # score histogram over non-excluded rows
    rows = (
        sb.table("scores")
        .select("score,promising,scoring_status,excluded")
        .eq("target_id", t)
        .eq("excluded", False)
        .limit(5000)
        .execute()
        .data
    )
    buckets = Counter()
    for r in rows:
        s = r.get("score") or 0
        buckets[(s // 10) * 10] += 1
    print(f"\nscore histogram (excluded=FALSE, n={len(rows)}):")
    for lo in range(0, 100, 10):
        n = buckets.get(lo, 0)
        bar = "#" * min(n, 60)
        print(f"  {lo:3d}-{lo+9:<3d} | {n:5d} {bar}")
    if min_score is not None:
        clears = sum(n for lo, n in buckets.items() if lo >= (min_score // 10) * 10)
        print(f"\n>= list_min_score ({min_score}), approx : {clears}")

    # ---- Step 2b: sources health ----------------------------------------
    src_total = _count(sb.table("sources").select("id", count="exact"))
    src_enabled = _count(sb.table("sources").select("id", count="exact").eq("enabled", True))
    srows = (
        sb.table("sources")
        .select("company_name,enabled,last_polled_at,poll_interval_minutes")
        .eq("enabled", True)
        .limit(2000)
        .execute()
        .data
    )
    now = datetime.now(UTC)
    never = sum(1 for s in srows if not s.get("last_polled_at"))

    def _age_days(ts: str | None) -> float | None:
        if not ts:
            return None
        return (now - datetime.fromisoformat(ts.replace("Z", "+00:00"))).total_seconds() / 86400

    ages = [a for s in srows if (a := _age_days(s.get("last_polled_at"))) is not None]
    stale_1d = sum(1 for a in ages if a > 1)
    stale_7d = sum(1 for a in ages if a > 7)
    print("\n--- STEP 2c: SOURCES HEALTH (job_sources) ---")
    print(f"total sources         : {src_total}")
    print(f"enabled sources       : {src_enabled}")
    print(f"  never polled (null) : {never}")
    print(f"  stale > 1 day       : {stale_1d}")
    print(f"  stale > 7 days      : {stale_7d}")
    if ages:
        print(f"  freshest poll       : {min(ages):.1f} days ago")
        print(f"  oldest poll         : {max(ages):.1f} days ago")

    # ---- Step 2d: supply freshness --------------------------------------
    jp_total = _count(sb.table("jobs").select("id", count="exact"))
    for label, days in (("7d", 7), ("30d", 30)):
        iso = (now - timedelta(days=days)).isoformat()
        n = _count(sb.table("jobs").select("id", count="exact").gte("created_at", iso))
        print(f"\njob_postings total: {jp_total}   created last {label}: {n}" if days == 7 else f"job_postings created last {label}: {n}")

    # ---- Step 2e: sample top-scored jobs --------------------------------
    sample = (
        sb.table("scores")
        .select("score,promising,scoring_status,excluded,jobs(title,company_name,location,created_at)")
        .eq("target_id", t)
        .order("score", desc=True)
        .limit(15)
        .execute()
        .data
    )
    print("\n--- STEP 2f: TOP-SCORED JOBS FOR THIS TARGET ---")
    for r in sample:
        jp = r.get("jobs") or {}
        print(
            f"  [{r.get('score'):3}] prom={r.get('promising')!s:5} "
            f"{r.get('scoring_status'):8} excl={r.get('excluded')!s:5} "
            f"| {(jp.get('title') or '')[:48]:48} @ {(jp.get('company_name') or '')[:20]:20} "
            f"| {(jp.get('location') or '')[:22]}"
        )

    print(f"\n{'='*70}\nDONE\n{'='*70}")


if __name__ == "__main__":
    main()
