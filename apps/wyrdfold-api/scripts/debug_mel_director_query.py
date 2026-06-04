"""Debug: replicate the /jobs view for Mel's "Director of CX Ops" target
with search="director" and location="us", directly against the DB.

Compares against the FE's rendered list. Use this when the rendered
results look suspect.

Usage:
    cd apps/wyrdfold-api
    uv run python scripts/debug_mel_director_query.py
"""

from __future__ import annotations

import logging
from typing import Any, cast

from app.supabase_pool import get_supabase_pool, init_supabase

logging.basicConfig(level=logging.INFO, format="%(message)s")

MEL_TARGET_ID = "4195d651-2009-4c43-bc6b-beec4d3fca0b"
SEARCH_TOKEN = "director"
LOCATION_TOKEN = "us"


def main() -> None:
    init_supabase()
    supabase = get_supabase_pool()
    if supabase is None:
        raise RuntimeError("Supabase not configured — check .env")

    # Step 1: pull all scores for Mel's target where excluded=False.
    score_resp = (
        supabase.table("scores")
        .select(
            "job_posting_id, score, recency_score, scoring_status, "
            "axis_scores, score_breakdown"
        )
        .eq("target_id", MEL_TARGET_ID)
        .eq("excluded", False)
        .order("score", desc=True)
        .execute()
    )
    score_rows = cast(list[dict[str, Any]], score_resp.data or [])
    print(f"scores rows for target: {len(score_rows)}")
    if not score_rows:
        return

    # Step 2: fetch matching job rows (paginate the IN clause).
    job_ids = [r["job_posting_id"] for r in score_rows]
    jobs_by_id: dict[str, dict[str, Any]] = {}
    chunk = 200
    for i in range(0, len(job_ids), chunk):
        page_ids = job_ids[i : i + chunk]
        jr = (
            supabase.table("jobs")
            .select(
                "id, title, company_name, location, status, first_seen_at, "
                "salary_text"
            )
            .in_("id", page_ids)
            .execute()
        )
        for row in cast(list[dict[str, Any]], jr.data or []):
            jobs_by_id[row["id"]] = row
    print(f"hydrated jobs: {len(jobs_by_id)}")

    # Step 3: filter by search token (ilike on title) + location token.
    # This mirrors the /jobs router: search is OR-chain on title; location
    # filter keeps rows whose location ilike '%us%'.
    matches: list[dict[str, Any]] = []
    for s in score_rows:
        job = jobs_by_id.get(s["job_posting_id"])
        if job is None:
            continue
        title = (job.get("title") or "").lower()
        location = (job.get("location") or "").lower()
        if SEARCH_TOKEN not in title:
            continue
        if LOCATION_TOKEN not in location:
            continue
        matches.append({**s, **job})

    print(
        f"\nAfter filters (title contains '{SEARCH_TOKEN}', "
        f"location contains '{LOCATION_TOKEN}'): {len(matches)} rows\n"
    )

    # Step 4: print a clean table.
    print(
        f"{'score':>5}  {'rcncy':>5}  {'status':<10}  "
        f"{'title':<55}  {'company':<22}  {'location':<28}"
    )
    print("-" * 135)
    for m in matches:
        title = (m.get("title") or "").strip()[:53]
        company = (m.get("company_name") or "").strip()[:20]
        location = (m.get("location") or "").strip()[:26]
        score = m.get("score", "?")
        recency = m.get("recency_score", "?")
        status = (m.get("status") or "?")[:10]
        print(
            f"{score:>5}  {recency:>5}  {status:<10}  "
            f"{title:<55}  {company:<22}  {location:<28}"
        )

    # Step 5: sanity check — does the count match the UI?
    print(f"\nTotal: {len(matches)} matching rows")
    print(
        "\nIf UI shows N rows and this script shows M:"
        "\n  M > N  → UI applies an extra filter (min_score? pagination? excluded?)"
        "\n  M < N  → script logic differs from the router (location parsing? search OR chain?)"
        "\n  M == N → query path is consistent; investigate scoring or sort."
    )


if __name__ == "__main__":
    main()
