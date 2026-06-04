"""Eval 3: Target suggestion — multi-model bench.

Plan reference: ``.claude/docs/plan-wyrdfold-multi-model-eval-coverage.md``
section "Eval 3 — Target suggestion".

Question: which model produces the most useful target suggestions —
roles the user could plausibly land that they haven't already targeted?

Approach
--------
- Use the OptimizedPayload(s) available in the eval_set fixture (one
  per fixture target, deduped by payload hash). The plan asks for
  3-5 user payloads ideally; the fixture currently carries 2
  distinct payloads. The per-user variance line of the analysis is
  bounded — flagged in the results doc.
- Run BOTH modes per user:
    - ``suggest_targets`` (onboarding mode) — no existing targets
      argument, the LLM proposes from scratch.
    - ``suggest_lateral_targets`` (lateral mode) — the user's
      current targets are the exclusion list.
- 5 candidate models from the plan: sonnet-4.6, sonnet-4.5, gpt-5.1,
  gemini-2.5-pro, deepseek-v3.2.
- Opus 4.7 LLM judge scores each suggestion list on three axes
  (coherence, relevance, diversity), 0-2 per axis. Held fixed across
  all model outputs so the judge's bias doesn't leak into the
  cross-model comparison.
- Cross-model label-overlap matrix: for each pair of models,
  Jaccard on (case-insensitive) suggestion labels.
- Anonymized "please pick" markdown for Daniel's human spot-check.

Acceptance threshold (plan): the cheapest model whose mean judge
score is within 15% of Sonnet 4.6's. Otherwise stay on Sonnet 4.6.

Cost expectation: ~$7 in the plan. Fixture-only scope brings this
down to ~$0.5 in practice.

Usage::

    cd apps/wyrdfold-api
    zsh -c 'source ~/.zshrc && uv run python scripts/eval_target_suggestion.py'
    zsh -c 'source ~/.zshrc && uv run python scripts/eval_target_suggestion.py --cap-users 1 --skip-judge'
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import logging
import random
import sys
import time
from itertools import combinations
from pathlib import Path
from typing import Any, cast

# Make scripts._openrouter importable.
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.experience import OptimizedPayload
from app.models.targets import JobTarget
from app.services.targets.lateral_discovery import (
    _SYSTEM_PROMPT as _LATERAL_SYSTEM,
)
from app.services.targets.lateral_discovery import (
    _build_user_message as _build_lateral_user_message,
)
from app.services.targets.suggest import (
    SYSTEM_PROMPT as _SUGGEST_SYSTEM,
)
from app.services.targets.suggest import (
    _build_user_message as _build_suggest_user_message,
)
from scripts._openrouter import MODELS, call_model, get_api_key

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("eval_target_suggestion")

_FIXTURE_PATH = (
    Path(__file__).parent.parent / "tests" / "fixtures" / "eval_set.json"
)
_RESULTS_DIR = Path(__file__).parent / "eval_results"

_CANDIDATE_MODELS: dict[str, str] = {
    "sonnet-4.6": MODELS["sonnet-4.6"],
    "sonnet-4.5": MODELS["sonnet-4.5"],
    "gpt-5.1": MODELS["gpt-5.1"],
    "gemini-2.5-pro": MODELS["gemini-2.5-pro"],
    "deepseek-v3.2": MODELS["deepseek-v3.2"],
}

_JUDGE_MODEL_SLUG = "anthropic/claude-opus-4.7"

_GEN_MAX_TOKENS = 2048
_JUDGE_MAX_TOKENS = 2048

_MODES = ("onboarding", "lateral")


def _load_fixture() -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(_FIXTURE_PATH.read_text()))


def _rehydrate_users(fixture: dict[str, Any]) -> list[dict[str, Any]]:
    """One user record per fixture target, deduplicated by payload hash."""
    seen: set[str] = set()
    users: list[dict[str, Any]] = []
    for tid, meta in fixture["targets"].items():
        payload_dict = meta["payload"]
        h = hashlib.sha256(
            json.dumps(payload_dict, sort_keys=True).encode()
        ).hexdigest()[:12]
        if h in seen:
            continue
        seen.add(h)
        users.append(
            {
                "user_id": h,
                "target_id": tid,
                "payload": OptimizedPayload.model_validate(payload_dict),
                "current_target": JobTarget.model_validate(meta["target"]),
            }
        )
    return users


def _extract_suggestions(
    parsed: dict[str, Any] | None, mode: str
) -> list[dict[str, Any]]:
    if not isinstance(parsed, dict):
        return []
    arr = parsed.get("suggestions")
    if not isinstance(arr, list):
        return []
    return [s for s in arr if isinstance(s, dict)]


async def _generate_one(
    *,
    user: dict[str, Any],
    mode: str,
    model_short: str,
    model_slug: str,
    api_key: str,
) -> dict[str, Any]:
    if mode == "onboarding":
        system_prompt = _SUGGEST_SYSTEM
        user_message = _build_suggest_user_message(user["payload"])
    else:
        system_prompt = _LATERAL_SYSTEM
        user_message = _build_lateral_user_message(
            user["payload"], current_targets=[user["current_target"]]
        )

    result = await call_model(
        model_slug=model_slug,
        system=system_prompt,
        user=user_message,
        api_key=api_key,
        max_tokens=_GEN_MAX_TOKENS,
    )

    suggestions = _extract_suggestions(result.parsed, mode)
    return {
        "user_id": user["user_id"],
        "mode": mode,
        "model": model_short,
        "model_slug": model_slug,
        "n_suggestions": len(suggestions),
        "suggestions": suggestions,
        "raw_content_preview": result.raw_content[:300],
        "schema_ok": len(suggestions) > 0,
        "latency_ms": result.latency_ms,
        "cost_usd": result.cost_usd,
        "usage": result.usage,
        "error": result.error,
    }


_JUDGE_SYSTEM = """You are evaluating a list of target-role suggestions \
produced for a user, given the user's experience profile.

Score the FULL LIST (not individual items) on three axes, 0-2 each:

- coherence: do the suggestions cite specific user facts in their \
reasoning? 0=generic, 1=mixed, 2=evidence-rich across the list.
- relevance: could the user plausibly land these roles given their \
experience? 0=multiple wrong-function suggestions, 1=mixed, 2=all \
plausible.
- diversity: does the list cover multiple industries / altitudes / \
specializations? 0=very narrow, 1=some variation, 2=meaningful spread.

Return JSON matching this exact schema:

{
  "coherence": 0-2,
  "relevance": 0-2,
  "diversity": 0-2,
  "rationale": "1-2 sentences explaining the scoring."
}

Return ONLY the JSON object. No prose around it. No code fences."""


def _judge_user_message(
    *,
    user_payload_summary: str,
    suggestions: list[dict[str, Any]],
) -> str:
    parts = ["User profile (summary):", user_payload_summary[:2000], ""]
    parts.append(f"Suggestions ({len(suggestions)}):")
    for i, s in enumerate(suggestions, start=1):
        label = (
            s.get("label")
            or s.get("title")
            or s.get("role")
            or s.get("role_title")
            or "(unlabeled)"
        )
        reasoning = (
            s.get("one_line_reasoning")
            or s.get("reasoning")
            or s.get("why")
            or s.get("rationale")
            or ""
        )
        parts.append(f"{i}. {label} — {reasoning}")
    return "\n".join(parts)


async def _judge_one(
    *,
    user: dict[str, Any],
    suggestions: list[dict[str, Any]],
    api_key: str,
) -> dict[str, Any]:
    user_summary = _build_suggest_user_message(user["payload"])
    user_message = _judge_user_message(
        user_payload_summary=user_summary,
        suggestions=suggestions,
    )
    result = await call_model(
        model_slug=_JUDGE_MODEL_SLUG,
        system=_JUDGE_SYSTEM,
        user=user_message,
        api_key=api_key,
        max_tokens=_JUDGE_MAX_TOKENS,
    )
    return {
        "judge_model": _JUDGE_MODEL_SLUG,
        "parsed": result.parsed,
        "raw_content_preview": result.raw_content[:300],
        "cost_usd": result.cost_usd,
        "latency_ms": result.latency_ms,
        "error": result.error,
    }


def _label_overlap_matrix(
    gen_results: list[dict[str, Any]],
    *,
    user_id: str,
    mode: str,
    models: dict[str, str],
) -> dict[str, dict[str, float]]:
    by_model_labels: dict[str, set[str]] = {}
    for r in gen_results:
        if r["user_id"] != user_id or r["mode"] != mode:
            continue
        labels: set[str] = set()
        for s in r["suggestions"]:
            label = s.get("label") or s.get("title") or s.get("role") or ""
            if label:
                labels.add(label.strip().lower())
        by_model_labels[r["model"]] = labels

    matrix: dict[str, dict[str, float]] = {}
    for m1, m2 in combinations(sorted(by_model_labels), 2):
        a, b = by_model_labels[m1], by_model_labels[m2]
        if not a and not b:
            j = 1.0
        elif not (a | b):
            j = 0.0
        else:
            j = len(a & b) / len(a | b)
        matrix.setdefault(m1, {})[m2] = round(j, 3)
        matrix.setdefault(m2, {})[m1] = round(j, 3)
    return matrix


def _anonymize_outputs(
    gen_results: list[dict[str, Any]],
    *,
    salt: str,
) -> dict[tuple[str, str], dict[str, dict[str, Any]]]:
    by_key: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for r in gen_results:
        by_key.setdefault((r["user_id"], r["mode"]), []).append(r)
    out: dict[tuple[str, str], dict[str, dict[str, Any]]] = {}
    for key, results in by_key.items():
        rng = random.Random(f"{salt}|{key[0]}|{key[1]}")
        rng.shuffle(results)
        labels = ["A", "B", "C", "D", "E", "F", "G"]
        out[key] = {labels[i]: r for i, r in enumerate(results)}
    return out


def _write_report(
    *,
    users: list[dict[str, Any]],
    gen_results: list[dict[str, Any]],
    judge_results: dict[tuple[str, str, str], dict[str, Any]],
    anon: dict[tuple[str, str], dict[str, dict[str, Any]]],
    output_base: Path,
) -> None:
    output_base.parent.mkdir(parents=True, exist_ok=True)
    raw_path = output_base.with_suffix(".json")
    md_path = output_base.with_suffix(".md")

    judge_flat = {
        f"{user_id}|{mode}|{model}": payload
        for (user_id, mode, model), payload in judge_results.items()
    }
    anon_flat = {
        f"{user_id}|{mode}": {label: r["model"] for label, r in triple.items()}
        for (user_id, mode), triple in anon.items()
    }

    raw_path.write_text(
        json.dumps(
            {
                "captured_at_unix": int(time.time()),
                "users": [
                    {"user_id": u["user_id"], "target_id": u["target_id"]}
                    for u in users
                ],
                "gen_results": gen_results,
                "judge_results": judge_flat,
                "anon": anon_flat,
            },
            indent=2,
        )
    )

    cost_by_model: dict[str, float] = {}
    latency_by_model: dict[str, list[int]] = {}
    schema_fail_by_model: dict[str, int] = {}
    for r in gen_results:
        cost_by_model[r["model"]] = cost_by_model.get(r["model"], 0) + r["cost_usd"]
        latency_by_model.setdefault(r["model"], []).append(r["latency_ms"])
        if not r["schema_ok"]:
            schema_fail_by_model[r["model"]] = (
                schema_fail_by_model.get(r["model"], 0) + 1
            )
    judge_cost = sum(j.get("cost_usd", 0.0) for j in judge_results.values())

    judge_total_by_model: dict[str, list[int]] = {}
    for (user_id, mode, model), j in judge_results.items():
        p = j.get("parsed") or {}
        try:
            tot = (
                int(p.get("coherence", 0))
                + int(p.get("relevance", 0))
                + int(p.get("diversity", 0))
            )
            judge_total_by_model.setdefault(model, []).append(tot)
        except (TypeError, ValueError):
            continue

    md: list[str] = []
    md.append("# Target Suggestion Eval — 5 models")
    md.append("")
    md.append(f"- Users: **{len(users)}** (deduped from fixture targets)")
    md.append(f"- Modes per user: **{len(_MODES)}** (onboarding, lateral)")
    md.append(f"- Candidate models: {', '.join(_CANDIDATE_MODELS)}")
    md.append("")
    md.append("## Per-model summary")
    md.append("")
    md.append(
        "| Model | Schema fails | $ total | Avg latency | Mean judge score (max 6) |"
    )
    md.append("| --- | --- | --- | --- | --- |")
    for m in _CANDIDATE_MODELS:
        lat = latency_by_model.get(m, [])
        scores = judge_total_by_model.get(m, [])
        mean = sum(scores) / len(scores) if scores else None
        md.append(
            f"| {m} | {schema_fail_by_model.get(m, 0)} | "
            f"${cost_by_model.get(m, 0):.4f} | "
            f"{int(sum(lat) / max(1, len(lat)))}ms | "
            f"{f'{mean:.2f}' if mean is not None else '—'} |"
        )
    md.append(f"\nJudge (Opus 4.7) total cost: **${judge_cost:.4f}**.")
    md.append("")

    md.append("## Anonymized suggestion lists (please pick)")
    md.append("")
    md.append(
        "For each (user, mode), the 5 model outputs are randomly relabelled "
        "A-E. Read each set blind, pick the strongest, then cross-reference "
        "against the model mapping in the raw JSON."
    )
    md.append("")
    for user in users:
        for mode in _MODES:
            key = (user["user_id"], mode)
            triple = anon.get(key, {})
            if not triple:
                continue
            md.append(f"### User {user['user_id']} — {mode}")
            md.append("")
            for label, r in sorted(triple.items()):
                md.append(f"#### Output {label}")
                md.append("")
                for s in r["suggestions"]:
                    title = (
                        s.get("label")
                        or s.get("title")
                        or s.get("role")
                        or "(unlabeled)"
                    )
                    reasoning = (
                        s.get("one_line_reasoning")
                        or s.get("reasoning")
                        or s.get("why")
                        or ""
                    )
                    md.append(f"- **{title}** — {reasoning[:280]}")
                md.append("")
                jkey = (user["user_id"], mode, r["model"])
                j = judge_results.get(jkey)
                if j and j.get("parsed"):
                    p = j["parsed"]
                    md.append(
                        f"_Judge: coherence={p.get('coherence', '?')} "
                        f"relevance={p.get('relevance', '?')} "
                        f"diversity={p.get('diversity', '?')}_"
                    )
                    md.append("")
            md.append("---")
            md.append("")

    md.append("## Cross-model label overlap (Jaccard, per user × mode)")
    md.append("")
    for user in users:
        for mode in _MODES:
            md.append(f"### {user['user_id']} — {mode}")
            md.append("")
            matrix = _label_overlap_matrix(
                gen_results,
                user_id=user["user_id"],
                mode=mode,
                models=_CANDIDATE_MODELS,
            )
            if not matrix:
                md.append("_(no overlap data — all models schema-failed?)_")
                md.append("")
                continue
            models_seen = sorted(matrix)
            md.append("| | " + " | ".join(models_seen) + " |")
            md.append("| --- |" + " --- |" * len(models_seen))
            for m in models_seen:
                row = [m] + [
                    (
                        f"{matrix[m].get(m2, '—'):.2f}"
                        if isinstance(matrix[m].get(m2), float)
                        else "—"
                    )
                    for m2 in models_seen
                ]
                md.append("| " + " | ".join(row) + " |")
            md.append("")

    md_path.write_text("\n".join(md))
    logger.info("Wrote %s", raw_path)
    logger.info("Wrote %s", md_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cap-users", type=int, default=None)
    parser.add_argument("--skip-judge", action="store_true")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    fixture = _load_fixture()
    users = _rehydrate_users(fixture)
    if args.cap_users:
        users = users[: args.cap_users]
    api_key = get_api_key()

    ts = time.strftime("%Y%m%dT%H%M%S")
    base = (
        Path(args.output)
        if args.output
        else (_RESULTS_DIR / f"eval_target_suggestion_{ts}")
    )
    base.parent.mkdir(parents=True, exist_ok=True)
    inflight = base.with_suffix(".inflight.json")

    logger.info(
        "Target-suggestion eval: %d users × %d modes × %d models = %d gen calls",
        len(users),
        len(_MODES),
        len(_CANDIDATE_MODELS),
        len(users) * len(_MODES) * len(_CANDIDATE_MODELS),
    )

    sem = asyncio.Semaphore(args.concurrency)
    gen_jobs = [
        (user, mode, short, slug)
        for user in users
        for mode in _MODES
        for short, slug in _CANDIDATE_MODELS.items()
    ]

    async def _gen_bounded(
        job: tuple[dict[str, Any], str, str, str],
    ) -> dict[str, Any]:
        user, mode, short, slug = job
        async with sem:
            return await _generate_one(
                user=user,
                mode=mode,
                model_short=short,
                model_slug=slug,
                api_key=api_key,
            )

    async def _run_gen() -> list[dict[str, Any]]:
        gen_results: list[dict[str, Any]] = []
        pending = {asyncio.create_task(_gen_bounded(j)) for j in gen_jobs}
        completed = 0
        total = len(gen_jobs)
        while pending:
            done, pending = await asyncio.wait(
                pending, return_when=asyncio.FIRST_COMPLETED
            )
            for t in done:
                gen_results.append(t.result())
                completed += 1
                inflight.write_text(
                    json.dumps(
                        {
                            "completed": completed,
                            "total": total,
                            "phase": "gen",
                            "results_so_far": gen_results,
                        },
                        indent=2,
                    )
                )
                logger.info("Gen progress: %d/%d", completed, total)
        return gen_results

    gen_results = asyncio.run(_run_gen())

    anon = _anonymize_outputs(gen_results, salt="target-suggestion-eval")

    judge_results: dict[tuple[str, str, str], dict[str, Any]] = {}
    if not args.skip_judge:
        judge_jobs: list[tuple[dict[str, Any], str, dict[str, Any]]] = []
        for r in gen_results:
            if not r["schema_ok"]:
                continue
            user = next(u for u in users if u["user_id"] == r["user_id"])
            judge_jobs.append((user, r["mode"], r))

        sem2 = asyncio.Semaphore(min(3, args.concurrency))

        async def _judge_bounded(
            job: tuple[dict[str, Any], str, dict[str, Any]],
        ) -> tuple[tuple[str, str, str], dict[str, Any]]:
            user, mode, r = job
            async with sem2:
                j = await _judge_one(
                    user=user,
                    suggestions=r["suggestions"],
                    api_key=api_key,
                )
                return (user["user_id"], mode, r["model"]), j

        async def _run_judge() -> dict[tuple[str, str, str], dict[str, Any]]:
            out: dict[tuple[str, str, str], dict[str, Any]] = {}
            pending = {asyncio.create_task(_judge_bounded(j)) for j in judge_jobs}
            completed = 0
            total = len(judge_jobs)
            while pending:
                done, pending = await asyncio.wait(
                    pending, return_when=asyncio.FIRST_COMPLETED
                )
                for t in done:
                    key, payload = t.result()
                    out[key] = payload
                    completed += 1
                    logger.info("Judge progress: %d/%d", completed, total)
            return out

        judge_results = asyncio.run(_run_judge())

    _write_report(
        users=users,
        gen_results=gen_results,
        judge_results=judge_results,
        anon=anon,
        output_base=base,
    )


if __name__ == "__main__":
    main()
