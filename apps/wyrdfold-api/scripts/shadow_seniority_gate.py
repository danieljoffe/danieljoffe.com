"""Shadow-measure the Phase-2 seniority pre-gate (#902).

Applies ``passes_seniority_gate`` retrospectively to every already-graded
(complete) row on a target and reports, per tolerance:
  - grades the gate WOULD have skipped (the Phase-2 spend it saves),
  - of those, how many were WASTE (fit < WASTE_FLOOR) vs GOOD (fit >= GOOD).
A good gate skips lots of waste and almost no good roles. Read-only.

Usage:
    cd apps/wyrdfold-api
    PYTHONPATH=. railway run -- uv run python scripts/shadow_seniority_gate.py
"""

from __future__ import annotations

from typing import Any, cast

from app.services.fit.seniority_gate import detect_title_rank, passes_seniority_gate
from app.supabase_pool import get_supabase_pool, init_supabase

MEL_TARGET_ID = "4195d651-2009-4c43-bc6b-beec4d3fca0b"
SENIORITY_HINT = "director"
WASTE_FLOOR = 20
GOOD = 45


def main() -> None:
    init_supabase()
    sb = get_supabase_pool()
    if sb is None:
        raise RuntimeError("Supabase not configured")

    scores: list[dict[str, Any]] = []
    page = 0
    while True:
        resp = (
            sb.table("scores")
            .select("job_posting_id, score")
            .eq("target_id", MEL_TARGET_ID)
            .eq("scoring_status", "complete")
            .range(page * 1000, page * 1000 + 999)
            .execute()
        )
        chunk = cast(list[dict[str, Any]], resp.data or [])
        scores.extend(chunk)
        if len(chunk) < 1000:
            break
        page += 1
    scores = [s for s in scores if s.get("score") is not None]

    ids = [s["job_posting_id"] for s in scores]
    titles: dict[str, str] = {}
    for i in range(0, len(ids), 200):
        jr = (
            sb.table("jobs")
            .select("id, title")
            .in_("id", ids[i : i + 200])
            .execute()
        )
        for row in cast(list[dict[str, Any]], jr.data or []):
            titles[row["id"]] = row.get("title") or ""

    rows = [
        {"title": titles.get(s["job_posting_id"], ""), "score": int(s["score"])}
        for s in scores
        if s["job_posting_id"] in titles
    ]
    total = len(rows)
    waste = [r for r in rows if r["score"] < WASTE_FLOOR]
    good = [r for r in rows if r["score"] >= GOOD]
    print(f"# graded rows: {total}  (waste fit<{WASTE_FLOOR}: {len(waste)}, "
          f"good fit>={GOOD}: {len(good)})\n")

    print(f"{'tol':>3}  {'skipped':>7}  {'waste_saved':>11}  {'good_lost':>9}  "
          f"{'precision':>9}")
    for tol in (0, 1, 2):
        skipped = [
            r for r in rows
            if not passes_seniority_gate(r["title"], SENIORITY_HINT, tolerance=tol)
        ]
        ws = sum(1 for r in skipped if r["score"] < WASTE_FLOOR)
        gl = sum(1 for r in skipped if r["score"] >= GOOD)
        prec = f"{ws / len(skipped) * 100:.0f}%" if skipped else "—"
        print(f"{tol:>3}  {len(skipped):>7}  {ws:>11}  {gl:>9}  {prec:>9}")

    print("\n# sample of WASTE titles (fit<20) with detected rank "
          "[director=4, manager=3, ic/senior=1, sub=0, None=ambiguous]:")
    for r in waste[:25]:
        print(f"  fit={r['score']:>2}  rank={detect_title_rank(r['title'])}  "
              f"{r['title'][:60]}")


if __name__ == "__main__":
    main()
