"""Does Phase-1 confidence predict the Phase-2 fit score?

If a confidence cutoff before Phase-2 is to save money WITHOUT dropping good
roles, low confidence must correlate with low fit. This cross-tabs
phase1_confidence vs the final Phase-2 score for every graded (complete) row
on a target, and reports how many *wasted* grades (fit < FLOOR) a given
confidence cutoff would actually have avoided — and how many *good* roles
(fit >= GOOD) it would have wrongly dropped.

Usage:
    cd apps/wyrdfold-api
    PYTHONPATH=. railway run -- uv run python scripts/debug_phase1_conf_vs_fit.py
"""

from __future__ import annotations

from typing import Any, cast

from app.supabase_pool import get_supabase_pool, init_supabase

MEL_TARGET_ID = "4195d651-2009-4c43-bc6b-beec4d3fca0b"
WASTE_FLOOR = 20   # fit < this == Phase-2 spent on a role that'll never surface
GOOD = 45          # fit >= this == a role we definitely wanted to grade


def _bucket(v: int, edges: tuple[int, ...]) -> str:
    lo = 0
    for e in edges:
        if v < e:
            return f"{lo}-{e - 1}"
        lo = e
    return f"{lo}+"


def main() -> None:
    init_supabase()
    sb = get_supabase_pool()
    if sb is None:
        raise RuntimeError("Supabase not configured")

    rows: list[dict[str, Any]] = []
    page = 0
    while True:
        resp = (
            sb.table("scores")
            .select("score, phase1_confidence")
            .eq("target_id", MEL_TARGET_ID)
            .eq("scoring_status", "complete")
            .range(page * 1000, page * 1000 + 999)
            .execute()
        )
        chunk = cast(list[dict[str, Any]], resp.data or [])
        rows.extend(chunk)
        if len(chunk) < 1000:
            break
        page += 1

    graded = [r for r in rows if r.get("score") is not None]
    with_conf = [r for r in graded if r.get("phase1_confidence") is not None]
    print(f"# graded (complete) rows: {len(graded)}")
    print(f"# of those WITH phase1_confidence: {len(with_conf)}")
    if not with_conf:
        print("  (no confidence data — these graded before the confidence prompt)")
        return

    conf_edges = (40, 60, 75, 90)
    fit_edges = (20, 35, 50)
    grid: dict[str, dict[str, int]] = {}
    for r in with_conf:
        cb = _bucket(int(r["phase1_confidence"]), conf_edges)
        fb = _bucket(int(r["score"]), fit_edges)
        grid.setdefault(cb, {}).setdefault(fb, 0)
        grid[cb][fb] += 1

    fit_labels = ["0-19", "20-34", "35-49", "50+"]
    print("\n# rows: phase1_confidence (down) x phase2 fit_score (across)")
    print(f"{'conf':<8} " + "  ".join(f"{f:>7}" for f in fit_labels) + "    total")
    for cb in sorted(grid):
        row = grid[cb]
        cells = [row.get(f, 0) for f in fit_labels]
        print(f"{cb:<8} " + "  ".join(f"{c:>7}" for c in cells) + f"    {sum(cells)}")

    # What a confidence cutoff would actually do.
    print(f"\n# confidence-cutoff impact (waste = fit<{WASTE_FLOOR}, good = fit>={GOOD})")
    print(f"{'cutoff':>7}  {'rows_dropped':>12}  {'waste_avoided':>13}  {'good_lost':>9}")
    for cut in (40, 50, 60, 70, 80):
        dropped = [r for r in with_conf if int(r["phase1_confidence"]) < cut]
        waste_avoided = sum(1 for r in dropped if int(r["score"]) < WASTE_FLOOR)
        good_lost = sum(1 for r in dropped if int(r["score"]) >= GOOD)
        print(f"{cut:>7}  {len(dropped):>12}  {waste_avoided:>13}  {good_lost:>9}")


if __name__ == "__main__":
    main()
