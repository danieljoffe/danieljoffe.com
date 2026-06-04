"""Eval 1: DeepSeek V3.2 vs Haiku 4.5 on Phase 1 title triage.

Plan reference: ``.claude/docs/plan-wyrdfold-multi-model-eval-coverage.md``
section "Eval 1 — Phase 1 title triage".

Question: can DeepSeek V3.2 (~10× cheaper than Haiku 4.5) match Haiku's
binary PROMISING/UNPROMISING decision well enough to be the production
Phase 1 model?

Approach
--------
- Pull titles from the existing eval_set.json fixture (89 (target, title)
  pairs spread across 3 active targets — plenty for a binary decision
  sanity check; an additional prod-DB-backed expansion to 200 lives in
  audit_phase1_fn.py and is out of scope here).
- Send each (target, title) batch through THREE models via OpenRouter:
    - haiku-4.5  (current production baseline — also the reference label)
    - sonnet-4.6 (quality ceiling, sanity check)
    - deepseek-v3.2 (candidate replacement)
- Each model gets the LITERAL Phase 1 prompt from
  ``app/services/relevance/title_triage.py::_SYSTEM_PROMPT`` and the
  same per-target user message format.
- Compute binary agreement + confusion matrix vs Haiku as the reference.

Acceptance thresholds (from the plan)
- DeepSeek ≥ 95% agreement with Haiku.
- DeepSeek false-positive rate ≤ 7% (DeepSeek says promising where Haiku
  said not). False-positives are cheap because Phase 2 catches noise;
  false-negatives are unrecoverable.

Cost expectation: ~$0.05 — DeepSeek is ~$0.30/1M output, titles are
short, Haiku is comparable, Sonnet bumps the bill by maybe $0.02.

Usage::

    cd apps/wyrdfold-api
    zsh -c 'source ~/.zshrc && uv run python scripts/eval_phase1_triage.py'
    zsh -c 'source ~/.zshrc && uv run python scripts/eval_phase1_triage.py --batch-size 25'
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, cast

# Make scripts._openrouter importable.
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.targets import JobTarget
from app.services.relevance.title_triage import (
    _SYSTEM_PROMPT,
    _build_user_message,
)
from scripts._openrouter import MODELS, call_model, get_api_key

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("eval_phase1_triage")

_FIXTURE_PATH = (
    Path(__file__).parent.parent / "tests" / "fixtures" / "eval_set.json"
)
_RESULTS_DIR = Path(__file__).parent / "eval_results"

# The three slugs we want — overrideable via --models if needed.
_DEFAULT_MODELS: dict[str, str] = {
    "haiku-4.5": "anthropic/claude-haiku-4.5",
    "sonnet-4.6": MODELS["sonnet-4.6"],
    "deepseek-v3.2": MODELS["deepseek-v3.2"],
}

# Phase 1 emits one TitleVerdict per id. Output for a 25-title batch is
# ~25 × 30 tokens = 750 tokens plus envelope, well under 2K.
_MAX_OUTPUT_TOKENS = 2048

# Conservative concurrency: one call per (model, target) batch in
# parallel is plenty. OpenRouter rate limits are generous but DeepSeek
# can be slow under load.
_DEFAULT_CONCURRENCY = 6


def _load_fixture() -> dict[str, Any]:
    if not _FIXTURE_PATH.exists():
        raise RuntimeError(
            f"Eval fixture missing: {_FIXTURE_PATH}\n"
            f"Run scripts/eval_grading_prompts.py --snapshot first."
        )
    return cast(dict[str, Any], json.loads(_FIXTURE_PATH.read_text()))


def _rehydrate_targets(fixture: dict[str, Any]) -> dict[str, JobTarget]:
    out: dict[str, JobTarget] = {}
    for tid, meta in fixture["targets"].items():
        out[tid] = JobTarget.model_validate(meta["target"])
    return out


def _titles_by_target(fixture: dict[str, Any]) -> dict[str, list[str]]:
    """Group fixture cases by target_id, preserving original order so the
    batch indices are stable across model runs."""
    groups: dict[str, list[str]] = defaultdict(list)
    for case in fixture["cases"]:
        tid = case["target_id"]
        title = case.get("title") or ""
        if title:
            groups[tid].append(title)
    return dict(groups)


def _chunk(seq: list[str], size: int) -> list[list[str]]:
    return [seq[i : i + size] for i in range(0, len(seq), size)]


def _parse_verdicts(raw: dict[str, Any] | None) -> dict[int, bool]:
    """Pull the {id: promising} map out of a model response.

    Defensive: some models wrap verdicts under different keys, some skip
    ids, some emit non-int ids. Return only the well-formed entries so
    downstream agreement math is honest about what each model actually
    answered.
    """
    if not raw or not isinstance(raw, dict):
        return {}
    verdicts = raw.get("verdicts")
    if not isinstance(verdicts, list):
        # Some models flatten — try the top-level shape.
        return {}
    out: dict[int, bool] = {}
    for v in verdicts:
        if not isinstance(v, dict):
            continue
        try:
            vid = int(v.get("id"))
        except (TypeError, ValueError):
            continue
        prom = v.get("promising")
        if isinstance(prom, bool):
            out[vid] = prom
    return out


async def _grade_one_batch(
    *,
    target: JobTarget,
    titles: list[str],
    model_short: str,
    model_slug: str,
    api_key: str,
) -> dict[str, Any]:
    user_message = _build_user_message(target, titles)
    result = await call_model(
        model_slug=model_slug,
        system=_SYSTEM_PROMPT,
        user=user_message,
        api_key=api_key,
        max_tokens=_MAX_OUTPUT_TOKENS,
    )
    verdicts = _parse_verdicts(result.parsed)
    return {
        "model": model_short,
        "model_slug": model_slug,
        "target_id": target.id,
        "n_titles": len(titles),
        "n_verdicts": len(verdicts),
        "verdicts": verdicts,  # int -> bool, 1-based ids
        "raw_content_preview": result.raw_content[:200],
        "latency_ms": result.latency_ms,
        "cost_usd": result.cost_usd,
        "usage": result.usage,
        "error": result.error,
    }


async def _run_evaluation(
    *,
    targets: dict[str, JobTarget],
    titles_by_target: dict[str, list[str]],
    models: dict[str, str],
    batch_size: int,
    concurrency: int,
    api_key: str,
    inflight_path: Path,
) -> dict[str, Any]:
    # Plan: one job = (model, target, batch_chunk_index). Fire all jobs
    # with bounded concurrency; one call failing doesn't take down the
    # rest. We persist after each completed job so a network drop loses
    # at most one call's worth of data.
    sem = asyncio.Semaphore(concurrency)
    jobs: list[tuple[str, str, JobTarget, int, list[str]]] = []
    for tid, titles in titles_by_target.items():
        target = targets[tid]
        for chunk_idx, chunk in enumerate(_chunk(titles, batch_size)):
            for short, slug in models.items():
                jobs.append((short, slug, target, chunk_idx, chunk))

    total = len(jobs)
    logger.info("Total scheduled calls: %d", total)

    results: list[dict[str, Any]] = []

    async def _bounded(job: tuple[str, str, JobTarget, int, list[str]]) -> dict[str, Any]:
        short, slug, target, chunk_idx, chunk = job
        async with sem:
            out = await _grade_one_batch(
                target=target,
                titles=chunk,
                model_short=short,
                model_slug=slug,
                api_key=api_key,
            )
            out["chunk_idx"] = chunk_idx
            return out

    pending = {asyncio.create_task(_bounded(j)) for j in jobs}
    completed = 0
    while pending:
        done, pending = await asyncio.wait(
            pending, return_when=asyncio.FIRST_COMPLETED
        )
        for t in done:
            results.append(t.result())
            completed += 1
            # Inflight snapshot — network can die any time.
            inflight_path.write_text(
                json.dumps(
                    {
                        "completed": completed,
                        "total": total,
                        "models": models,
                        "captured_at_unix": int(time.time()),
                        "results_so_far": results,
                    },
                    indent=2,
                )
            )
            if completed % max(1, total // 10) == 0 or completed == total:
                logger.info(
                    "Progress: %d/%d (%d%%)",
                    completed,
                    total,
                    100 * completed // total,
                )

    return {"results": results, "models": models}


def _agreement_report(
    results: list[dict[str, Any]],
    titles_by_target: dict[str, list[str]],
    models: dict[str, str],
    *,
    reference: str = "haiku-4.5",
) -> dict[str, Any]:
    """Compute per-model binary agreement with the reference model
    (Haiku), aggregated over every (target, title) the reference graded.

    Also returns confusion matrix entries so the FPR / FNR thresholds
    in the plan can be checked directly.
    """
    # Build per-(model, target_id, chunk_idx) verdict dict for easy joining.
    by_key: dict[tuple[str, str, int], dict[int, bool]] = {}
    by_model_cost: dict[str, float] = defaultdict(float)
    by_model_latency: dict[str, list[int]] = defaultdict(list)
    by_model_errors: dict[str, int] = defaultdict(int)
    for r in results:
        key = (r["model"], r["target_id"], r["chunk_idx"])
        by_key[key] = r["verdicts"] or {}
        by_model_cost[r["model"]] += r.get("cost_usd", 0.0)
        by_model_latency[r["model"]].append(r.get("latency_ms", 0))
        if r.get("error"):
            by_model_errors[r["model"]] += 1

    chunk_keys = sorted({(tid, ci) for (_, tid, ci) in by_key})

    per_model: dict[str, dict[str, Any]] = {}
    for model in models:
        if model == reference:
            continue
        tp = fp = tn = fn = total_compared = 0
        missing_in_model = 0
        missing_in_ref = 0
        for tid, ci in chunk_keys:
            ref_v = by_key.get((reference, tid, ci), {})
            mod_v = by_key.get((model, tid, ci), {})
            # Compare verdicts only on ids where BOTH model emitted a bool.
            for vid, ref_prom in ref_v.items():
                if vid not in mod_v:
                    missing_in_model += 1
                    continue
                mod_prom = mod_v[vid]
                total_compared += 1
                if ref_prom and mod_prom:
                    tp += 1
                elif ref_prom and not mod_prom:
                    fn += 1
                elif (not ref_prom) and mod_prom:
                    fp += 1
                else:
                    tn += 1
            for vid in mod_v:
                if vid not in ref_v:
                    missing_in_ref += 1
        n = max(1, total_compared)
        per_model[model] = {
            "compared": total_compared,
            "agreement_rate": round((tp + tn) / n, 4),
            "false_positive_rate": round(fp / max(1, fp + tn), 4),
            "false_negative_rate": round(fn / max(1, fn + tp), 4),
            "confusion": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
            "missing_verdicts_in_model": missing_in_model,
            "missing_verdicts_in_ref": missing_in_ref,
            "total_cost_usd": round(by_model_cost[model], 5),
            "avg_latency_ms": int(
                sum(by_model_latency[model])
                / max(1, len(by_model_latency[model]))
            ),
            "errored_batches": by_model_errors[model],
        }

    # Also surface reference cost so the writeup can quote it.
    per_model[reference] = {
        "total_cost_usd": round(by_model_cost[reference], 5),
        "avg_latency_ms": int(
            sum(by_model_latency[reference])
            / max(1, len(by_model_latency[reference]))
        ),
        "errored_batches": by_model_errors[reference],
    }

    # Per-target breakdown so disagreements can be traced to a target.
    per_target_agreement: dict[str, dict[str, float]] = {}
    for tid in titles_by_target:
        per_target_agreement[tid] = {}
        for model in models:
            if model == reference:
                continue
            agree = total = 0
            for ci in {ci for (_, t, ci) in by_key if t == tid}:
                ref_v = by_key.get((reference, tid, ci), {})
                mod_v = by_key.get((model, tid, ci), {})
                for vid, ref_prom in ref_v.items():
                    if vid in mod_v:
                        total += 1
                        if mod_v[vid] == ref_prom:
                            agree += 1
            per_target_agreement[tid][model] = (
                round(agree / total, 4) if total else 0.0
            )

    return {
        "reference_model": reference,
        "per_model": per_model,
        "per_target_agreement": per_target_agreement,
    }


def _write_report(
    *,
    final: dict[str, Any],
    report: dict[str, Any],
    titles_by_target: dict[str, list[str]],
    targets: dict[str, JobTarget],
    output_base: Path,
) -> None:
    output_base.parent.mkdir(parents=True, exist_ok=True)
    raw_path = output_base.with_suffix(".json")
    md_path = output_base.with_suffix(".md")

    raw_path.write_text(
        json.dumps(
            {
                "captured_at_unix": int(time.time()),
                "models": final["models"],
                "report": report,
                "results": final["results"],
            },
            indent=2,
        )
    )

    # Build the markdown writeup.
    ref = report["reference_model"]
    md: list[str] = []
    md.append("# Phase 1 Title Triage — Multi-Model Run")
    md.append("")
    md.append(f"- Reference model: **{ref}** (production baseline)")
    n_titles = sum(len(v) for v in titles_by_target.values())
    md.append(f"- Titles graded: **{n_titles}** across {len(titles_by_target)} targets")
    md.append("")

    md.append("## Per-model summary")
    md.append("")
    md.append(
        "| Model | Agreement vs ref | FPR | FNR | Compared | $ total | "
        "Avg latency | Errors |"
    )
    md.append("| --- | --- | --- | --- | --- | --- | --- | --- |")
    for model, stats in report["per_model"].items():
        if model == ref:
            md.append(
                f"| {model} (ref) | — | — | — | — | "
                f"${stats['total_cost_usd']:.4f} | "
                f"{stats['avg_latency_ms']}ms | {stats['errored_batches']} |"
            )
        else:
            md.append(
                f"| {model} | {stats['agreement_rate'] * 100:.1f}% | "
                f"{stats['false_positive_rate'] * 100:.1f}% | "
                f"{stats['false_negative_rate'] * 100:.1f}% | "
                f"{stats['compared']} | ${stats['total_cost_usd']:.4f} | "
                f"{stats['avg_latency_ms']}ms | {stats['errored_batches']} |"
            )
    md.append("")
    md.append("## Per-target agreement")
    md.append("")
    md.append("| Target | " + " | ".join(
        m for m in final["models"] if m != ref
    ) + " |")
    md.append("| --- |" + " --- |" * (len(final["models"]) - 1))
    for tid, by_model in report["per_target_agreement"].items():
        label = targets[tid].label if tid in targets else tid
        cells = []
        for m in final["models"]:
            if m == ref:
                continue
            cells.append(f"{by_model.get(m, 0.0) * 100:.1f}%")
        md.append(f"| {label[:40]} | " + " | ".join(cells) + " |")
    md.append("")

    md_path.write_text("\n".join(md))
    logger.info("Wrote %s", raw_path)
    logger.info("Wrote %s", md_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--batch-size",
        type=int,
        default=25,
        help="Titles per LLM call (default 25; prod default is 250).",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=_DEFAULT_CONCURRENCY,
        help="Parallel OpenRouter calls.",
    )
    parser.add_argument(
        "--models",
        type=str,
        default=None,
        help="Comma-separated subset of {haiku-4.5,sonnet-4.6,deepseek-v3.2}.",
    )
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    fixture = _load_fixture()
    targets = _rehydrate_targets(fixture)
    titles_by_target = _titles_by_target(fixture)

    if args.models:
        wanted = {m.strip() for m in args.models.split(",") if m.strip()}
        models = {k: v for k, v in _DEFAULT_MODELS.items() if k in wanted}
        if not models:
            raise SystemExit(f"No matching models in --models={args.models!r}.")
    else:
        models = _DEFAULT_MODELS

    n_titles = sum(len(v) for v in titles_by_target.values())
    n_batches = sum(
        len(_chunk(v, args.batch_size)) for v in titles_by_target.values()
    )
    logger.info(
        "Fixture: %d titles across %d targets → %d batches × %d models = %d calls",
        n_titles,
        len(titles_by_target),
        n_batches,
        len(models),
        n_batches * len(models),
    )
    logger.info("Models: %s", ", ".join(f"{k}={v}" for k, v in models.items()))

    api_key = get_api_key()

    ts = time.strftime("%Y%m%dT%H%M%S")
    base = Path(args.output) if args.output else (
        _RESULTS_DIR / f"eval_phase1_triage_{ts}"
    )
    base.parent.mkdir(parents=True, exist_ok=True)
    inflight = base.with_suffix(".inflight.json")

    final = asyncio.run(
        _run_evaluation(
            targets=targets,
            titles_by_target=titles_by_target,
            models=models,
            batch_size=args.batch_size,
            concurrency=args.concurrency,
            api_key=api_key,
            inflight_path=inflight,
        )
    )

    report = _agreement_report(final["results"], titles_by_target, models)
    _write_report(
        final=final,
        report=report,
        titles_by_target=titles_by_target,
        targets=targets,
        output_base=base,
    )

    # Surface the headline number on stdout.
    deepseek = report["per_model"].get("deepseek-v3.2", {})
    if deepseek:
        logger.info(
            "DeepSeek vs Haiku: agreement=%.1f%%, FPR=%.1f%%, FNR=%.1f%%",
            deepseek.get("agreement_rate", 0) * 100,
            deepseek.get("false_positive_rate", 0) * 100,
            deepseek.get("false_negative_rate", 0) * 100,
        )


if __name__ == "__main__":
    main()
