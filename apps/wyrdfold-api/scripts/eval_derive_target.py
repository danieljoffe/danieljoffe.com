"""Eval 4: Slim target derivation — Sonnet 4.6 vs Sonnet 4.5.

Plan reference: ``.claude/docs/plan-wyrdfold-multi-model-eval-coverage.md``
section "Eval 4 — Slim target derivation".

Question: does Sonnet 4.5 produce equivalently-good DerivedTarget shapes
(description / seniority_hint / domain_hints / search_keywords /
example titles) at the ~7% lower Sonnet-4.5 price?

This call site is the on-ramp for every new target (manual or onboarding
suggestion) — drift here propagates to every downstream Phase 1 + Phase 2
verdict that uses the target's keyword pools.

Approach
--------
- 10 canonical role labels spanning IC tech, eng leadership, ops
  leadership, data, design, content, ops/manufacturing.
- Use the OptimizedPayload from the first fixture target (Daniel's
  profile) as the user context — the slim shape is user-conditional but
  this eval is about prompt-vs-model fidelity, not user variation.
- Run each label through Sonnet 4.6 (baseline) and Sonnet 4.5 via
  OpenRouter, using the literal SYSTEM_PROMPT + _build_user_message
  imported from app/services/targets/derive_profile_from_label.py.
- Compare:
    - Schema validity (Pydantic DerivedTarget round-trip).
    - Jaccard overlap on domain_hints + search_keywords.
    - Description length and adherence to the 80-600 char window.

Acceptance threshold (plan): Sonnet 4.5 ≥ 80% Jaccard overlap on hints
+ keywords; no obvious quality regression in description. If yes,
switch and capture cost savings.

Cost expectation: ~$0.25. 10 labels × 2 models × ~$0.012/call.

Usage::

    cd apps/wyrdfold-api
    zsh -c 'source ~/.zshrc && uv run python scripts/eval_derive_target.py'
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import re
import sys
import time
from pathlib import Path
from typing import Any, cast

# Make scripts._openrouter importable.
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.experience import OptimizedPayload  # noqa: E402
from app.services.targets.derive_profile_from_label import (  # noqa: E402
    SYSTEM_PROMPT,
    DerivedTarget,
    _build_user_message,
)
from scripts._openrouter import MODELS, call_model, get_api_key  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("eval_derive_target")

_FIXTURE_PATH = (
    Path(__file__).parent.parent / "tests" / "fixtures" / "eval_set.json"
)
_RESULTS_DIR = Path(__file__).parent / "eval_results"

_MODELS_TO_RUN: dict[str, str] = {
    "sonnet-4.6": MODELS["sonnet-4.6"],
    "sonnet-4.5": MODELS["sonnet-4.5"],
}

# Canonical role labels chosen for spread (IC tech, eng leadership, ops
# leadership, data, design, content, ops/manufacturing). Each is the kind
# of label a user might type into the onboarding "add target" flow.
_CANONICAL_LABELS: list[str] = [
    "Staff Frontend Engineer",
    "Director of CX Operations",
    "Senior Data Scientist",
    "Head of Content",
    "Plant Operations Manager",
    "Engineering Manager, Platform",
    "Principal Product Designer",
    "VP of Customer Success",
    "Senior DevOps Engineer",
    "Director of Marketing Operations",
]


def _load_payload() -> OptimizedPayload:
    """Pull the first target's OptimizedPayload from the eval fixture.

    The slim derivation is user-conditional but we only need ONE consistent
    user context to evaluate prompt-vs-model fidelity — varying the user
    would conflate "model drift" with "user-shape drift".
    """
    fixture = cast(dict[str, Any], json.loads(_FIXTURE_PATH.read_text()))
    first_tid = next(iter(fixture["targets"]))
    return OptimizedPayload.model_validate(
        fixture["targets"][first_tid]["payload"]
    )


def _tokenise(s: str) -> set[str]:
    """Tokenise on word boundaries, lowercase. Used for Jaccard."""
    return {t.lower() for t in re.findall(r"[a-zA-Z0-9]+", s or "")}


def _jaccard(a: list[str], b: list[str]) -> float:
    """Token-level Jaccard between two string lists.

    We compare TOKEN SETS rather than literal string sets so "react
    developer" and "react developers" match — the prompt explicitly
    encourages variation in pluralization / phrasing for search_keywords.
    """
    ta: set[str] = set()
    for s in a:
        ta |= _tokenise(s)
    tb: set[str] = set()
    for s in b:
        tb |= _tokenise(s)
    if not ta and not tb:
        return 1.0
    inter = len(ta & tb)
    union = len(ta | tb)
    return round(inter / union, 4) if union else 0.0


async def _derive_one(
    *,
    label: str,
    payload: OptimizedPayload,
    model_short: str,
    model_slug: str,
    api_key: str,
) -> dict[str, Any]:
    user_context = _build_user_message(payload)
    user_message = f"Target role: {label}\n\n{user_context}"

    result = await call_model(
        model_slug=model_slug,
        system=SYSTEM_PROMPT,
        user=user_message,
        api_key=api_key,
        # DerivedTarget JSON is ~800-1500 tokens — 2048 is comfortable.
        max_tokens=2048,
    )

    parsed_ok = result.parsed is not None
    schema_ok = False
    derived: DerivedTarget | None = None
    if result.parsed is not None:
        try:
            derived = DerivedTarget.model_validate(result.parsed)
            schema_ok = True
        except Exception as exc:  # noqa: BLE001
            result.error = (
                f"{result.error or ''} schema_validation: {type(exc).__name__}"
            ).strip()

    return {
        "label": label,
        "model": model_short,
        "model_slug": model_slug,
        "parsed_ok": parsed_ok,
        "schema_ok": schema_ok,
        "derived": result.parsed,  # raw dict — easier to diff than typed
        "derived_summary": {
            "description_len": (
                len(derived.description) if derived and derived.description else 0
            ),
            "domain_hints": derived.domain_hints if derived else None,
            "search_keywords": derived.search_keywords if derived else None,
            "seniority_hint": derived.seniority_hint if derived else None,
        }
        if schema_ok
        else None,
        "raw_content_preview": result.raw_content[:200],
        "latency_ms": result.latency_ms,
        "cost_usd": result.cost_usd,
        "usage": result.usage,
        "error": result.error,
    }


async def _run(
    *,
    payload: OptimizedPayload,
    labels: list[str],
    models: dict[str, str],
    api_key: str,
    inflight_path: Path,
    concurrency: int,
) -> list[dict[str, Any]]:
    sem = asyncio.Semaphore(concurrency)
    jobs = [
        (label, short, slug)
        for label in labels
        for short, slug in models.items()
    ]
    total = len(jobs)
    logger.info("Total scheduled calls: %d", total)

    async def _bounded(job: tuple[str, str, str]) -> dict[str, Any]:
        label, short, slug = job
        async with sem:
            return await _derive_one(
                label=label,
                payload=payload,
                model_short=short,
                model_slug=slug,
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
                        "models": models,
                        "captured_at_unix": int(time.time()),
                        "results_so_far": results,
                    },
                    indent=2,
                )
            )
            logger.info("Progress: %d/%d", completed, total)
    return results


def _report(
    results: list[dict[str, Any]], *, baseline: str = "sonnet-4.6"
) -> dict[str, Any]:
    """Per-label, per-model comparison vs baseline."""
    by_label: dict[str, dict[str, dict[str, Any]]] = {}
    for r in results:
        by_label.setdefault(r["label"], {})[r["model"]] = r

    per_label_comparison: list[dict[str, Any]] = []
    for label, by_model in by_label.items():
        base = by_model.get(baseline)
        if not base or not base["schema_ok"]:
            per_label_comparison.append(
                {
                    "label": label,
                    "baseline_ok": False,
                    "comparisons": {},
                }
            )
            continue
        base_hints = base["derived_summary"]["domain_hints"] or []
        base_kws = base["derived_summary"]["search_keywords"] or []
        comps: dict[str, dict[str, Any]] = {}
        for other_short, other in by_model.items():
            if other_short == baseline:
                continue
            if not other["schema_ok"]:
                comps[other_short] = {
                    "schema_ok": False,
                    "hint_jaccard": None,
                    "keyword_jaccard": None,
                }
                continue
            other_hints = other["derived_summary"]["domain_hints"] or []
            other_kws = other["derived_summary"]["search_keywords"] or []
            comps[other_short] = {
                "schema_ok": True,
                "hint_jaccard": _jaccard(base_hints, other_hints),
                "keyword_jaccard": _jaccard(base_kws, other_kws),
                "seniority_match": (
                    other["derived_summary"]["seniority_hint"]
                    == base["derived_summary"]["seniority_hint"]
                ),
                "description_len": other["derived_summary"]["description_len"],
                "baseline_description_len": base["derived_summary"][
                    "description_len"
                ],
            }
        per_label_comparison.append(
            {
                "label": label,
                "baseline_ok": True,
                "comparisons": comps,
            }
        )

    # Aggregate per-model
    per_model: dict[str, dict[str, Any]] = {}
    for r in results:
        m = r["model"]
        agg = per_model.setdefault(
            m,
            {
                "schema_ok_count": 0,
                "total": 0,
                "cost_usd": 0.0,
                "latency_ms": [],
                "errors": 0,
                "hint_jaccards": [],
                "keyword_jaccards": [],
            },
        )
        agg["total"] += 1
        if r["schema_ok"]:
            agg["schema_ok_count"] += 1
        agg["cost_usd"] += r["cost_usd"]
        agg["latency_ms"].append(r["latency_ms"])
        if r["error"]:
            agg["errors"] += 1
    for comp in per_label_comparison:
        for other_short, c in comp["comparisons"].items():
            if c.get("hint_jaccard") is not None:
                per_model[other_short]["hint_jaccards"].append(c["hint_jaccard"])
            if c.get("keyword_jaccard") is not None:
                per_model[other_short]["keyword_jaccards"].append(
                    c["keyword_jaccard"]
                )

    summary: dict[str, dict[str, Any]] = {}
    for m, agg in per_model.items():
        hj = agg["hint_jaccards"]
        kj = agg["keyword_jaccards"]
        summary[m] = {
            "schema_ok": f"{agg['schema_ok_count']}/{agg['total']}",
            "total_cost_usd": round(agg["cost_usd"], 5),
            "avg_latency_ms": int(
                sum(agg["latency_ms"]) / max(1, len(agg["latency_ms"]))
            ),
            "errors": agg["errors"],
            "mean_hint_jaccard": round(sum(hj) / len(hj), 4) if hj else None,
            "mean_keyword_jaccard": (
                round(sum(kj) / len(kj), 4) if kj else None
            ),
        }
    return {
        "baseline": baseline,
        "per_label": per_label_comparison,
        "per_model": summary,
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
    md.append("# Slim Target Derivation — Sonnet 4.6 vs 4.5")
    md.append("")
    md.append(f"- Baseline model: **{report['baseline']}**")
    md.append("")
    md.append("## Per-model summary")
    md.append("")
    md.append(
        "| Model | Schema OK | Mean hint Jaccard | "
        "Mean keyword Jaccard | $ total | Avg latency | Errors |"
    )
    md.append("| --- | --- | --- | --- | --- | --- | --- |")
    for m, s in report["per_model"].items():
        md.append(
            f"| {m} | {s['schema_ok']} | "
            f"{s['mean_hint_jaccard'] if s['mean_hint_jaccard'] is not None else '—'} | "
            f"{s['mean_keyword_jaccard'] if s['mean_keyword_jaccard'] is not None else '—'} | "
            f"${s['total_cost_usd']:.4f} | {s['avg_latency_ms']}ms | "
            f"{s['errors']} |"
        )
    md.append("")
    md.append("## Per-label comparison (Sonnet 4.5 vs Sonnet 4.6)")
    md.append("")
    md.append(
        "| Label | Hint Jaccard | Keyword Jaccard | Seniority match | Desc len (4.6 / 4.5) |"
    )
    md.append("| --- | --- | --- | --- | --- |")
    for entry in report["per_label"]:
        if not entry["baseline_ok"]:
            md.append(
                f"| {entry['label']} | baseline schema FAIL | — | — | — |"
            )
            continue
        comp = entry["comparisons"].get("sonnet-4.5")
        if not comp:
            md.append(f"| {entry['label']} | candidate missing | — | — | — |")
            continue
        if not comp.get("schema_ok"):
            md.append(
                f"| {entry['label']} | candidate schema FAIL | — | — | — |"
            )
            continue
        md.append(
            f"| {entry['label']} | {comp['hint_jaccard']} | "
            f"{comp['keyword_jaccard']} | "
            f"{'yes' if comp['seniority_match'] else 'NO'} | "
            f"{comp['baseline_description_len']} / {comp['description_len']} |"
        )
    md.append("")

    md_path.write_text("\n".join(md))
    logger.info("Wrote %s", raw_path)
    logger.info("Wrote %s", md_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    payload = _load_payload()
    api_key = get_api_key()

    ts = time.strftime("%Y%m%dT%H%M%S")
    base = (
        Path(args.output)
        if args.output
        else (_RESULTS_DIR / f"eval_derive_target_{ts}")
    )
    base.parent.mkdir(parents=True, exist_ok=True)
    inflight = base.with_suffix(".inflight.json")

    logger.info(
        "Running %d labels × %d models = %d calls",
        len(_CANONICAL_LABELS),
        len(_MODELS_TO_RUN),
        len(_CANONICAL_LABELS) * len(_MODELS_TO_RUN),
    )

    results = asyncio.run(
        _run(
            payload=payload,
            labels=_CANONICAL_LABELS,
            models=_MODELS_TO_RUN,
            api_key=api_key,
            inflight_path=inflight,
            concurrency=args.concurrency,
        )
    )
    report = _report(results)
    _write_report(results=results, report=report, output_base=base)

    sonnet_45 = report["per_model"].get("sonnet-4.5", {})
    logger.info(
        "Sonnet 4.5 vs 4.6: hint Jaccard=%.3f, keyword Jaccard=%.3f, schema=%s",
        sonnet_45.get("mean_hint_jaccard") or 0.0,
        sonnet_45.get("mean_keyword_jaccard") or 0.0,
        sonnet_45.get("schema_ok"),
    )


if __name__ == "__main__":
    main()
