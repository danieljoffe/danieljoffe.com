"""Investigate Phase 2's top-of-scale compression (max scores stuck at ~78-82).

Read-only. For each active target, dumps:

  1. The top 10 graded jobs with full axis breakdown + reasoning text.
  2. "Under-graded candidates" — rows where every individual axis is >= 65
     but the overall score is < 80. If Sonnet is averaging-down or
     applying a hidden ceiling, these are where it would show up.
  3. Score-band density at the top: how many jobs at 70-74, 75-79, 80-84,
     85+ per target. A genuine ceiling at 82 should look like a cliff.
  4. Per-target axis-score histograms restricted to the >= 70 overall band
     — so we can see whether top-band rows are constrained on ONE axis or
     all of them.

No LLM calls (deferred until human reviews the dump and decides whether a
prompt experiment is warranted).

Output: ``scripts/.audit-logs/score-ceiling-{utc-ts}.md`` — markdown,
copy-pasteable into a findings note.

Usage::

    cd apps/wyrdfold-api
    uv run python -m scripts.investigate_score_ceiling
"""

from __future__ import annotations

import logging
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

from app.services.targets.crud import get_active as get_active_targets
from app.supabase_pool import get_supabase_pool, init_supabase

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("score_ceiling")

AXES = ("title_fit", "skills_fit", "seniority_fit", "domain_fit")
_LOG_DIR = Path(__file__).parent / ".audit-logs"
_PAGE = 1000


def _fetch_complete(sb: Any, target_id: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        resp = (
            sb.table("scores")
            .select("job_posting_id, score, axis_scores, fit_reasoning")
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


def _hydrate_titles(sb: Any, job_ids: list[str]) -> dict[str, tuple[str, str]]:
    """Returns ``{job_id: (title, company_name)}`` for the given ids."""
    out: dict[str, tuple[str, str]] = {}
    if not job_ids:
        return out
    for i in range(0, len(job_ids), 500):
        chunk = job_ids[i : i + 500]
        resp = sb.table("jobs").select("id, title, company_name").in_("id", chunk).execute()
        for r in cast(list[dict[str, Any]], resp.data or []):
            out[r["id"]] = (r.get("title", "?"), r.get("company_name", "?"))
    return out


def _bandlabel(score: int) -> str:
    if score >= 85:
        return "85+"
    if score >= 80:
        return "80-84"
    if score >= 75:
        return "75-79"
    if score >= 70:
        return "70-74"
    if score >= 65:
        return "65-69"
    return "<65"


def _emit_target(sb: Any, target: Any, fh: Any) -> None:
    fh.write(f"\n## {target.label}\n\n")
    fh.write(f"target_id: `{target.id}`  profile_version: `{target.profile_version}`\n\n")

    rows = _fetch_complete(sb, target.id)
    n = len(rows)
    if n == 0:
        fh.write("_No Phase-2-graded rows yet._\n")
        return

    # ---- Top-band density ----
    bands = Counter(_bandlabel(int(r["score"])) for r in rows)
    fh.write("### Top-band density\n\n")
    fh.write("| Band | Count | % of graded |\n|---|---:|---:|\n")
    for band in ("85+", "80-84", "75-79", "70-74", "65-69"):
        c = bands.get(band, 0)
        fh.write(f"| {band} | {c} | {100 * c / n:.1f}% |\n")
    fh.write(f"\n_n graded = {n}; max overall = {max(int(r['score']) for r in rows)}_\n")

    # ---- Top 10 with full breakdown ----
    rows_sorted = sorted(rows, key=lambda r: -int(r["score"]))[:10]
    titles = _hydrate_titles(sb, [r["job_posting_id"] for r in rows_sorted])
    fh.write("\n### Top 10 by overall score\n\n")
    for r in rows_sorted:
        jid = r["job_posting_id"]
        title, company = titles.get(jid, ("?", "?"))
        ax = r["axis_scores"] or {}
        fh.write(
            f"- **{int(r['score'])}** "
            f"T{ax.get('title_fit', '–'):>3} "
            f"S{ax.get('skills_fit', '–'):>3} "
            f"Sn{ax.get('seniority_fit', '–'):>3} "
            f"D{ax.get('domain_fit', '–'):>3} — "
            f"{title} @ {company}\n"
        )
        if r.get("fit_reasoning"):
            fh.write(f"  > {r['fit_reasoning']}\n")

    # ---- Under-graded candidates (every axis >= 65 but overall < 80) ----
    under = [
        r for r in rows
        if int(r["score"]) < 80
        and r.get("axis_scores")
        and all(
            isinstance(r["axis_scores"].get(a), int) and r["axis_scores"][a] >= 65
            for a in AXES
        )
    ]
    fh.write(f"\n### Under-graded candidates ({len(under)})\n\n")
    fh.write("_Every axis ≥ 65 but overall < 80. If Sonnet is averaging-down or "
             "applying a hidden ceiling, these are the cases worth re-grading._\n\n")
    if not under:
        fh.write("_None — no under-graded rows fit the criteria._\n")
    else:
        under_titles = _hydrate_titles(sb, [r["job_posting_id"] for r in under])
        for r in sorted(under, key=lambda r: -int(r["score"]))[:10]:
            jid = r["job_posting_id"]
            title, company = under_titles.get(jid, ("?", "?"))
            ax = r["axis_scores"]
            fh.write(
                f"- **{int(r['score'])}** "
                f"T{ax.get('title_fit'):>3} S{ax.get('skills_fit'):>3} "
                f"Sn{ax.get('seniority_fit'):>3} D{ax.get('domain_fit'):>3} — "
                f"{title} @ {company}\n"
            )
            if r.get("fit_reasoning"):
                fh.write(f"  > {r['fit_reasoning'][:300]}...\n")

    # ---- Axis distribution restricted to top band (>= 70 overall) ----
    top_band = [r for r in rows if int(r["score"]) >= 70]
    fh.write(f"\n### Axis values within top band (overall ≥ 70, n={len(top_band)})\n\n")
    if not top_band:
        fh.write("_No rows in top band._\n")
    else:
        fh.write("| axis | min | max | min row count |\n|---|---:|---:|---:|\n")
        for a in AXES:
            vals = [r["axis_scores"].get(a) for r in top_band if r.get("axis_scores")]
            vals = [v for v in vals if isinstance(v, int)]
            if not vals:
                continue
            mn, mx = min(vals), max(vals)
            at_min = sum(1 for v in vals if v == mn)
            fh.write(f"| {a} | {mn} | {mx} | {at_min} (rows at min) |\n")


def main() -> None:
    init_supabase()
    sb = get_supabase_pool()
    if sb is None:
        raise RuntimeError("Supabase not configured — check .env")

    _LOG_DIR.mkdir(parents=True, exist_ok=True)
    out_path = _LOG_DIR / f"score-ceiling-{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}.md"

    with out_path.open("w") as fh:
        fh.write("# Phase 2 top-score compression — investigation dump\n\n")
        fh.write(f"_Generated {datetime.now(UTC).isoformat()}_\n\n")
        fh.write(
            "**Hypothesis being tested:** Phase 2 caps overall scores around 78-82 "
            "even on jobs that score 75+ on every individual axis. Either (a) the "
            "system prompt's anchor examples lead the LLM toward sub-85 "
            "averages, (b) the LLM is applying a hidden 'no job is truly perfect' "
            "ceiling, or (c) there genuinely aren't any 85+ jobs in the current "
            "pool and we're seeing honest behavior.\n\n"
            "Each per-target section dumps:\n"
            "  - Top-band density (how many jobs in each 5-point band from 65 up)\n"
            "  - Top 10 with full axis breakdown + reasoning\n"
            "  - 'Under-graded candidates': every axis >= 65 but overall < 80\n"
            "  - Axis-value envelope within the >= 70 band\n"
        )

        targets = get_active_targets(sb)
        logger.info("Investigating %d active target(s) -> %s", len(targets), out_path)
        for t in targets:
            logger.info("  > %s (%s)", t.label, t.id[:8])
            _emit_target(sb, t, fh)

    logger.info("\nDump written to %s", out_path)
    logger.info("Next: human reviews the under-graded candidates section per target.")


if __name__ == "__main__":
    main()
