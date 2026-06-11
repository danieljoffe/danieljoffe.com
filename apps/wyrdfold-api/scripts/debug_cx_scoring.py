"""Why do CX-relevant director roles score low for Mel's target?

For each job whose title matches a CX keyword, print scoring_status + score +
axis_scores so we can tell a *graded-low* job (Phase-2 ran, scorer disagrees)
from an *ungraded* one (still keyword-scored, Phase-2 backlog/starvation).

Usage:
    cd apps/wyrdfold-api
    PYTHONPATH=. railway run -- uv run python scripts/debug_cx_scoring.py
"""

from __future__ import annotations

from collections import Counter
from typing import Any, cast

from app.supabase_pool import get_supabase_pool, init_supabase

MEL_TARGET_ID = "4195d651-2009-4c43-bc6b-beec4d3fca0b"
CX_TOKENS = (
    "customer experience",
    "customer success",
    "customer support",
    "customer service",
    "customer operations",
    "cx",
    "client success",
    "onboarding",
)


def main() -> None:
    init_supabase()
    sb = get_supabase_pool()
    if sb is None:
        raise RuntimeError("Supabase not configured")

    scores = cast(
        list[dict[str, Any]],
        (
            sb.table("scores")
            .select("job_posting_id, score, scoring_status, axis_scores")
            .eq("target_id", MEL_TARGET_ID)
            .eq("excluded", False)
            .order("score", desc=True)
            .execute()
        ).data
        or [],
    )

    by_status: Counter[str] = Counter(s.get("scoring_status") or "?" for s in scores)
    print(f"# all excluded=False scores: {len(scores)}")
    print(f"# scoring_status breakdown: {dict(by_status)}\n")

    ids = [s["job_posting_id"] for s in scores]
    jobs: dict[str, dict[str, Any]] = {}
    for i in range(0, len(ids), 200):
        jr = (
            sb.table("jobs")
            .select("id, title, company_name, status")
            .in_("id", ids[i : i + 200])
            .execute()
        )
        for row in cast(list[dict[str, Any]], jr.data or []):
            jobs[row["id"]] = row

    cx = []
    for s in scores:
        job = jobs.get(s["job_posting_id"])
        if not job:
            continue
        title = (job.get("title") or "").lower()
        if any(tok in title for tok in CX_TOKENS):
            cx.append({**s, **job})

    graded = [c for c in cx if c.get("scoring_status") == "complete"]
    ungraded = [c for c in cx if c.get("scoring_status") != "complete"]
    print(
        f"# CX-title matches: {len(cx)}  "
        f"(complete/graded={len(graded)}, ungraded={len(ungraded)})\n"
    )

    print(f"{'score':>5}  {'status':<9}  {'jobstat':<8}  {'title':<50}  {'company':<20}")
    print("-" * 100)
    for c in cx[:40]:
        print(
            f"{c.get('score', '?'):>5}  "
            f"{(c.get('scoring_status') or '?'):<9}  "
            f"{(c.get('status') or '?'):<8}  "
            f"{(c.get('title') or '').strip()[:48]:<50}  "
            f"{(c.get('company_name') or '').strip()[:18]:<20}"
        )

    print("\n# axis_scores for the graded CX roles (the real LLM verdicts):")
    for c in graded[:15]:
        print(
            f"  score={c.get('score')}  {(c.get('title') or '').strip()[:50]}  "
            f"axes={c.get('axis_scores')}"
        )
    if not graded:
        print("  (none Phase-2 graded — every CX role is showing a keyword score)")


if __name__ == "__main__":
    main()
