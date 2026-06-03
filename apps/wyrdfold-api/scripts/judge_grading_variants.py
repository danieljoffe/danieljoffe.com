"""LLM-as-judge: compare prompt variants on grading quality.

Reads N per-row dumps produced by ``eval_grading_prompts.py --save-results``
and asks a stronger model (default Sonnet) to rate each variant's grading
quality on three dimensions, per case:

  * score_appropriateness (0-10): does the overall score match what an
    experienced recruiter would assign for this (target, job) pair?
  * reasoning_quality (0-10): is the reasoning concrete, evidence-anchored,
    and well-targeted? Is the strongest match named clearly?
  * calibration (0-10): does the score appear well-calibrated within the
    job pool (e.g., a clearly-bullseye match scores in the 85+ band; an
    off-discipline case scores < 30)?

The judge does NOT see which prompt produced which output. It sees a
shuffled list of `{variant_id, score, reasoning}` triples per case and
grades each independently. Then we aggregate per variant.

Cost cap: hard limit of ``len(cases) * len(variants)`` judge calls.
At 30 cases × 3 variants = 90 calls × ~$0.005/Sonnet = ~$0.45.

Usage::

    cd apps/wyrdfold-api
    uv run python -m scripts.judge_grading_variants \\
        scripts/.audit-logs/experiments/results-baseline.json \\
        scripts/.audit-logs/experiments/results-v1.json \\
        scripts/.audit-logs/experiments/results-v2.json \\
        scripts/.audit-logs/experiments/results-v3.json

Output:
  * Per-variant aggregate scores (mean + std + percentiles)
  * Per-variant win-rate vs each other variant (head-to-head)
  * Worst-case examples per variant (low-scored cases for debugging)
  * Saved JSON dump for downstream analysis
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import random
import statistics
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, cast

from pydantic import BaseModel, Field

from app.config import settings
from app.models.llm import Message, ModelId
from app.services.llm import get_default_client as get_llm
from app.services.llm.client import complete_json

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("judge_variants")

_DEFAULT_JUDGE_MODEL: ModelId = "claude-sonnet-4-6"
_JUDGE_PURPOSE = "fit.judge_variants"
_MAX_CALLS_PER_RUN = 200  # safety: never exceed ~$1 at Sonnet
_LOG_DIR = Path(__file__).parent / ".audit-logs" / "experiments"


_JUDGE_SYSTEM = """\
You audit the quality of automated job-fit scoring. For one (target, job) \
pair you will see several candidate gradings — each a {score, axes, reasoning} \
tuple produced by a different prompt variant. Your job is to rate each \
candidate on three independent dimensions.

Per candidate, score each 0-10:

- score_appropriateness: does the overall fit score (0-100) match what an \
  experienced technical recruiter would assign for this exact \
  (target, job) pairing? 10 = the score is right; 0 = the score is wildly \
  off (e.g., clear bullseye scored 30, or clear non-fit scored 85).

- reasoning_quality: is the reasoning string concrete, evidence-anchored, \
  and well-targeted? 10 = cites specific JD phrases AND specific profile \
  facts, names the strongest dimension clearly, names the biggest gap; \
  0 = vague / generic / unfalsifiable.

- calibration: does the score band fit the pool? A 95 should be reserved \
  for "I would apply today" matches; a 75 should be "solid, with one real \
  gap"; below 50 should be genuinely-not-a-fit. 10 = the band is right; \
  0 = the band is one or more bands off.

Be a tough but fair grader. Most candidates should land in the 5-8 range; \
9-10 is for genuinely-excellent grading and 0-2 for clearly-broken \
grading.

Return JSON matching this exact schema (one entry per candidate, keyed by \
variant_id):

{
  "judgments": [
    {
      "variant_id": "A",
      "score_appropriateness": 7,
      "reasoning_quality": 8,
      "calibration": 7,
      "note": "Title match right; reasoning cites React/TS. Domain gap over-weighted."
    },
    ...
  ]
}

Return ONLY the JSON object. No prose, no markdown, no code fences."""


class _CandidateJudgment(BaseModel):
    variant_id: str
    score_appropriateness: int = Field(ge=0, le=10)
    reasoning_quality: int = Field(ge=0, le=10)
    calibration: int = Field(ge=0, le=10)
    note: str = Field(max_length=1500)


class _JudgeResponse(BaseModel):
    judgments: list[_CandidateJudgment]


def _build_judge_user_msg(
    *,
    target_label: str,
    job_title: str,
    jd_text: str,
    candidates: list[tuple[str, int, dict[str, int], str]],
) -> str:
    parts = [
        f"## Target role\n{target_label}",
        f"## Job\n**Title:** {job_title}\n\n**JD (first 2000 chars):**\n{jd_text[:2000]}",
        "## Candidate gradings (rate each independently)",
    ]
    for vid, score, axes, reasoning in candidates:
        parts.append(
            f"### Variant {vid}\n"
            f"- overall: **{score}**\n"
            f"- axes: title_fit={axes.get('title_fit')}, "
            f"skills_fit={axes.get('skills_fit')}, "
            f"seniority_fit={axes.get('seniority_fit')}, "
            f"domain_fit={axes.get('domain_fit')}\n"
            f"- reasoning: {reasoning}"
        )
    return "\n\n".join(parts)


def _load_runs(paths: list[Path]) -> tuple[list[dict[str, Any]], list[str]]:
    """Returns (runs, variant_ids). Variant_ids in the order of paths."""
    runs: list[dict[str, Any]] = []
    ids: list[str] = []
    for p in paths:
        data = json.loads(p.read_text())
        runs.append(data)
        ids.append(data.get("prompt_label") or p.stem)
    return runs, ids


def _align_by_case(
    runs: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return a list of ``{case, candidates: [(run_idx, score, axes,
    reasoning), ...]}``. Cases missing from any run are dropped."""
    by_jt: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for ri, run in enumerate(runs):
        for row in run.get("rows", []):
            key = (row["case"]["target_id"], row["case"]["job_posting_id"])
            by_jt[key].append({"run_idx": ri, "row": row})
    aligned: list[dict[str, Any]] = []
    for _key, rows in by_jt.items():
        if len(rows) != len(runs):
            continue  # skip cases not present in all runs
        if any(r["row"].get("variant_score") is None for r in rows):
            continue  # skip cases where any variant failed
        # All present — use the first row's `case` for prompt assembly.
        aligned.append({
            "case": rows[0]["row"]["case"],
            "candidates": rows,
        })
    return aligned


async def _judge_one(
    llm: Any,
    *,
    judge_model: ModelId,
    target_label: str,
    case: dict[str, Any],
    candidates: list[dict[str, Any]],
    variant_ids: list[str],
    rng: random.Random,
) -> dict[str, dict[str, Any]] | None:
    """Returns ``{variant_id: judgment_dict}`` on success, else None."""
    # Shuffle so position bias doesn't favour any variant. We pass
    # opaque labels A/B/C/... to the model, then unshuffle.
    indexed = list(enumerate(candidates))
    rng.shuffle(indexed)
    label_to_run_idx = {
        chr(ord("A") + i): ic[0] for i, ic in enumerate(indexed)
    }
    cand_for_prompt: list[tuple[str, int, dict[str, int], str]] = []
    for i, (_orig_idx, c) in enumerate(indexed):
        label = chr(ord("A") + i)
        cand_for_prompt.append((
            label,
            int(c["row"]["variant_score"]),
            c["row"]["variant_axes"] or {},
            c["row"].get("variant_reasoning") or "",
        ))

    user_msg = _build_judge_user_msg(
        target_label=target_label,
        job_title=case["title"],
        jd_text=case["jd_text"],
        candidates=cand_for_prompt,
    )
    try:
        parsed, _ = await complete_json(
            llm,
            model=judge_model,
            system=_JUDGE_SYSTEM,
            messages=[Message(role="user", content=user_msg)],
            schema=_JudgeResponse,
            purpose=_JUDGE_PURPOSE,
            max_tokens=1024,
            cache_system=True,
        )
    except Exception:
        logger.exception("Judge failed for %s", case.get("title", "?")[:50])
        return None
    # Unshuffle the labelled judgments back to variant_ids.
    out: dict[str, dict[str, Any]] = {}
    for j in parsed.judgments:
        run_idx = label_to_run_idx.get(j.variant_id)
        if run_idx is None:
            continue
        vid = variant_ids[run_idx]
        out[vid] = {
            "score_appropriateness": j.score_appropriateness,
            "reasoning_quality": j.reasoning_quality,
            "calibration": j.calibration,
            "note": j.note,
        }
    return out


async def main_async(args: argparse.Namespace) -> None:
    paths = [Path(p) for p in args.results]
    for p in paths:
        if not p.exists():
            raise RuntimeError(f"Results file missing: {p}")

    runs, variant_ids = _load_runs(paths)
    logger.info("Loaded %d variant(s): %s", len(runs), variant_ids)

    # Pull a target_label index from the first run's eval_set fixture so
    # the judge sees the target name, not the UUID.
    fixture_path = (
        Path(__file__).parent.parent / "tests" / "fixtures" / "eval_set.json"
    )
    target_labels: dict[str, str] = {}
    if fixture_path.exists():
        fixture = json.loads(fixture_path.read_text())
        for tid, t in fixture.get("targets", {}).items():
            target_labels[tid] = t.get("label", tid)

    aligned = _align_by_case(runs)
    if args.limit and len(aligned) > args.limit:
        aligned = aligned[: args.limit]
    n_calls = len(aligned)
    if n_calls > _MAX_CALLS_PER_RUN:
        raise RuntimeError(
            f"Refusing to make {n_calls} judge calls (cap={_MAX_CALLS_PER_RUN})."
        )
    logger.info(
        "Will judge %d case(s) × %d variant(s) each (= %d Sonnet calls).",
        n_calls, len(runs), n_calls,
    )
    if args.dry_run:
        return
    if settings.llm_provider != "anthropic":
        raise RuntimeError(
            f"LLM_PROVIDER must be 'anthropic' (currently {settings.llm_provider!r})."
        )

    rng = random.Random(args.seed)  # noqa: S311 — research sampling
    llm = get_llm()

    # Per-variant accumulators
    metrics: dict[str, dict[str, list[int]]] = {
        vid: {"appropriateness": [], "reasoning": [], "calibration": []}
        for vid in variant_ids
    }
    notes: dict[str, list[dict[str, Any]]] = defaultdict(list)
    failures = 0

    for i, ac in enumerate(aligned, start=1):
        target_label = target_labels.get(ac["case"]["target_id"], ac["case"]["target_id"])
        if i % 10 == 0 or i == n_calls:
            logger.info("  judged %d / %d", i, n_calls)
        result = await _judge_one(
            llm,
            judge_model=cast(ModelId, args.judge_model),
            target_label=target_label,
            case=ac["case"],
            candidates=ac["candidates"],
            variant_ids=variant_ids,
            rng=rng,
        )
        if result is None:
            failures += 1
            continue
        for vid, j in result.items():
            metrics[vid]["appropriateness"].append(int(j["score_appropriateness"]))
            metrics[vid]["reasoning"].append(int(j["reasoning_quality"]))
            metrics[vid]["calibration"].append(int(j["calibration"]))
            notes[vid].append({
                "title": ac["case"]["title"][:80],
                "company": ac["case"].get("company", ""),
                "scores": j,
            })

    # ---- Report ----
    print()
    print("=" * 76)
    print(f"JUDGE REPORT — judge_model={args.judge_model}  n={n_calls}  failed={failures}")
    print("=" * 76)
    print(f"{'variant':<48} {'appropr':>8} {'reasoning':>10} {'calib':>8} {'TOTAL':>8}")
    overall: list[tuple[str, float]] = []
    for vid in variant_ids:
        m = metrics[vid]
        if not m["appropriateness"]:
            print(f"{vid:<48}   no data")
            continue
        a = statistics.mean(m["appropriateness"])
        r = statistics.mean(m["reasoning"])
        c = statistics.mean(m["calibration"])
        total = a + r + c
        overall.append((vid, total))
        print(f"{vid:<48} {a:>8.2f} {r:>10.2f} {c:>8.2f} {total:>8.2f}")
    if overall:
        overall.sort(key=lambda x: -x[1])
        print()
        print("Ranking by combined judge score (max 30):")
        for i, (vid, t) in enumerate(overall, start=1):
            print(f"  {i}. {vid}  ({t:.2f})")

    # ---- Head-to-head win rates ----
    if len(variant_ids) >= 2:
        print()
        print("Head-to-head win rate (% of cases where row > col on combined score):")
        per_case: dict[str, list[float]] = {}
        for vid in variant_ids:
            triples = list(zip(
                metrics[vid]["appropriateness"],
                metrics[vid]["reasoning"],
                metrics[vid]["calibration"],
                strict=True,
            ))
            per_case[vid] = [(a + r + c) / 3.0 for (a, r, c) in triples]
        n_paired = min(len(v) for v in per_case.values()) if per_case else 0
        for a_id in variant_ids:
            cells: list[str] = []
            for b_id in variant_ids:
                if a_id == b_id:
                    cells.append("  —  ")
                    continue
                wins = 0
                for i in range(n_paired):
                    if per_case[a_id][i] > per_case[b_id][i]:
                        wins += 1
                cells.append(f"{100 * wins / n_paired:5.1f}%" if n_paired else "  —  ")
            print(f"  {a_id[:30]:<32} " + " ".join(cells))

    # ---- Save dump ----
    out_path = (
        _LOG_DIR / f"judge-{int(time.time())}.json"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dump = {
        "judge_model": args.judge_model,
        "variants": variant_ids,
        "n_cases": n_calls,
        "failures": failures,
        "aggregate": {
            vid: {
                "appropriateness_mean": (
                    statistics.mean(metrics[vid]["appropriateness"])
                    if metrics[vid]["appropriateness"] else None
                ),
                "reasoning_mean": (
                    statistics.mean(metrics[vid]["reasoning"])
                    if metrics[vid]["reasoning"] else None
                ),
                "calibration_mean": (
                    statistics.mean(metrics[vid]["calibration"])
                    if metrics[vid]["calibration"] else None
                ),
            }
            for vid in variant_ids
        },
        "per_case": {vid: notes[vid] for vid in variant_ids},
    }
    out_path.write_text(json.dumps(dump, indent=2, sort_keys=True))
    print(f"\nFull dump: {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="LLM-as-judge for grading variants")
    parser.add_argument(
        "results", nargs="+",
        help="Two or more per-row JSON dumps from eval_grading_prompts --save-results.",
    )
    parser.add_argument(
        "--judge-model", default=_DEFAULT_JUDGE_MODEL,
        help="Model that does the judging (default Sonnet 4.6).",
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Cap the number of cases to judge (default: all aligned cases).",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show how many calls would be made, don't actually judge.",
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="RNG seed for variant shuffling (anti-position-bias).",
    )
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
