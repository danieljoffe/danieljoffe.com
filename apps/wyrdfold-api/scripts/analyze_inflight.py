"""Quick snapshot analyzer for a multi-model judge run mid-flight.

Reads the latest inflight JSON, prints per-model stats + per-band
agreement + baseline correlation. Use this to peek at trends before
the full 89-case run finishes.

Usage:
    cd apps/wyrdfold-api
    uv run python scripts/analyze_inflight.py
    uv run python scripts/analyze_inflight.py --file path/to/inflight.json
"""

from __future__ import annotations

import argparse
import json
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Any

_RESULTS_DIR = Path(__file__).parent / "eval_results"


def _latest_inflight() -> Path:
    candidates = sorted(_RESULTS_DIR.glob("*.inflight.json"))
    if not candidates:
        raise SystemExit("No inflight file in scripts/eval_results/.")
    return candidates[-1]


def _spearman(pairs: list[tuple[float, float]]) -> float:
    n = len(pairs)
    if n < 3:
        return 0.0

    def _ranks(vals: list[float]) -> list[float]:
        idx = sorted(range(n), key=lambda i: vals[i])
        out = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j + 1 < n and vals[idx[j + 1]] == vals[idx[i]]:
                j += 1
            avg = (i + j) / 2 + 1
            for k in range(i, j + 1):
                out[idx[k]] = avg
            i = j + 1
        return out

    rx = _ranks([a for a, _ in pairs])
    ry = _ranks([b for _, b in pairs])
    mx = sum(rx) / n
    my = sum(ry) / n
    num = sum((rx[i] - mx) * (ry[i] - my) for i in range(n))
    dx = sum((r - mx) ** 2 for r in rx) ** 0.5
    dy = sum((r - my) ** 2 for r in ry) ** 0.5
    return round(num / (dx * dy), 3) if dx and dy else 0.0


def analyze(path: Path) -> None:
    data = json.loads(path.read_text())
    cases: list[dict[str, Any]] = data.get("cases_so_far") or data.get("cases") or []
    completed = data.get("completed", len(cases))
    total = data.get("total", len(cases))
    models: dict[str, str] = data.get("models", {})

    print(f"\n# Snapshot — {path.name}")
    print(f"Completed: {completed}/{total} cases ({100*completed//total}%)\n")

    # Per-model stats
    per_model_scores: dict[str, list[int]] = defaultdict(list)
    per_model_cost: dict[str, float] = defaultdict(float)
    per_model_lat: dict[str, list[int]] = defaultdict(list)
    per_model_fail: dict[str, int] = defaultdict(int)
    per_model_pairs: dict[str, list[tuple[float, float]]] = defaultdict(list)
    # by band
    per_model_by_band: dict[str, dict[str, list[int]]] = defaultdict(
        lambda: defaultdict(list)
    )

    total_cost = 0.0
    for case in cases:
        meta = case.get("case_meta") or {}
        baseline = meta.get("baseline_score")
        band = meta.get("band")
        for r in case.get("results") or []:
            model = r["model"]
            per_model_cost[model] += r.get("cost_usd", 0.0)
            total_cost += r.get("cost_usd", 0.0)
            per_model_lat[model].append(r.get("latency_ms", 0))
            score = r.get("fit_score")
            if r.get("schema_ok") and isinstance(score, int):
                per_model_scores[model].append(score)
                if band:
                    per_model_by_band[model][band].append(score)
                if isinstance(baseline, int):
                    per_model_pairs[model].append((float(baseline), float(score)))
            else:
                per_model_fail[model] += 1

    print("## Per-model stats")
    print(
        "| Model | n | Mean | Stdev | Failures | $ total | $/call | "
        "Latency p50 | ρ vs baseline |"
    )
    print("| --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for model in models:
        scores = per_model_scores[model]
        n = len(scores)
        mean = round(statistics.mean(scores), 1) if scores else 0
        stdev = round(statistics.pstdev(scores), 1) if len(scores) > 1 else 0
        total_attempts = n + per_model_fail[model]
        cost_per_call = (
            per_model_cost[model] / total_attempts if total_attempts else 0.0
        )
        lat_p50 = (
            int(statistics.median(per_model_lat[model]))
            if per_model_lat[model]
            else 0
        )
        rho = _spearman(per_model_pairs[model])
        print(
            f"| {model} | {n} | {mean} | {stdev} | {per_model_fail[model]} "
            f"| ${per_model_cost[model]:.3f} | ${cost_per_call:.5f} "
            f"| {lat_p50}ms | {rho:.3f} |"
        )

    print(f"\nTotal spent so far: **${total_cost:.3f}**")

    # Per-band mean scores per model
    bands = ["top", "middle", "bottom"]
    print("\n## Mean fit_score by band (sanity: top>middle>bottom expected)\n")
    print("| Model | " + " | ".join(bands) + " |")
    print("| --- |" + " --- |" * len(bands))
    for model in models:
        row = f"| {model} |"
        for band in bands:
            vals = per_model_by_band[model][band]
            row += f" {round(statistics.mean(vals), 1) if vals else '—'} |"
        print(row)

    # Inter-model agreement: count cases where models cluster
    print("\n## Inter-model agreement on the same cases\n")
    # For cases with all 5 models reporting, compute the spread
    spreads: list[int] = []
    for case in cases:
        case_scores = {
            r["model"]: r.get("fit_score")
            for r in case.get("results") or []
            if r.get("schema_ok")
        }
        if len(case_scores) == len(models):
            vals = [s for s in case_scores.values() if isinstance(s, int)]
            if len(vals) == len(models):
                spreads.append(max(vals) - min(vals))
    if spreads:
        print(f"- Cases with all {len(models)} models reporting: **{len(spreads)}**")
        print(f"- Median per-case max-min spread: **{int(statistics.median(spreads))}**")
        print(f"- Mean spread: **{round(statistics.mean(spreads), 1)}**")
        print(f"- Cases with spread ≥30 (strong disagreement): "
              f"**{sum(1 for s in spreads if s >= 30)}**")
        print(f"- Cases with spread ≤10 (strong agreement): "
              f"**{sum(1 for s in spreads if s <= 10)}**")

    print()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", type=str, default=None)
    args = parser.parse_args()
    path = Path(args.file) if args.file else _latest_inflight()
    analyze(path)


if __name__ == "__main__":
    main()
