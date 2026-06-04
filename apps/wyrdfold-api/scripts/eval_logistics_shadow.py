"""Eval 5: Phase 2 logistics-addendum shadow run.

Plan reference: ``.claude/docs/plan-wyrdfold-multi-model-eval-coverage.md``
section "Eval 5 — Phase 2 with logistics addendum".

Question: does appending the logistics JSON addendum to the Phase 2
system prompt shift the four-axis scores or the overall fit_score?

PR #818 landed the addendum behind a feature flag. Before flipping the
flag in prod we want Spearman ρ ≥ 0.9 between the addendum-on and
addendum-off scores per axis AND on the overall score. If any axis
drops below ρ 0.9, the addendum is shifting attention away from
scoring — re-prompt before flipping.

Approach
--------
- Reuse the 89-case eval_set fixture.
- Run Sonnet 4.6 twice per case: once with extract_logistics=False
  (current behaviour), once with True (post-flag-flip behaviour).
- Compute Spearman ρ between the two runs on:
    - axes.title_fit
    - axes.skills_fit
    - axes.seniority_fit
    - axes.domain_fit
    - fit_score (overall)

Acceptance threshold: ρ ≥ 0.9 on every axis AND overall.

Cost expectation: ~$2. 89 × 2 × ~$0.01 = ~$1.80.

Usage::

    cd apps/wyrdfold-api
    zsh -c 'source ~/.zshrc && uv run python scripts/eval_logistics_shadow.py'
    zsh -c 'source ~/.zshrc && uv run python scripts/eval_logistics_shadow.py --cap 20'
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
import time
from pathlib import Path
from typing import Any, cast

# Make scripts._openrouter importable.
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.experience import OptimizedPayload
from app.models.targets import JobTarget
from app.services.fit.job_fit import (
    _LOGISTICS_PROMPT_ADDENDUM,
    _SYSTEM_PROMPT,
    _build_user_message,
)
from scripts._openrouter import MODELS, call_model, get_api_key

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("eval_logistics_shadow")

_FIXTURE_PATH = (
    Path(__file__).parent.parent / "tests" / "fixtures" / "eval_set.json"
)
_RESULTS_DIR = Path(__file__).parent / "eval_results"

_MODEL_SHORT = "sonnet-4.6"
_MODEL_SLUG = MODELS["sonnet-4.6"]


def _load_fixture() -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(_FIXTURE_PATH.read_text()))


def _rehydrate(
    fixture: dict[str, Any],
) -> tuple[dict[str, JobTarget], dict[str, OptimizedPayload]]:
    targets: dict[str, JobTarget] = {}
    payloads: dict[str, OptimizedPayload] = {}
    for tid, meta in fixture["targets"].items():
        targets[tid] = JobTarget.model_validate(meta["target"])
        payloads[tid] = OptimizedPayload.model_validate(meta["payload"])
    return targets, payloads


async def _grade(
    *,
    case: dict[str, Any],
    target: JobTarget,
    payload: OptimizedPayload,
    extract_logistics: bool,
    api_key: str,
) -> dict[str, Any]:
    user_message = _build_user_message(
        payload=payload,
        target=target,
        job_title=case.get("title", ""),
        jd_text=case.get("jd_text", ""),
    )
    system_prompt = (
        _SYSTEM_PROMPT + _LOGISTICS_PROMPT_ADDENDUM
        if extract_logistics
        else _SYSTEM_PROMPT
    )
    # Match prod max_tokens: 1280 with logistics, 1024 without.
    max_tokens = 1280 if extract_logistics else 1024
    result = await call_model(
        model_slug=_MODEL_SLUG,
        system=system_prompt,
        user=user_message,
        api_key=api_key,
        max_tokens=max_tokens,
    )

    parsed = result.parsed
    fit_score: int | None = None
    axes: dict[str, int] | None = None
    if parsed and isinstance(parsed, dict):
        try:
            fs = parsed.get("fit_score")
            if isinstance(fs, int | float):
                fit_score = int(fs)
            ax = parsed.get("axes")
            if isinstance(ax, dict):
                axes = {
                    k: int(v)
                    for k, v in ax.items()
                    if isinstance(v, int | float)
                }
        except Exception:
            pass

    return {
        "job_posting_id": case.get("job_posting_id"),
        "target_id": case.get("target_id"),
        "extract_logistics": extract_logistics,
        "fit_score": fit_score,
        "axes": axes,
        "raw_content_preview": result.raw_content[:200],
        "parsed_ok": parsed is not None,
        "schema_ok": fit_score is not None and axes is not None,
        "latency_ms": result.latency_ms,
        "cost_usd": result.cost_usd,
        "usage": result.usage,
        "error": result.error,
    }


async def _run(
    *,
    cases: list[dict[str, Any]],
    targets: dict[str, JobTarget],
    payloads: dict[str, OptimizedPayload],
    api_key: str,
    inflight_path: Path,
    concurrency: int,
) -> list[dict[str, Any]]:
    sem = asyncio.Semaphore(concurrency)
    # One job = (case, flag). Each case generates two jobs.
    jobs: list[tuple[dict[str, Any], bool]] = []
    for case in cases:
        jobs.append((case, False))
        jobs.append((case, True))
    total = len(jobs)
    logger.info("Total scheduled calls: %d", total)

    async def _bounded(job: tuple[dict[str, Any], bool]) -> dict[str, Any]:
        case, flag = job
        tid = case["target_id"]
        async with sem:
            return await _grade(
                case=case,
                target=targets[tid],
                payload=payloads[tid],
                extract_logistics=flag,
                api_key=api_key,
            )

    results: list[dict[str, Any]] = []
    pending = {asyncio.create_task(_bounded(j)) for j in jobs}
    completed = 0
    while pending:
        done, pending = await asyncio.wait(
            pending, return_when=asyncio.FIRST_COMPLETED
        )
        for t in done:
            results.append(t.result())
            completed += 1
            inflight_path.write_text(
                json.dumps(
                    {
                        "completed": completed,
                        "total": total,
                        "captured_at_unix": int(time.time()),
                        "results_so_far": results,
                    },
                    indent=2,
                )
            )
            if completed % max(1, total // 20) == 0 or completed == total:
                logger.info("Progress: %d/%d", completed, total)
    return results


def _spearman(pairs: list[tuple[float, float]]) -> float:
    """Spearman ρ on a paired list. Ties get the average rank."""
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

    rx = _ranks([p[0] for p in pairs])
    ry = _ranks([p[1] for p in pairs])
    mx = sum(rx) / n
    my = sum(ry) / n
    num = sum((rx[i] - mx) * (ry[i] - my) for i in range(n))
    dx = sum((r - mx) ** 2 for r in rx) ** 0.5
    dy = sum((r - my) ** 2 for r in ry) ** 0.5
    return round(num / (dx * dy), 4) if dx and dy else 0.0


def _report(results: list[dict[str, Any]]) -> dict[str, Any]:
    # Group by (job_posting_id, target_id) and pair off vs flag.
    by_key: dict[tuple[str | None, str | None], dict[bool, dict[str, Any]]] = {}
    for r in results:
        key = (r["job_posting_id"], r["target_id"])
        by_key.setdefault(key, {})[r["extract_logistics"]] = r

    pairs_overall: list[tuple[float, float]] = []
    pairs_per_axis: dict[str, list[tuple[float, float]]] = {
        "title_fit": [],
        "skills_fit": [],
        "seniority_fit": [],
        "domain_fit": [],
    }
    paired = 0
    unpaired = 0
    for key, pair in by_key.items():
        off = pair.get(False)
        on = pair.get(True)
        if not off or not on or not off["schema_ok"] or not on["schema_ok"]:
            unpaired += 1
            continue
        paired += 1
        pairs_overall.append((float(off["fit_score"]), float(on["fit_score"])))
        for axis in pairs_per_axis:
            off_axes = off.get("axes") or {}
            on_axes = on.get("axes") or {}
            if axis in off_axes and axis in on_axes:
                pairs_per_axis[axis].append(
                    (float(off_axes[axis]), float(on_axes[axis]))
                )

    spearman_overall = _spearman(pairs_overall)
    spearman_per_axis = {a: _spearman(p) for a, p in pairs_per_axis.items()}

    # Per-flag aggregates.
    total_cost_off = sum(
        r.get("cost_usd", 0.0)
        for r in results
        if not r["extract_logistics"]
    )
    total_cost_on = sum(
        r.get("cost_usd", 0.0) for r in results if r["extract_logistics"]
    )

    return {
        "paired_cases": paired,
        "unpaired_cases": unpaired,
        "spearman_overall": spearman_overall,
        "spearman_per_axis": spearman_per_axis,
        "cost_logistics_off_usd": round(total_cost_off, 5),
        "cost_logistics_on_usd": round(total_cost_on, 5),
        "total_cost_usd": round(total_cost_off + total_cost_on, 5),
    }


def _write_report(
    *,
    results: list[dict[str, Any]],
    report: dict[str, Any],
    output_base: Path,
) -> None:
    output_base.parent.mkdir(parents=True, exist_ok=True)
    raw_path = output_base.with_suffix(".json")
    md_path = output_base.with_suffix(".md")

    raw_path.write_text(
        json.dumps(
            {
                "captured_at_unix": int(time.time()),
                "report": report,
                "results": results,
            },
            indent=2,
        )
    )

    md: list[str] = []
    md.append("# Phase 2 Logistics-Addendum Shadow Run")
    md.append("")
    md.append(f"- Model: **{_MODEL_SHORT}** ({_MODEL_SLUG})")
    md.append(f"- Paired cases: **{report['paired_cases']}**")
    md.append(f"- Unpaired (schema fail / missing): {report['unpaired_cases']}")
    md.append("")
    md.append("## Spearman ρ (logistics-off vs logistics-on)")
    md.append("")
    md.append("| Axis | ρ | Passes ≥0.9? |")
    md.append("| --- | --- | --- |")
    for axis, rho in report["spearman_per_axis"].items():
        md.append(
            f"| {axis} | {rho:.4f} | {'yes' if rho >= 0.9 else 'NO'} |"
        )
    rho_overall = report["spearman_overall"]
    md.append(
        f"| **fit_score (overall)** | **{rho_overall:.4f}** | "
        f"{'yes' if rho_overall >= 0.9 else 'NO'} |"
    )
    md.append("")
    md.append("## Cost")
    md.append("")
    md.append(f"- logistics OFF: ${report['cost_logistics_off_usd']:.4f}")
    md.append(f"- logistics ON:  ${report['cost_logistics_on_usd']:.4f}")
    md.append(f"- total:         ${report['total_cost_usd']:.4f}")
    md.append("")

    md_path.write_text("\n".join(md))
    logger.info("Wrote %s", raw_path)
    logger.info("Wrote %s", md_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cap", type=int, default=None)
    parser.add_argument("--concurrency", type=int, default=6)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    fixture = _load_fixture()
    targets, payloads = _rehydrate(fixture)
    cases = fixture["cases"]
    if args.cap:
        cases = cases[: args.cap]

    api_key = get_api_key()

    ts = time.strftime("%Y%m%dT%H%M%S")
    base = (
        Path(args.output)
        if args.output
        else (_RESULTS_DIR / f"eval_logistics_shadow_{ts}")
    )
    base.parent.mkdir(parents=True, exist_ok=True)
    inflight = base.with_suffix(".inflight.json")

    logger.info(
        "Running %d cases × 2 flags = %d calls (~$%.2f estimated)",
        len(cases),
        len(cases) * 2,
        len(cases) * 2 * 0.012,
    )

    results = asyncio.run(
        _run(
            cases=cases,
            targets=targets,
            payloads=payloads,
            api_key=api_key,
            inflight_path=inflight,
            concurrency=args.concurrency,
        )
    )
    report = _report(results)
    _write_report(results=results, report=report, output_base=base)

    logger.info(
        "Overall ρ=%.4f; per-axis: %s",
        report["spearman_overall"],
        report["spearman_per_axis"],
    )


if __name__ == "__main__":
    main()
