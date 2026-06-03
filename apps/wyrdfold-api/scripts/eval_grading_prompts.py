"""Prompt + model evaluation harness for Phase 2 grading.

Decoupled iteration loop for relevance tuning: pick a prompt variant
and/or a model, re-grade a fixed eval set, see how the new output
compares to the baseline (current production scores).

Two modes::

    # 1. One-time snapshot — captures the current production-graded
    #    state of a balanced eval set into a fixture file. Re-run
    #    whenever the eval set should be re-baselined (e.g. after a
    #    target's profile_version bumps).
    uv run python -m scripts.eval_grading_prompts --snapshot

    # 2. Re-grade — runs the saved eval set through the chosen prompt +
    #    model. Reports Spearman rank correlation, top-K overlap,
    #    per-axis MSE, score-distribution delta, and total LLM cost.
    uv run python -m scripts.eval_grading_prompts                          # baseline prompt, Sonnet
    uv run python -m scripts.eval_grading_prompts --model claude-haiku-4-5 # cheaper-tier A/B
    uv run python -m scripts.eval_grading_prompts \\
        --prompt-file ./prompts/scale-expansion.txt                       # prompt variant

The eval set is balanced per target: top 10 by current score + bottom 10
of promising + 10 from the middle band. Total ≈30 per target × 3 active
targets ≈ 90 cases; capped at 50 by ``--eval-size`` to keep any single
run cheap (~$0.18 Sonnet / ~$0.005 Haiku).

The harness DOES NOT modify any production scores. All LLM output is
in-memory only, compared against the baseline fixture, and the report
prints to stdout. Re-runs are idempotent.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import math
import random
import statistics
import time
from pathlib import Path
from typing import Any, cast

from app.config import settings
from app.models.experience import OptimizedPayload
from app.models.llm import Message, ModelId
from app.models.targets import JobTarget
from app.services.experience.optimized import get_latest as get_latest_optimized
from app.services.fit.job_fit import (
    _SYSTEM_PROMPT as BASELINE_SYSTEM_PROMPT,
)
from app.services.fit.job_fit import (
    JOB_FIT_PURPOSE,
    JobFitResult,
    _build_user_message,
)
from app.services.llm import get_default_client as get_llm
from app.services.llm.client import complete_json
from app.services.scoring import strip_html
from app.services.targets.crud import get_active as get_active_targets
from app.supabase_pool import get_supabase_pool, init_supabase

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("eval_prompts")

_EVAL_FIXTURE = (
    Path(__file__).parent.parent / "tests" / "fixtures" / "eval_set.json"
)
_DEFAULT_EVAL_SIZE = 50
_PER_TARGET_BAND_SIZE = 10  # top / bottom / middle
_TOP_K = 10  # for top-K overlap metric
_JD_CONTEXT_CAP = 2000  # mirrors fit/job_fit.py
_DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"

# ---- Eval set construction ----------------------------------------------


def _band_query(sb: Any, target_id: str, n: int, order_desc: bool) -> list[dict[str, Any]]:
    """Top-N (desc=True) or bottom-N (desc=False) of complete + promising
    rows for the target. Used twice for top/bottom bands."""
    resp = (
        sb.table("scores")
        .select(
            "job_posting_id, score, axis_scores, fit_reasoning, scored_profile_version"
        )
        .eq("target_id", target_id)
        .eq("scoring_status", "complete")
        .eq("promising", True)
        .not_.is_("axis_scores", "null")
        .order("score", desc=order_desc)
        .limit(n)
        .execute()
    )
    return cast(list[dict[str, Any]], resp.data or [])


def _middle_band(
    sb: Any, target_id: str, n: int, rng: random.Random
) -> list[dict[str, Any]]:
    """Random N from the 30-70 middle band."""
    resp = (
        sb.table("scores")
        .select(
            "job_posting_id, score, axis_scores, fit_reasoning, scored_profile_version"
        )
        .eq("target_id", target_id)
        .eq("scoring_status", "complete")
        .eq("promising", True)
        .not_.is_("axis_scores", "null")
        .gte("score", 30)
        .lte("score", 70)
        .limit(200)  # pool to sample from
        .execute()
    )
    pool = cast(list[dict[str, Any]], resp.data or [])
    rng.shuffle(pool)
    return pool[:n]


def _hydrate_jobs(
    sb: Any, job_ids: list[str]
) -> dict[str, tuple[str, str]]:
    """Returns ``{job_id: (title, jd_text_first_2000)}``."""
    out: dict[str, tuple[str, str]] = {}
    if not job_ids:
        return out
    for i in range(0, len(job_ids), 500):
        chunk = job_ids[i : i + 500]
        resp = (
            sb.table("jobs")
            .select("id, title, description_html")
            .in_("id", chunk)
            .execute()
        )
        for r in cast(list[dict[str, Any]], resp.data or []):
            text = strip_html(r.get("description_html") or "")[:_JD_CONTEXT_CAP]
            out[r["id"]] = (r.get("title", ""), text)
    return out


def _resolve_user_payload(
    sb: Any, target_id: str
) -> tuple[str | None, OptimizedPayload | None]:
    """Find an active owner of the target + their latest optimized payload.

    Snapshot stores the payload inline (so re-grades are reproducible even
    if the user re-derives their profile later).
    """
    resp = (
        sb.table("user_targets")
        .select("user_id")
        .eq("target_id", target_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        return None, None
    uid = rows[0]["user_id"]
    doc = get_latest_optimized(sb, uid)
    return uid, (doc.payload if doc else None)


def build_eval_set(
    sb: Any, *, per_target_band_size: int, seed: int
) -> dict[str, Any]:
    """Pull a balanced eval set across all active targets. Returns the
    fixture dict ready to serialise."""
    rng = random.Random(seed)  # noqa: S311 — research sampling
    targets = get_active_targets(sb)
    cases: list[dict[str, Any]] = []
    target_payloads: dict[str, Any] = {}

    for t in targets:
        uid, payload = _resolve_user_payload(sb, t.id)
        if payload is None:
            logger.warning("  skipping target %s — no owner with payload", t.id[:8])
            continue
        target_payloads[t.id] = {
            "user_id": uid,
            "label": t.label,
            "profile_version": t.profile_version,
            "payload": payload.model_dump(),
            "target": t.model_dump(mode="json"),
        }

        top = _band_query(sb, t.id, per_target_band_size, order_desc=True)
        bot = _band_query(sb, t.id, per_target_band_size, order_desc=False)
        mid = _middle_band(sb, t.id, per_target_band_size, rng)
        # Dedupe by job_posting_id (a job might land in top AND middle
        # depending on its score; we want each row once).
        seen: set[str] = set()
        for src, band in (("top", top), ("bottom", bot), ("middle", mid)):
            for r in band:
                jid = r["job_posting_id"]
                if jid in seen:
                    continue
                seen.add(jid)
                cases.append({
                    "band": src,
                    "target_id": t.id,
                    "job_posting_id": jid,
                    "baseline_score": int(r["score"]),
                    "baseline_axes": r["axis_scores"],
                    "baseline_reasoning": r.get("fit_reasoning") or "",
                    "scored_profile_version": r.get("scored_profile_version"),
                })

    job_ids = [c["job_posting_id"] for c in cases]
    job_data = _hydrate_jobs(sb, job_ids)
    for c in cases:
        title, jd = job_data.get(c["job_posting_id"], ("", ""))
        c["title"] = title
        c["jd_text"] = jd

    return {
        "version": 1,
        "captured_at_unix": int(time.time()),
        "seed": seed,
        "targets": target_payloads,
        "cases": cases,
    }


def save_eval_set(eval_set: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(eval_set, indent=2, sort_keys=True))


def load_eval_set(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise RuntimeError(
            f"Eval set fixture missing: {path}\n"
            f"Run --snapshot first to generate it."
        )
    return cast(dict[str, Any], json.loads(path.read_text()))


# ---- Re-grading ----------------------------------------------------------


async def _grade_one(
    llm: Any,
    *,
    model: ModelId,
    system_prompt: str,
    payload: OptimizedPayload,
    target: JobTarget,
    title: str,
    jd_text: str,
) -> tuple[JobFitResult | None, int, int, float]:
    """Returns ``(fit_or_None, input_tokens, output_tokens, cost_usd)``."""
    user_message = _build_user_message(
        payload=payload, target=target, job_title=title, jd_text=jd_text
    )
    try:
        parsed, llm_result = await complete_json(
            llm,
            model=model,
            system=system_prompt,
            messages=[Message(role="user", content=user_message)],
            schema=JobFitResult,
            purpose=f"{JOB_FIT_PURPOSE}.eval",
            max_tokens=512,
            cache_system=True,
        )
    except Exception:
        logger.exception("Grade failed for %s", title[:50])
        return None, 0, 0, 0.0
    usage = llm_result.usage
    return (
        parsed,
        int(usage.input_tokens or 0),
        int(usage.output_tokens or 0),
        float(llm_result.cost_usd or 0.0),
    )


async def run_eval(
    eval_set: dict[str, Any],
    *,
    model: ModelId,
    system_prompt: str,
    target_filter: str | None,
    cap: int,
) -> list[dict[str, Any]]:
    """Re-grade each case. Returns list of result dicts aligned with cases."""
    cases = eval_set["cases"]
    if target_filter:
        cases = [c for c in cases if c["target_id"] == target_filter]
    if cap and len(cases) > cap:
        logger.info("Capping eval set %d -> %d", len(cases), cap)
        cases = cases[:cap]

    # Rehydrate each target's JobTarget + payload from the snapshot
    targets: dict[str, JobTarget] = {}
    payloads: dict[str, OptimizedPayload] = {}
    for tid, meta in eval_set["targets"].items():
        targets[tid] = JobTarget.model_validate(meta["target"])
        payloads[tid] = OptimizedPayload.model_validate(meta["payload"])

    llm = get_llm()
    results: list[dict[str, Any]] = []
    for i, case in enumerate(cases, start=1):
        if i % 10 == 0 or i == len(cases):
            logger.info("  graded %d / %d", i, len(cases))
        target = targets.get(case["target_id"])
        payload = payloads.get(case["target_id"])
        if target is None or payload is None:
            results.append({
                "case": case, "fit": None,
                "tok_in": 0, "tok_out": 0, "cost_usd": 0.0,
            })
            continue
        fit, tin, tout, cost = await _grade_one(
            llm,
            model=model,
            system_prompt=system_prompt,
            payload=payload,
            target=target,
            title=case["title"],
            jd_text=case["jd_text"],
        )
        results.append({
            "case": case, "fit": fit,
            "tok_in": tin, "tok_out": tout, "cost_usd": cost,
        })
    return results


# ---- Metrics -------------------------------------------------------------


def _rank(xs: list[float]) -> list[float]:
    """Average rank (handles ties); 1-indexed."""
    indexed = sorted(enumerate(xs), key=lambda p: p[1])
    ranks = [0.0] * len(xs)
    i = 0
    while i < len(indexed):
        j = i
        while j + 1 < len(indexed) and indexed[j + 1][1] == indexed[i][1]:
            j += 1
        avg = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[indexed[k][0]] = avg
        i = j + 1
    return ranks


def _pearson(xs: list[float], ys: list[float]) -> float:
    n = len(xs)
    if n < 2:
        return 0.0
    mx, my = sum(xs) / n, sum(ys) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys, strict=True))
    dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    dy = math.sqrt(sum((y - my) ** 2 for y in ys))
    return num / (dx * dy) if dx and dy else 0.0


def _spearman(xs: list[float], ys: list[float]) -> float:
    return _pearson(_rank(xs), _rank(ys))


def compute_metrics(
    results: list[dict[str, Any]], model: ModelId
) -> dict[str, Any]:
    paired = [r for r in results if r["fit"] is not None]
    if not paired:
        return {"n": 0, "n_failed": len(results)}

    baseline_scores = [float(r["case"]["baseline_score"]) for r in paired]
    new_scores = [float(r["fit"].fit_score) for r in paired]
    spearman = _spearman(baseline_scores, new_scores)
    pearson = _pearson(baseline_scores, new_scores)

    # Top-K overlap (using indices into ``paired`` for both rankings).
    def _top_k_set(scores: list[float], k: int) -> set[int]:
        sorted_idx = sorted(range(len(scores)), key=lambda i: -scores[i])
        return set(sorted_idx[: min(k, len(scores))])

    base_top = _top_k_set(baseline_scores, _TOP_K)
    new_top = _top_k_set(new_scores, _TOP_K)
    overlap = len(base_top & new_top)

    # Per-axis MSE.
    axes = ("title_fit", "skills_fit", "seniority_fit", "domain_fit")
    axis_mse: dict[str, float] = {}
    for a in axes:
        diffs: list[float] = []
        for r in paired:
            b = (r["case"]["baseline_axes"] or {}).get(a)
            n = getattr(r["fit"].axes, a, None)
            if isinstance(b, int) and isinstance(n, int):
                diffs.append(float(b - n) ** 2)
        axis_mse[a] = sum(diffs) / len(diffs) if diffs else 0.0

    # Cost — use the SDK's authoritative ``cost_usd`` (no rounding from a
    # locally-maintained pricing table). Tokens reported for sanity.
    tin = sum(r["tok_in"] for r in paired)
    tout = sum(r["tok_out"] for r in paired)
    cost_usd = sum(r["cost_usd"] for r in paired)

    # Score distribution shift.
    bm = statistics.mean(baseline_scores)
    nm = statistics.mean(new_scores)
    bsd = statistics.stdev(baseline_scores) if len(baseline_scores) > 1 else 0.0
    nsd = statistics.stdev(new_scores) if len(new_scores) > 1 else 0.0

    return {
        "n": len(paired),
        "n_failed": len(results) - len(paired),
        "spearman": spearman,
        "pearson": pearson,
        "top_k_overlap": overlap,
        "top_k": _TOP_K,
        "axis_mse": axis_mse,
        "axis_rmse": {a: math.sqrt(v) for a, v in axis_mse.items()},
        "baseline_mean": bm,
        "new_mean": nm,
        "baseline_stdev": bsd,
        "new_stdev": nsd,
        "baseline_max": max(baseline_scores),
        "new_max": max(new_scores),
        "tokens_in": tin,
        "tokens_out": tout,
        "cost_usd": cost_usd,
    }


def format_report(metrics: dict[str, Any], model: ModelId, prompt_label: str) -> str:
    if metrics["n"] == 0:
        return f"NO RESULTS (failed: {metrics['n_failed']})"
    lines = [
        "=" * 70,
        f"EVAL REPORT — model={model}  prompt={prompt_label}",
        "=" * 70,
        f"  n graded: {metrics['n']}  (failed: {metrics['n_failed']})",
        "",
        "  RANKING (baseline vs new)",
        f"    Spearman ρ: {metrics['spearman']:+.3f}  (1.00 = identical order)",
        f"    Pearson r:  {metrics['pearson']:+.3f}",
        f"    Top-{metrics['top_k']} overlap: {metrics['top_k_overlap']} / {metrics['top_k']}",
        "",
        "  SCORE DISTRIBUTION",
        f"    baseline:  mean={metrics['baseline_mean']:.1f}  "
        f"stdev={metrics['baseline_stdev']:.1f}  max={metrics['baseline_max']:.0f}",
        f"    new:       mean={metrics['new_mean']:.1f}  "
        f"stdev={metrics['new_stdev']:.1f}  max={metrics['new_max']:.0f}",
        f"    delta:     mean {metrics['new_mean'] - metrics['baseline_mean']:+.1f}  "
        f"max {metrics['new_max'] - metrics['baseline_max']:+.0f}",
        "",
        "  PER-AXIS RMSE (lower = closer to baseline)",
    ]
    for a, rmse in metrics["axis_rmse"].items():
        lines.append(f"    {a:<14} {rmse:>6.2f}")
    lines += [
        "",
        "  COST",
        f"    tokens: {metrics['tokens_in']:,} in + {metrics['tokens_out']:,} out",
        f"    total:  ${metrics['cost_usd']:.4f}",
        "=" * 70,
    ]
    return "\n".join(lines)


# ---- CLI -----------------------------------------------------------------


async def main_async(args: argparse.Namespace) -> None:
    init_supabase()
    sb = get_supabase_pool()
    if sb is None:
        raise RuntimeError("Supabase not configured — check .env")

    if args.snapshot:
        logger.info("Building eval set snapshot ...")
        eval_set = build_eval_set(
            sb, per_target_band_size=_PER_TARGET_BAND_SIZE, seed=args.seed
        )
        save_eval_set(eval_set, _EVAL_FIXTURE)
        logger.info(
            "Eval set saved: %s  (%d cases, %d targets)",
            _EVAL_FIXTURE,
            len(eval_set["cases"]),
            len(eval_set["targets"]),
        )
        # Show per-target breakdown so it's obvious what landed.
        by_target: dict[str, dict[str, int]] = {}
        for c in eval_set["cases"]:
            by_target.setdefault(c["target_id"], {}).setdefault(c["band"], 0)
            by_target[c["target_id"]][c["band"]] += 1
        for tid, bands in by_target.items():
            label = eval_set["targets"][tid]["label"]
            logger.info(
                "  %s: top=%d bottom=%d middle=%d",
                label,
                bands.get("top", 0),
                bands.get("bottom", 0),
                bands.get("middle", 0),
            )
        return

    eval_set = load_eval_set(_EVAL_FIXTURE)

    if args.prompt_file:
        # One-shot read at startup — script reads this once, not in any
        # tight async loop, so the pathlib call is harmless here.
        system_prompt = Path(args.prompt_file).read_text()  # noqa: ASYNC240
        prompt_label = Path(args.prompt_file).name
    else:
        system_prompt = BASELINE_SYSTEM_PROMPT
        prompt_label = "baseline"

    cases_for_target = [
        c for c in eval_set["cases"]
        if not args.target or c["target_id"] == args.target
    ]
    n_to_run = min(len(cases_for_target), args.eval_size)

    if args.dry_run:
        logger.info(
            "DRY RUN: would re-grade %d case(s) with model=%s, prompt=%s",
            n_to_run, args.model, prompt_label,
        )
        return

    if settings.llm_provider != "anthropic":
        raise RuntimeError(
            f"LLM_PROVIDER must be 'anthropic' for a real eval "
            f"(currently {settings.llm_provider!r}). Use --dry-run to test the flow."
        )

    logger.info(
        "Running eval: model=%s  prompt=%s  cases=%d",
        args.model, prompt_label, n_to_run,
    )
    results = await run_eval(
        eval_set,
        model=cast(ModelId, args.model),
        system_prompt=system_prompt,
        target_filter=args.target,
        cap=args.eval_size,
    )
    metrics = compute_metrics(results, cast(ModelId, args.model))
    print(format_report(metrics, cast(ModelId, args.model), prompt_label))


def main() -> None:
    parser = argparse.ArgumentParser(description="Eval Phase 2 prompts/models")
    parser.add_argument(
        "--snapshot",
        action="store_true",
        help="Rebuild the eval-set fixture from current production scores.",
    )
    parser.add_argument(
        "--model",
        default=_DEFAULT_MODEL,
        help="Anthropic model id (claude-haiku-4-5 / claude-sonnet-4-6 / claude-opus-4-7).",
    )
    parser.add_argument(
        "--prompt-file",
        default=None,
        help="Path to a text file containing the system prompt. Omit to use baseline.",
    )
    parser.add_argument(
        "--target",
        default=None,
        help="Restrict eval to a single target id.",
    )
    parser.add_argument(
        "--eval-size",
        type=int,
        default=_DEFAULT_EVAL_SIZE,
        help=f"Cap on number of cases to grade (default {_DEFAULT_EVAL_SIZE}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Plan the eval (no LLM calls).",
    )
    parser.add_argument(
        "--seed", type=int, default=42, help="RNG seed for middle-band sampling."
    )
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
