"""Eval 2: Cover letter — Sonnet 4.6 vs GPT-5.1 vs Haiku 4.5.

Plan reference: ``.claude/docs/plan-wyrdfold-multi-model-eval-coverage.md``
section "Eval 2 — Cover letter".

Question: does GPT-5.1 (~3× cheaper, faster than Sonnet 4.6) produce
cover letters that are at least as good as Sonnet?

Approach
--------
- Pick 5 (user × JD) pairs spanning band/role-type using the existing
  eval_set fixture. Single user (Daniel's profile, the first fixture
  payload) × 5 distinct JDs from different bands + targets.
- For each pair, generate one letter via OpenRouter through:
    - sonnet-4.6 (production baseline)
    - gpt-5.1    (candidate, ~3× cheaper)
    - haiku-4.5  (low-cost floor — useful to see what "too cheap"
                  looks like so the human spot-check has anchors)
- Persist anonymized letters into the committed results doc as
  "please pick" sections — Daniel reads blind and replies with picks.
- Run an Opus 4.7 LLM judge over the same anonymized triples as a
  corroborating signal. Judge scores 0-2 per axis on
  (persuasiveness, specificity, JD-alignment).

Acceptance threshold (plan): human blind-pick GPT-5.1 wins/ties ≥ 3/5.
The LLM-judge score is only consulted when human judgment is ambiguous.

Cost expectation: ~$2. 15 generations × ~$0.05 + 15 judge calls × ~$0.10.

Usage::

    cd apps/wyrdfold-api
    zsh -c 'source ~/.zshrc && uv run python scripts/eval_cover_letter.py'
    zsh -c 'source ~/.zshrc && uv run python scripts/eval_cover_letter.py --skip-judge'
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
from pathlib import Path
from typing import Any, cast

# Make scripts._openrouter importable.
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.experience import OptimizedPayload
from app.models.tailor import ContactInfo
from app.services.tailor.prompts import COVER_LETTER_SYSTEM
from app.services.tailor.tailor import (
    build_cover_letter_user_message,
)
from scripts._openrouter import MODELS, call_model, get_api_key

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("eval_cover_letter")

_FIXTURE_PATH = (
    Path(__file__).parent.parent / "tests" / "fixtures" / "eval_set.json"
)
_RESULTS_DIR = Path(__file__).parent / "eval_results"

# Three writer models — matches plan section "Eval 2".
_WRITER_MODELS: dict[str, str] = {
    "sonnet-4.6": MODELS["sonnet-4.6"],
    "gpt-5.1": MODELS["gpt-5.1"],
    "haiku-4.5": "anthropic/claude-haiku-4.5",
}

# Judge model — held fixed across all three writers per the plan. Opus
# 4.7 is the strongest reader available; "held fixed" matters more than
# absolute strength here, because the judge's job is to be CONSISTENT.
_JUDGE_MODEL_SLUG = "anthropic/claude-opus-4.7"

# Cover-letter prod cap. Honor it so the eval matches prod behaviour.
_WRITER_MAX_TOKENS = 4096
_JUDGE_MAX_TOKENS = 1024

# Fake contact so we don't pollute the eval with PII-leak risk via the
# JSON output. Same shape as ContactInfo expects.
_FAKE_CONTACT = ContactInfo(
    name="Anonymous Candidate",
    email="candidate@example.com",
    phone=None,
    location=None,
    linkedin=None,
    website=None,
)


def _load_fixture() -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(_FIXTURE_PATH.read_text()))


def _pick_pairs(fixture: dict[str, Any], n: int = 5) -> list[dict[str, Any]]:
    """Pick N diverse (user, JD) pairs from the fixture.

    Strategy: one payload (first target's), N JDs sampled to span
    bands × targets so the judge sees a real spread.
    """
    cases = fixture["cases"]
    # Group by (target_id, band) then round-robin sample.
    by_bucket: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for case in cases:
        key = (case["target_id"], case["band"])
        by_bucket.setdefault(key, []).append(case)
    rng = random.Random(42)  # reproducible spread
    picks: list[dict[str, Any]] = []
    buckets = list(by_bucket.values())
    rng.shuffle(buckets)
    for bucket in buckets:
        picks.append(rng.choice(bucket))
        if len(picks) >= n:
            break
    return picks


def _first_payload(fixture: dict[str, Any]) -> OptimizedPayload:
    first_tid = next(iter(fixture["targets"]))
    return OptimizedPayload.model_validate(
        fixture["targets"][first_tid]["payload"]
    )


def _anon_id(model_short: str, pair_idx: int, salt: str) -> str:
    """Stable but blind: a letter that doesn't reveal the model."""
    h = hashlib.sha256(
        f"{salt}|{model_short}|{pair_idx}".encode()
    ).hexdigest()[:6]
    return f"draft-{pair_idx}-{h}"


async def _write_one(
    *,
    payload: OptimizedPayload,
    case: dict[str, Any],
    model_short: str,
    model_slug: str,
    api_key: str,
) -> dict[str, Any]:
    user_message = build_cover_letter_user_message(
        optimized=payload,
        job_description=case.get("jd_text", ""),
        company_name=case.get("company_name") or "Acme Co",
        contact=_FAKE_CONTACT,
        role_title=case.get("title"),
        preferences_text=None,
        annotations_text=None,
        critique=None,
    )
    result = await call_model(
        model_slug=model_slug,
        system=COVER_LETTER_SYSTEM,
        user=user_message,
        api_key=api_key,
        max_tokens=_WRITER_MAX_TOKENS,
    )

    # Pull paragraph prose so the judge + human spot-check see
    # comparable artifacts. Different models emit the paragraph list
    # under different keys (paragraphs / body / content) — be lenient
    # so we're evaluating prose quality, not schema obedience.
    paragraphs: list[str] = []
    schema_ok = False
    if isinstance(result.parsed, dict):
        raw_paras = (
            result.parsed.get("paragraphs")
            or result.parsed.get("body")
            or result.parsed.get("content")
            or result.parsed.get("body_paragraphs")
        )
        if isinstance(raw_paras, list):
            for p in raw_paras:
                if isinstance(p, dict):
                    text = (
                        p.get("text")
                        or p.get("content")
                        or p.get("body")
                        or p.get("paragraph")
                    )
                    if isinstance(text, str) and text:
                        paragraphs.append(text)
                elif isinstance(p, str):
                    paragraphs.append(p)
            if paragraphs:
                schema_ok = True
        elif isinstance(raw_paras, str) and raw_paras.strip():
            # A single-string body — split on double-newlines.
            paragraphs = [
                p.strip() for p in raw_paras.split("\n\n") if p.strip()
            ]
            schema_ok = bool(paragraphs)

    return {
        "case_id": case.get("job_posting_id"),
        "title": case.get("title"),
        "model": model_short,
        "model_slug": model_slug,
        "schema_ok": schema_ok,
        "paragraphs": paragraphs,
        "raw_content": result.raw_content,
        "latency_ms": result.latency_ms,
        "cost_usd": result.cost_usd,
        "usage": result.usage,
        "error": result.error,
    }


_JUDGE_SYSTEM = """You are a senior recruiter evaluating cover letters. \
You will receive three anonymized cover letters (Draft A, Draft B, Draft \
C) written for the same job. Score each draft on three axes:

- persuasiveness: does the prose make the candidate sound competitive? \
0=weak/generic, 1=ok, 2=compelling.
- specificity: does the letter cite concrete outcomes/skills from the \
candidate, not vague claims? 0=vague, 1=mixed, 2=evidence-rich.
- jd_alignment: does the letter address what the JD actually asks for? \
0=mostly-generic-self-pitch, 1=partial alignment, 2=tightly aligned.

Also pick a rank order (1 = best, 3 = worst). Ties are allowed (use the \
same rank for tied drafts).

Return JSON matching this exact schema:

{
  "scores": {
    "A": {"persuasiveness": 0-2, "specificity": 0-2, "jd_alignment": 0-2},
    "B": {"persuasiveness": 0-2, "specificity": 0-2, "jd_alignment": 0-2},
    "C": {"persuasiveness": 0-2, "specificity": 0-2, "jd_alignment": 0-2}
  },
  "ranks": {"A": 1-3, "B": 1-3, "C": 1-3},
  "rationale": "1-2 sentences explaining the ranking."
}

Return ONLY the JSON object. No prose around it. No code fences."""


def _judge_user_message(
    *,
    title: str,
    jd_snippet: str,
    drafts: dict[str, list[str]],
) -> str:
    parts = [f"Job title: {title}", "", "Job description (excerpt):", jd_snippet[:2000]]
    for label, paragraphs in drafts.items():
        parts.append("")
        parts.append(f"--- Draft {label} ---")
        for p in paragraphs:
            parts.append(p)
    return "\n".join(parts)


async def _judge_one(
    *,
    case: dict[str, Any],
    triple: dict[str, dict[str, Any]],
    api_key: str,
) -> dict[str, Any]:
    """Run the Opus judge over one (case, three-draft) triple.

    `triple` maps anonymous label (A/B/C) -> writer result dict.
    """
    drafts = {label: r["paragraphs"] for label, r in triple.items()}
    user_message = _judge_user_message(
        title=case.get("title", ""),
        jd_snippet=case.get("jd_text", ""),
        drafts=drafts,
    )
    result = await call_model(
        model_slug=_JUDGE_MODEL_SLUG,
        system=_JUDGE_SYSTEM,
        user=user_message,
        api_key=api_key,
        max_tokens=_JUDGE_MAX_TOKENS,
    )
    return {
        "case_id": case.get("job_posting_id"),
        "title": case.get("title"),
        "judge_model": _JUDGE_MODEL_SLUG,
        "parsed": result.parsed,
        "raw_content_preview": result.raw_content[:400],
        "cost_usd": result.cost_usd,
        "latency_ms": result.latency_ms,
        "error": result.error,
    }


def _build_anon_triples(
    *,
    writer_results: list[dict[str, Any]],
    pairs: list[dict[str, Any]],
    salt: str,
) -> dict[str, dict[str, dict[str, Any]]]:
    """For each case, shuffle the three drafts into A/B/C anonymized
    bins. Returns case_id -> {A: result, B: result, C: result}.
    """
    by_case: dict[str, dict[str, dict[str, Any]]] = {}
    for pair_idx, case in enumerate(pairs):
        cid = case["job_posting_id"]
        results_for_case = [r for r in writer_results if r["case_id"] == cid]
        # Stable per-case shuffle for reproducibility.
        rng = random.Random(f"{salt}|{cid}")
        rng.shuffle(results_for_case)
        labels = ["A", "B", "C"]
        triple: dict[str, dict[str, Any]] = {}
        for label, r in zip(labels, results_for_case, strict=False):
            triple[label] = r
        by_case[cid] = triple
    return by_case


def _write_report(
    *,
    pairs: list[dict[str, Any]],
    writer_results: list[dict[str, Any]],
    triples: dict[str, dict[str, dict[str, Any]]],
    judge_results: list[dict[str, Any]],
    output_base: Path,
) -> None:
    output_base.parent.mkdir(parents=True, exist_ok=True)
    raw_path = output_base.with_suffix(".json")
    md_path = output_base.with_suffix(".md")

    # Build the un-anonymized mapping so the raw JSON keeps the
    # ground truth — the committed MD stays anonymized for the human
    # spot-check.
    raw_path.write_text(
        json.dumps(
            {
                "captured_at_unix": int(time.time()),
                "pairs": pairs,
                "writer_results": writer_results,
                "triples": {
                    cid: {label: r["model"] for label, r in triple.items()}
                    for cid, triple in triples.items()
                },
                "judge_results": judge_results,
            },
            indent=2,
        )
    )

    # Cost aggregates
    cost_by_model: dict[str, float] = {}
    latency_by_model: dict[str, list[int]] = {}
    schema_fail_by_model: dict[str, int] = {}
    for r in writer_results:
        cost_by_model[r["model"]] = cost_by_model.get(r["model"], 0) + r["cost_usd"]
        latency_by_model.setdefault(r["model"], []).append(r["latency_ms"])
        if not r["schema_ok"]:
            schema_fail_by_model[r["model"]] = schema_fail_by_model.get(r["model"], 0) + 1
    judge_cost = sum(j.get("cost_usd", 0.0) for j in judge_results)

    md: list[str] = []
    md.append("# Cover Letter Eval — Sonnet 4.6 vs GPT-5.1 vs Haiku 4.5")
    md.append("")
    md.append("## How to read this")
    md.append("")
    md.append(
        "Each of the 5 sections below shows three anonymized drafts (A, B, C) "
        "for the same job. Read each blind, then pick the strongest. Tie is "
        "allowed. The model->label mapping lives in the raw JSON; do not "
        "open it until you've picked."
    )
    md.append("")
    md.append("## Per-model cost / latency (writer call only)")
    md.append("")
    md.append("| Model | Schema fails | $ total | Avg latency |")
    md.append("| --- | --- | --- | --- |")
    for m in _WRITER_MODELS:
        md.append(
            f"| {m} | {schema_fail_by_model.get(m, 0)} | "
            f"${cost_by_model.get(m, 0):.4f} | "
            f"{int(sum(latency_by_model.get(m, [0])) / max(1, len(latency_by_model.get(m, [1]))))}ms |"
        )
    md.append(
        f"\nJudge (Opus 4.7) total cost: **${judge_cost:.4f}**."
    )
    md.append("")

    # Judge findings, anonymized.
    md.append("## Judge scores (Opus 4.7, anonymized A/B/C)")
    md.append("")
    judge_by_case = {j["case_id"]: j for j in judge_results}
    md.append("| Case | Title | A rank | B rank | C rank | Sum scores A | B | C |")
    md.append("| --- | --- | --- | --- | --- | --- | --- | --- |")
    for case in pairs:
        cid = case["job_posting_id"]
        j = judge_by_case.get(cid)
        if not j or not j.get("parsed"):
            md.append(f"| {cid[:8]} | {(case.get('title') or '')[:40]} | — | — | — | — | — | — |")
            continue
        parsed = j["parsed"]
        ranks = parsed.get("ranks", {})
        scores = parsed.get("scores", {})
        def _sum(label: str) -> str:
            s = scores.get(label) or {}
            try:
                return str(
                    int(s.get("persuasiveness", 0))
                    + int(s.get("specificity", 0))
                    + int(s.get("jd_alignment", 0))
                )
            except (TypeError, ValueError):
                return "?"
        md.append(
            f"| {cid[:8]} | {(case.get('title') or '')[:40]} | "
            f"{ranks.get('A', '?')} | {ranks.get('B', '?')} | "
            f"{ranks.get('C', '?')} | {_sum('A')} | {_sum('B')} | {_sum('C')} |"
        )
    md.append("")

    # The anonymized drafts themselves — the load-bearing artifact for
    # Daniel's blind pick.
    md.append("## Anonymized drafts (please pick)")
    md.append("")
    for pair_idx, case in enumerate(pairs, start=1):
        cid = case["job_posting_id"]
        triple = triples.get(cid, {})
        md.append(f"### Case {pair_idx}: {case.get('title')}")
        md.append(f"_Job posting id (for raw-JSON cross-reference):_ `{cid}`")
        md.append("")
        jd_snip = (case.get("jd_text") or "")[:800].strip()
        if jd_snip:
            md.append("**JD excerpt:**")
            md.append("")
            md.append("> " + jd_snip.replace("\n", "\n> "))
            md.append("")
        for label in ("A", "B", "C"):
            r = triple.get(label)
            if not r:
                md.append(f"#### Draft {label} — _missing_")
                md.append("")
                continue
            md.append(f"#### Draft {label}")
            md.append("")
            if r.get("paragraphs"):
                for p in r["paragraphs"]:
                    md.append(p)
                    md.append("")
            else:
                md.append("_(schema fail — see raw JSON)_")
                md.append("")
        if cid in (j.get("case_id") for j in judge_results):
            j = judge_by_case.get(cid)
            if j and j.get("parsed"):
                rationale = (j["parsed"].get("rationale") or "")[:400]
                if rationale:
                    md.append(f"**Judge rationale:** {rationale}")
                    md.append("")
        md.append("---")
        md.append("")

    md_path.write_text("\n".join(md))
    logger.info("Wrote %s", raw_path)
    logger.info("Wrote %s", md_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pairs", type=int, default=5)
    parser.add_argument("--skip-judge", action="store_true")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    fixture = _load_fixture()
    payload = _first_payload(fixture)
    pairs = _pick_pairs(fixture, n=args.pairs)
    api_key = get_api_key()

    ts = time.strftime("%Y%m%dT%H%M%S")
    base = (
        Path(args.output)
        if args.output
        else (_RESULTS_DIR / f"eval_cover_letter_{ts}")
    )
    base.parent.mkdir(parents=True, exist_ok=True)
    inflight = base.with_suffix(".inflight.json")

    logger.info(
        "Cover letter eval: %d pairs × %d writer models = %d gen calls",
        len(pairs),
        len(_WRITER_MODELS),
        len(pairs) * len(_WRITER_MODELS),
    )

    # ----- Writer pass --------------------------------------------------
    sem = asyncio.Semaphore(args.concurrency)
    writer_jobs = [
        (case, short, slug)
        for case in pairs
        for short, slug in _WRITER_MODELS.items()
    ]

    async def _writer_bounded(job: tuple[dict[str, Any], str, str]) -> dict[str, Any]:
        case, short, slug = job
        async with sem:
            return await _write_one(
                payload=payload,
                case=case,
                model_short=short,
                model_slug=slug,
                api_key=api_key,
            )

    async def _run_all() -> list[dict[str, Any]]:
        writer_results: list[dict[str, Any]] = []
        pending = {asyncio.create_task(_writer_bounded(j)) for j in writer_jobs}
        completed = 0
        while pending:
            done, pending = await asyncio.wait(
                pending, return_when=asyncio.FIRST_COMPLETED
            )
            for t in done:
                writer_results.append(t.result())
                completed += 1
                inflight.write_text(
                    json.dumps(
                        {
                            "completed": completed,
                            "total": len(writer_jobs),
                            "phase": "writer",
                            "results_so_far": writer_results,
                        },
                        indent=2,
                    )
                )
                logger.info(
                    "Writer progress: %d/%d", completed, len(writer_jobs)
                )
        return writer_results

    writer_results = asyncio.run(_run_all())

    triples = _build_anon_triples(
        writer_results=writer_results, pairs=pairs, salt="cover-letter-eval"
    )

    # ----- Judge pass ---------------------------------------------------
    judge_results: list[dict[str, Any]] = []
    if not args.skip_judge:
        async def _judge_all() -> list[dict[str, Any]]:
            out: list[dict[str, Any]] = []
            sem2 = asyncio.Semaphore(min(3, args.concurrency))

            async def _bounded(case: dict[str, Any]) -> dict[str, Any]:
                async with sem2:
                    return await _judge_one(
                        case=case,
                        triple=triples[case["job_posting_id"]],
                        api_key=api_key,
                    )

            pending = {asyncio.create_task(_bounded(c)) for c in pairs}
            completed = 0
            while pending:
                done, pending = await asyncio.wait(
                    pending, return_when=asyncio.FIRST_COMPLETED
                )
                for t in done:
                    out.append(t.result())
                    completed += 1
                    logger.info("Judge progress: %d/%d", completed, len(pairs))
            return out

        judge_results = asyncio.run(_judge_all())

    _write_report(
        pairs=pairs,
        writer_results=writer_results,
        triples=triples,
        judge_results=judge_results,
        output_base=base,
    )


if __name__ == "__main__":
    main()
