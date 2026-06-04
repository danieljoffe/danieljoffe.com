"""Multi-model judge ensemble for Phase 2 calibration.

Capability 1 from plan-wyrdfold-openrouter-investigation.md.

Runs the same Phase 2 grading prompt (literally the one
``app/services/fit/job_fit.py`` ships to production) against N models
over the existing eval_set fixture. The goal is calibration: do
different models agree on the four-axis scores for the same (target,
job) pairs? Where they disagree, what does that tell us about model
bias?

The output is a markdown report + raw JSON suitable for re-analysis.

Usage:
    cd apps/wyrdfold-api
    zsh -c 'source ~/.zshrc && uv run python scripts/multi_model_judge.py --cap 10'

Flags:
    --cap N             Limit the eval set to N cases (default: 20).
    --models a,b,c      Override the model list (slugs from MODELS dict).
    --target-id ID      Restrict to one target (one of three in fixture).
    --concurrency K     Parallel calls within one case (default: 5 — fire
                        all models for one case at once).
    --output PATH       Where to write the raw JSON + markdown report
                        (default: scripts/eval_results/multi_model_<ts>).

Cost guardrail: prints an estimate before firing. Bail if surprising.
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

from app.models.experience import OptimizedPayload  # noqa: E402
from app.models.targets import JobTarget  # noqa: E402
from app.services.fit.job_fit import _SYSTEM_PROMPT, _build_user_message  # noqa: E402
from scripts._openrouter import MODELS, call_model, get_api_key  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("multi_model_judge")

_FIXTURE_PATH = (
    Path(__file__).parent.parent / "tests" / "fixtures" / "eval_set.json"
)
_RESULTS_DIR = Path(__file__).parent / "eval_results"

# Per-model output ceilings. Sized to fit the actual JSON output of each
# model on the Phase 2 prompt (measured empirically in the smoke +
# initial 3-case runs). OpenRouter reserves max_tokens × output_price
# against account balance up-front, so picking these tight keeps the
# reservation footprint small.
_MAX_TOKENS_PER_MODEL: dict[str, int] = {
    "sonnet-4.6": 1024,
    "sonnet-4.5": 1024,
    "gpt-5.1": 1024,
    "gemini-2.5-pro": 2560,  # observed ~1200-1500 completion tokens
    "deepseek-v3.2": 1024,
}


# ---- Loading -------------------------------------------------------------


def _load_fixture() -> dict[str, Any]:
    if not _FIXTURE_PATH.exists():
        raise RuntimeError(
            f"Eval set fixture missing: {_FIXTURE_PATH}\n"
            f"Run scripts/eval_grading_prompts.py --snapshot first."
        )
    return cast(dict[str, Any], json.loads(_FIXTURE_PATH.read_text()))


def _rehydrate(
    fixture: dict[str, Any],
) -> tuple[dict[str, JobTarget], dict[str, OptimizedPayload]]:
    """Pull targets + payloads out of the fixture into typed objects."""
    targets: dict[str, JobTarget] = {}
    payloads: dict[str, OptimizedPayload] = {}
    for tid, meta in fixture["targets"].items():
        targets[tid] = JobTarget.model_validate(meta["target"])
        payloads[tid] = OptimizedPayload.model_validate(meta["payload"])
    return targets, payloads


# ---- Grading -------------------------------------------------------------


async def _grade_one_model(
    *,
    case: dict[str, Any],
    user_message: str,
    model_short: str,
    model_slug: str,
    api_key: str,
) -> dict[str, Any]:
    """One call. Returns a result dict shaped for the report."""
    # Per-model max_tokens: Gemini 2.5 Pro emits 1200+ completion tokens
    # on this prompt (verbose preamble before the JSON); Sonnet / GPT /
    # DeepSeek stay under 500. We pay-as-we-go on actual usage but
    # OpenRouter reserves max_tokens × output_price upfront against the
    # account balance — so giving every call a 2048 ceiling burns
    # reservation capacity unnecessarily.
    max_tokens = _MAX_TOKENS_PER_MODEL.get(model_short, 1024)
    result = await call_model(
        model_slug=model_slug,
        system=_SYSTEM_PROMPT,
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
                # Coerce floats / strings to int defensively.
                axes = {
                    k: int(v)
                    for k, v in ax.items()
                    if isinstance(v, int | float)
                }
        except Exception:  # noqa: BLE001
            pass

    return {
        "model": model_short,
        "model_slug": model_slug,
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


async def _grade_one_case(
    case: dict[str, Any],
    *,
    target: JobTarget,
    payload: OptimizedPayload,
    models: dict[str, str],
    api_key: str,
    concurrency: int,
) -> dict[str, Any]:
    """Fire all models for one case in parallel (subject to concurrency)."""
    user_message = _build_user_message(
        payload=payload,
        target=target,
        job_title=case.get("title", ""),
        jd_text=case.get("jd_text", ""),
    )

    sem = asyncio.Semaphore(max(1, concurrency))

    async def _bounded(short: str, slug: str) -> dict[str, Any]:
        async with sem:
            return await _grade_one_model(
                case=case,
                user_message=user_message,
                model_short=short,
                model_slug=slug,
                api_key=api_key,
            )

    per_model = await asyncio.gather(
        *(_bounded(short, slug) for short, slug in models.items())
    )
    return {
        "case_meta": {
            "job_posting_id": case.get("job_posting_id"),
            "target_id": case.get("target_id"),
            "title": case.get("title"),
            "band": case.get("band"),
            "baseline_score": case.get("baseline_score"),
            "baseline_axes": case.get("baseline_axes"),
        },
        "results": per_model,
    }


# ---- Report --------------------------------------------------------------


def _per_model_stats(
    per_case: list[dict[str, Any]], models: dict[str, str]
) -> dict[str, dict[str, Any]]:
    """Mean / stdev / cost / latency / failure rate per model."""
    stats: dict[str, dict[str, Any]] = {}
    for short in models:
        scores: list[int] = []
        costs: list[float] = []
        latencies: list[int] = []
        failures = 0
        for case in per_case:
            r = next(
                (x for x in case["results"] if x["model"] == short), None
            )
            if r is None:
                continue
            if r["schema_ok"] and r["fit_score"] is not None:
                scores.append(r["fit_score"])
            else:
                failures += 1
            costs.append(r["cost_usd"])
            latencies.append(r["latency_ms"])
        n = max(1, len(scores))
        mean = sum(scores) / n if scores else 0.0
        var = sum((s - mean) ** 2 for s in scores) / n if scores else 0.0
        stats[short] = {
            "n": len(scores),
            "failures": failures,
            "mean_score": round(mean, 1),
            "stdev_score": round(var**0.5, 1),
            "total_cost_usd": round(sum(costs), 5),
            "avg_latency_ms": int(sum(latencies) / max(1, len(latencies))),
        }
    return stats


def _per_case_disagreement(
    per_case: list[dict[str, Any]], models: dict[str, str]
) -> list[dict[str, Any]]:
    """Per-case max-min spread on fit_score across models. The big
    spreads are the calibration edge cases worth eyeballing."""
    rows: list[dict[str, Any]] = []
    for case in per_case:
        scores: dict[str, int] = {}
        for r in case["results"]:
            if r["schema_ok"] and r["fit_score"] is not None:
                scores[r["model"]] = r["fit_score"]
        if len(scores) < 2:
            continue
        spread = max(scores.values()) - min(scores.values())
        rows.append({
            "title": case["case_meta"]["title"][:80],
            "band": case["case_meta"]["band"],
            "baseline": case["case_meta"]["baseline_score"],
            "scores": scores,
            "spread": spread,
        })
    rows.sort(key=lambda r: -r["spread"])
    return rows


def _baseline_correlation(
    per_case: list[dict[str, Any]], models: dict[str, str]
) -> dict[str, float]:
    """Spearman ρ between each model's fit_score and the production
    baseline (Sonnet-4.6-as-of-fixture-capture). Quick "how close to
    today's production behaviour" sanity check."""
    out: dict[str, float] = {}
    for short in models:
        pairs: list[tuple[int, int]] = []
        for case in per_case:
            base = case["case_meta"].get("baseline_score")
            r = next(
                (x for x in case["results"] if x["model"] == short), None
            )
            if base is None or r is None or r["fit_score"] is None:
                continue
            pairs.append((int(base), r["fit_score"]))
        out[short] = _spearman(pairs)
    return out


def _spearman(pairs: list[tuple[int, int]]) -> float:
    """Tiny Spearman ρ. Returns 0.0 if too few pairs to be meaningful."""
    n = len(pairs)
    if n < 3:
        return 0.0

    def _ranks(values: list[float]) -> list[float]:
        sorted_idx = sorted(range(n), key=lambda i: values[i])
        ranks = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j + 1 < n and values[sorted_idx[j + 1]] == values[sorted_idx[i]]:
                j += 1
            avg = (i + j) / 2 + 1  # 1-based ranks averaged for ties
            for k in range(i, j + 1):
                ranks[sorted_idx[k]] = avg
            i = j + 1
        return ranks

    rx = _ranks([float(a) for a, _ in pairs])
    ry = _ranks([float(b) for _, b in pairs])
    mx = sum(rx) / n
    my = sum(ry) / n
    num = sum((rx[i] - mx) * (ry[i] - my) for i in range(n))
    denx = (sum((rx[i] - mx) ** 2 for i in range(n))) ** 0.5
    deny = (sum((ry[i] - my) ** 2 for i in range(n))) ** 0.5
    if denx == 0 or deny == 0:
        return 0.0
    return round(num / (denx * deny), 3)


def _write_markdown_report(
    *,
    per_case: list[dict[str, Any]],
    models: dict[str, str],
    stats: dict[str, dict[str, Any]],
    correlations: dict[str, float],
    disagreement: list[dict[str, Any]],
    total_cost: float,
    path: Path,
) -> None:
    lines: list[str] = [
        "# Multi-Model Judge Eval Report",
        "",
        f"- Cases graded: **{len(per_case)}**",
        f"- Models: **{', '.join(models.keys())}**",
        f"- Total cost: **${total_cost:.4f}**",
        "",
        "## Per-model stats",
        "",
        "| Model | n | Mean | Stdev | Failures | Cost | Avg latency |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for short, s in stats.items():
        lines.append(
            f"| {short} | {s['n']} | {s['mean_score']} | {s['stdev_score']} "
            f"| {s['failures']} | ${s['total_cost_usd']:.5f} "
            f"| {s['avg_latency_ms']}ms |"
        )

    lines.extend([
        "",
        "## Correlation with baseline fit_score (Spearman ρ)",
        "",
        "Production baseline = Sonnet 4.6 grades captured in the fixture. "
        "High ρ = model's ranking aligns with production. Low ρ = model "
        "scores the same cases differently than today's pipeline does — "
        "not necessarily worse, just a different shape.",
        "",
    ])
    for short, rho in sorted(correlations.items(), key=lambda kv: -kv[1]):
        lines.append(f"- **{short}**: ρ = {rho:.3f}")

    lines.extend([
        "",
        "## Highest-disagreement cases (top 10)",
        "",
        "These are the cases where models diverge most on the overall "
        "fit_score. They're the calibration edge cases — worth eyeballing "
        "to understand which models are over- or under-scoring.",
        "",
        "| Spread | Band | Baseline | Title |"
        + "".join(f" {m} |" for m in models),
        "| --- | --- | --- | --- |"
        + "".join(" --- |" for _ in models),
    ])
    for row in disagreement[:10]:
        per_model_cells = "".join(
            f" {row['scores'].get(m, '—')} |" for m in models
        )
        lines.append(
            f"| {row['spread']} | {row['band']} | {row['baseline']} "
            f"| {row['title']} |{per_model_cells}"
        )

    lines.extend([
        "",
        "## Cost per call (mean)",
        "",
        "| Model | Cost / call |",
        "| --- | --- |",
    ])
    for short, s in stats.items():
        per_call = s["total_cost_usd"] / max(1, s["n"] + s["failures"])
        lines.append(f"| {short} | ${per_call:.5f} |")

    lines.append("")
    path.write_text("\n".join(lines))


# ---- Main ----------------------------------------------------------------


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cap", type=int, default=20, help="Max cases")
    parser.add_argument(
        "--skip-first",
        type=int,
        default=0,
        help=(
            "Skip the first N fixture cases — used to resume a partial "
            "run with a different model subset (e.g. drop a slow model)."
        ),
    )
    parser.add_argument(
        "--models",
        type=str,
        default=",".join(MODELS.keys()),
        help="Comma-separated short names; default: all from MODELS dict.",
    )
    parser.add_argument("--target-id", type=str, default=None)
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument("--output", type=str, default=None)
    parser.add_argument(
        "--est-only",
        action="store_true",
        help="Print cost estimate + bail. Don't spend any tokens.",
    )
    args = parser.parse_args()

    requested = [m.strip() for m in args.models.split(",") if m.strip()]
    bad = [m for m in requested if m not in MODELS]
    if bad:
        logger.error("Unknown models: %s. Known: %s", bad, list(MODELS))
        return 2
    models = {m: MODELS[m] for m in requested}

    fixture = _load_fixture()
    cases = fixture["cases"]
    if args.target_id:
        cases = [c for c in cases if c["target_id"] == args.target_id]
    if args.skip_first:
        cases = cases[args.skip_first :]
    if args.cap and len(cases) > args.cap:
        cases = cases[: args.cap]

    n_calls = len(cases) * len(models)
    # Very rough: Sonnet-grade Phase 2 call is ~$0.003 with caching off.
    # Some models cheaper (DeepSeek 20× less), some same. Estimate high.
    rough_cost = n_calls * 0.003
    logger.info(
        "About to grade %d cases × %d models = %d calls. "
        "Rough cost ceiling: ~$%.2f.",
        len(cases),
        len(models),
        n_calls,
        rough_cost,
    )
    if args.est_only:
        return 0

    api_key = get_api_key()
    targets, payloads = _rehydrate(fixture)

    # Write incrementally so a mid-run failure (rate limit, credit
    # exhaustion, network) doesn't lose the cases that already cost
    # money. The final report at the end overwrites this file.
    _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y%m%d-%H%M%S")
    base = Path(args.output) if args.output else _RESULTS_DIR / f"multi_model_{ts}"
    inflight_path = base.with_suffix(".inflight.json")

    start = time.perf_counter()
    per_case: list[dict[str, Any]] = []
    for i, case in enumerate(cases, start=1):
        target = targets.get(case["target_id"])
        payload = payloads.get(case["target_id"])
        if target is None or payload is None:
            logger.warning(
                "Skipping case %s — target/payload missing", case.get("title")
            )
            continue
        graded = await _grade_one_case(
            case,
            target=target,
            payload=payload,
            models=models,
            api_key=api_key,
            concurrency=args.concurrency,
        )
        per_case.append(graded)
        logger.info(
            "  [%d/%d] %s  band=%s  base=%s  scores=%s",
            i,
            len(cases),
            (case.get("title") or "")[:50],
            case.get("band"),
            case.get("baseline_score"),
            {r["model"]: r["fit_score"] for r in graded["results"]},
        )
        # Incremental snapshot — wins back the in-flight cases if the
        # next call 402s out.
        inflight_path.write_text(
            json.dumps(
                {
                    "models": models,
                    "cases_so_far": per_case,
                    "completed": i,
                    "total": len(cases),
                },
                indent=2,
            )
        )

    elapsed = int(time.perf_counter() - start)
    total_cost = sum(
        r["cost_usd"] for case in per_case for r in case["results"]
    )
    stats = _per_model_stats(per_case, models)
    correlations = _baseline_correlation(per_case, models)
    disagreement = _per_case_disagreement(per_case, models)

    json_path = base.with_suffix(".json")
    md_path = base.with_suffix(".md")
    json_path.write_text(
        json.dumps(
            {
                "models": models,
                "cases": per_case,
                "stats": stats,
                "correlations": correlations,
                "disagreement": disagreement,
                "total_cost_usd": total_cost,
                "elapsed_seconds": elapsed,
                "captured_at_unix": int(time.time()),
            },
            indent=2,
        )
    )
    _write_markdown_report(
        per_case=per_case,
        models=models,
        stats=stats,
        correlations=correlations,
        disagreement=disagreement,
        total_cost=total_cost,
        path=md_path,
    )
    # Tidy up the inflight file now that the final reports are written.
    if inflight_path.exists():
        inflight_path.unlink()
    logger.info(
        "\nDone in %ds. Total cost: $%.4f. Raw: %s  Report: %s",
        elapsed,
        total_cost,
        json_path,
        md_path,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
