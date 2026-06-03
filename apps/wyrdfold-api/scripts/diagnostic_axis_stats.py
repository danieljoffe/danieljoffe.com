"""Per-target Phase 2 axis distribution + score histogram (read-only).

Inspects ``scores`` rows that Phase 2 has graded (``scoring_status =
'complete'`` AND ``axis_scores IS NOT NULL``). For each active target:

  * mean, median, std-dev of overall ``score``
  * mean, median, std-dev of each axis (title / skills / seniority / domain)
  * Pearson correlation between each axis and overall score
  * overall-score histogram (bin width 5)
  * count of rows at each "round-number" anchor (50, 60, 70, 75, 80)
    — if any single value carries > 8% of the rows, the LLM is anchoring
    on its own scorecard examples and the prompt needs loosening.

No LLM calls. Pure read against ``scores`` + ``targets``. Safe to re-run.

Usage::

    cd apps/wyrdfold-api
    uv run python -m scripts.diagnostic_axis_stats

Output is plain text to stdout, suitable for copying into a findings doc.
"""

from __future__ import annotations

import math
import statistics
from collections import Counter
from collections.abc import Sequence
from typing import Any, cast

from app.services.targets.crud import get_active as get_active_targets
from app.supabase_pool import get_supabase_pool, init_supabase

AXES = ("title_fit", "skills_fit", "seniority_fit", "domain_fit")
_PAGE = 1000
_ANCHOR_VALUES = (50, 60, 65, 70, 75, 80, 85)


def _pearson(xs: Sequence[float], ys: Sequence[float]) -> float:
    """Pearson r over two equal-length numeric lists.

    Returns 0.0 for degenerate inputs (zero variance, < 2 points).
    """
    n = len(xs)
    if n < 2:
        return 0.0
    mx = sum(xs) / n
    my = sum(ys) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys, strict=True))
    dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    dy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if dx == 0 or dy == 0:
        return 0.0
    return num / (dx * dy)


def _histogram(values: list[int], bin_width: int = 5) -> list[tuple[int, int]]:
    """List of ``(bin_lower, count)`` ascending — only non-empty bins."""
    bins: Counter[int] = Counter()
    for v in values:
        bins[(v // bin_width) * bin_width] += 1
    return sorted(bins.items())


def _ascii_bar(count: int, max_count: int, width: int = 40) -> str:
    """Pad an ASCII bar so the visualization is consistent across targets."""
    if max_count == 0:
        return ""
    filled = round((count / max_count) * width)
    return "█" * filled + "·" * (width - filled)


def _fetch_complete_scores(
    sb: Any, target_id: str
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        resp = (
            sb.table("scores")
            .select("score, axis_scores")
            .eq("target_id", target_id)
            .eq("scoring_status", "complete")
            .not_.is_("axis_scores", "null")
            .range(offset, offset + _PAGE - 1)
            .execute()
        )
        page = cast(list[dict[str, Any]], resp.data or [])
        if not page:
            break
        rows.extend(page)
        if len(page) < _PAGE:
            break
        offset += _PAGE
    return rows


def _summarize_target(sb: Any, target: Any) -> None:
    print()
    print("=" * 78)
    print(f"TARGET: {target.label}  ({target.id})")
    print(f"        profile_version={target.profile_version}")
    print("=" * 78)

    rows = _fetch_complete_scores(sb, target.id)
    n = len(rows)
    if n == 0:
        print("  No Phase-2-graded rows yet. Skipping.")
        return

    overall = [int(r["score"]) for r in rows]
    axis_values: dict[str, list[int]] = {a: [] for a in AXES}
    for r in rows:
        ax = r.get("axis_scores") or {}
        for a in AXES:
            v = ax.get(a)
            if isinstance(v, int):
                axis_values[a].append(v)

    # ---- Overall stats ----
    print(f"\n  n = {n}")
    print(f"  overall: mean={statistics.mean(overall):.1f}  "
          f"median={statistics.median(overall)}  "
          f"stdev={statistics.stdev(overall) if n > 1 else 0:.1f}  "
          f"min={min(overall)}  max={max(overall)}")

    # ---- Per-axis stats + correlation with overall ----
    print(f"\n  {'axis':<14} {'n':>5} {'mean':>6} {'median':>7} {'stdev':>7} {'corr_overall':>13}")
    for a in AXES:
        vs = axis_values[a]
        if not vs:
            print(f"  {a:<14}     0     —       —       —          —    (no data)")
            continue
        # Pair only rows where the axis exists with the corresponding overall.
        paired_overall = [
            int(r["score"]) for r in rows
            if isinstance((r.get("axis_scores") or {}).get(a), int)
        ]
        corr = _pearson(vs, paired_overall)
        sd = statistics.stdev(vs) if len(vs) > 1 else 0.0
        marker = ""
        if sd < 5:
            marker = "  ← DEAD (stdev<5)"
        elif abs(corr) < 0.2:
            marker = "  ← DECORRELATED (|r|<0.2)"
        print(f"  {a:<14} {len(vs):>5} {statistics.mean(vs):>6.1f} "
              f"{statistics.median(vs):>7.1f} {sd:>7.1f} {corr:>13.2f}{marker}")

    # ---- Histogram of overall scores ----
    print("\n  overall score histogram (bin=5):")
    hist = _histogram(overall, 5)
    max_count = max(c for _, c in hist) if hist else 1
    for low, count in hist:
        pct = 100 * count / n
        print(f"    {low:>3}-{low + 4:<3} {count:>5} ({pct:5.1f}%)  {_ascii_bar(count, max_count)}")

    # ---- Anchor-value density ----
    print("\n  anchor-value density (>8% at a single integer = LLM anchoring):")
    flagged = False
    for v in _ANCHOR_VALUES:
        c = sum(1 for s in overall if s == v)
        if c == 0:
            continue
        pct = 100 * c / n
        warn = "  ← FLAG" if pct > 8 else ""
        if pct > 4 or warn:
            print(f"    score == {v}: {c:>4} ({pct:5.1f}%){warn}")
            if warn:
                flagged = True
    if not flagged:
        print("    no anchor clusters detected.")


def main() -> None:
    init_supabase()
    sb = get_supabase_pool()
    if sb is None:
        raise RuntimeError("Supabase not configured — check .env")
    targets = get_active_targets(sb)
    print(f"Diagnosing {len(targets)} active target(s).")
    for t in targets:
        _summarize_target(sb, t)
    print()
    print("=" * 78)
    print("Done. Copy the output into plan-wyrdfold-relevance-findings.md.")
    print("=" * 78)


if __name__ == "__main__":
    main()
