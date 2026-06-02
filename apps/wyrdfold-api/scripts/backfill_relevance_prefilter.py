"""Backfill embeddings + exclude cosine-failing scores rows.

PR #780 added the ingestion-time relevance pre-filter so every NEW job
gets its title embedded and gated against active target labels. The
~8k rows already in ``jobs`` from before that PR never got embedded, so
the gate doesn't help with them — Melissa's "Director of CX Operations
& Transformation" target still shows 287 pages of off-topic noise.

This script runs the gate retroactively:

1. Back-fill ``targets.label_embedding`` for any target that's missing
   one (mirrors the lazy back-fill in ``prepare_prefilter``).
2. Back-fill ``jobs.title_embedding`` for every job whose column is NULL.
3. For each ``scores`` row whose target has a label embedding AND whose
   job has a title embedding, mark ``excluded=true`` when the cosine
   sits below ``PREFILTER_THRESHOLD``.

Idempotent — only touches rows that need it. Safe to re-run after a
partial failure: previously-embedded rows are skipped, previously-
excluded rows aren't touched (we never flip excluded back to false; the
poller's gate is what gates new rows).

Usage::

    cd apps/wyrdfold-api
    uv run python scripts/backfill_relevance_prefilter.py --dry-run
    uv run python scripts/backfill_relevance_prefilter.py --target-id <uuid>
    uv run python scripts/backfill_relevance_prefilter.py
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from typing import Any, cast

from supabase import Client

from app.config import settings
from app.services.embeddings import get_default_client
from app.services.llm.cost_log import record_embedding
from app.services.relevance_prefilter import (
    PREFILTER_MODEL,
    PREFILTER_THRESHOLD,
    cosine_similarity,
)
from app.supabase_pool import get_supabase_pool, init_supabase

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("backfill_prefilter")

# Page size for Supabase ``range()`` reads. PostgREST caps single-row
# response sizes; 1000 is well within limits and minimises round trips.
PAGE_SIZE = 1000

# How many job-title updates we batch before reporting progress. The
# Voyage client parallelises internally (128 inputs per sub-call), but
# the per-row UPDATEs are sequential — keep the chunk small enough that
# a partial failure doesn't lose much work.
UPDATE_BATCH = 200


def _parse_pgvector(value: Any) -> list[float] | None:
    """PostgREST returns ``vector(N)`` columns as either a JSON list or a
    Postgres-style ``"[0.1,0.2,...]"`` string depending on encoder
    configuration. Normalise both to a plain ``list[float]`` so callers
    can ``cosine_similarity`` without caring.
    """
    if value is None:
        return None
    if isinstance(value, list):
        return [float(x) for x in value]
    if isinstance(value, str):
        s = value.strip().lstrip("[").rstrip("]")
        if not s:
            return None
        return [float(x) for x in s.split(",")]
    return None


async def backfill_target_label_embeddings(
    supabase: Client, *, dry_run: bool
) -> dict[str, list[float]]:
    """Ensure every target has ``label_embedding``. Returns
    ``{target_id: embedding}`` for every target that ends up with one
    (newly back-filled or already present).
    """
    resp = supabase.table("targets").select("id, label, label_embedding").execute()
    rows = cast(list[dict[str, Any]], resp.data or [])

    needs_embed = [r for r in rows if _parse_pgvector(r.get("label_embedding")) is None]
    logger.info(
        "targets: %d total, %d need label_embedding backfill",
        len(rows),
        len(needs_embed),
    )

    if needs_embed and not dry_run:
        client = get_default_client()
        labels = [r["label"] for r in needs_embed]
        result = await client.embed(
            model=PREFILTER_MODEL,
            inputs=labels,
            purpose="embed.target_label.backfill",
        )
        try:
            record_embedding(
                supabase,
                user_id=None,
                purpose="embed.target_label.backfill",
                result=result,
            )
        except Exception:
            logger.exception("cost log failed (target labels)")

        for row, embed in zip(needs_embed, result.embeddings, strict=False):
            embed_list = list(embed)
            try:
                supabase.table("targets").update(
                    {"label_embedding": embed_list}
                ).eq("id", row["id"]).execute()
                row["label_embedding"] = embed_list
            except Exception:
                logger.exception(
                    "failed to persist label_embedding for target %s", row["id"]
                )

    out: dict[str, list[float]] = {}
    for r in rows:
        parsed = _parse_pgvector(r.get("label_embedding"))
        if parsed is not None:
            out[r["id"]] = parsed
    logger.info("targets with label_embedding available: %d", len(out))
    return out


async def backfill_job_title_embeddings(
    supabase: Client, *, dry_run: bool
) -> dict[str, list[float]]:
    """Embed every ``jobs`` row whose ``title_embedding`` is NULL. Returns
    ``{job_id: embedding}`` for rows back-filled in this run; rows that
    were already populated are NOT in the dict (the cosine pass loads
    those lazily so we don't pay for a full-table read up front).
    """
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        resp = (
            supabase.table("jobs")
            .select("id, title")
            .is_("title_embedding", "null")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        page = cast(list[dict[str, Any]], resp.data or [])
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    logger.info("jobs needing title_embedding backfill: %d", len(rows))
    if dry_run or not rows:
        return {}

    client = get_default_client()
    out: dict[str, list[float]] = {}

    for start in range(0, len(rows), UPDATE_BATCH):
        chunk = rows[start : start + UPDATE_BATCH]
        # Voyage rejects empty/whitespace-only strings. Drop them from the
        # request payload and preserve positional mapping so the embeddings
        # land on the right jobs.
        sanitized = [(j["id"], (j.get("title") or "").strip()) for j in chunk]
        payload = [t for _, t in sanitized if t]
        if not payload:
            continue

        result = await client.embed(
            model=PREFILTER_MODEL,
            inputs=payload,
            purpose="embed.job_title.backfill",
        )
        try:
            record_embedding(
                supabase,
                user_id=None,
                purpose="embed.job_title.backfill",
                result=result,
            )
        except Exception:
            logger.exception("cost log failed (job titles)")

        it = iter(result.embeddings)
        for job_id, title in sanitized:
            if not title:
                continue
            embed = list(next(it))
            try:
                supabase.table("jobs").update(
                    {"title_embedding": embed}
                ).eq("id", job_id).execute()
                out[job_id] = embed
            except Exception:
                logger.exception(
                    "failed to persist title_embedding for job %s", job_id
                )

        logger.info(
            "  embedded %d/%d jobs (%.1f%%)",
            min(start + UPDATE_BATCH, len(rows)),
            len(rows),
            100.0 * min(start + UPDATE_BATCH, len(rows)) / len(rows),
        )

    return out


def exclude_cosine_failures(
    supabase: Client,
    *,
    target_embeds: dict[str, list[float]],
    job_embeds: dict[str, list[float]],
    threshold: float,
    target_id_filter: str | None,
    dry_run: bool,
) -> dict[str, int]:
    """For each non-excluded ``scores`` row whose (target, job) pair has
    embeddings on both sides AND cosine < ``threshold``, set
    ``excluded=true``. Never flips ``excluded`` back to false.
    """
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        # Rebuild each iteration — PostgREST builder methods accumulate
        # URL params rather than replacing them, so reusing one builder
        # across paged ``.range()`` calls produces ``?offset=0&offset=1000&...``
        # and a 400 once the URL exceeds the row-count limit.
        query = (
            supabase.table("scores")
            .select("id, job_posting_id, target_id")
            .eq("excluded", False)
        )
        if target_id_filter:
            query = query.eq("target_id", target_id_filter)
        resp = query.range(offset, offset + PAGE_SIZE - 1).execute()
        page = cast(list[dict[str, Any]], resp.data or [])
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    logger.info("non-excluded scores rows to evaluate: %d", len(rows))

    # Lazy-load title_embedding for jobs we don't already have in memory
    # (rows back-filled in this run are pre-populated by step 2; the rest
    # were already embedded by a prior backfill or by the poller).
    missing = list({r["job_posting_id"] for r in rows} - set(job_embeds))
    if missing:
        logger.info(
            "loading title_embedding for %d jobs not seen in this run", len(missing)
        )
        # PostgREST encodes ``in_`` as ``id=in.(uuid1,uuid2,...)``.
        # 1000 UUIDs ~= 36 KB, well past typical proxy URL limits
        # (8-16 KB). 100 UUIDs is ~3.6 KB, comfortably under.
        in_chunk = 100
        for i in range(0, len(missing), in_chunk):
            chunk_ids = missing[i : i + in_chunk]
            resp = (
                supabase.table("jobs")
                .select("id, title_embedding")
                .in_("id", chunk_ids)
                .execute()
            )
            for j in cast(list[dict[str, Any]], resp.data or []):
                embed = _parse_pgvector(j.get("title_embedding"))
                if embed is not None:
                    job_embeds[j["id"]] = embed

    to_exclude: list[str] = []
    no_target_embed = 0
    no_job_embed = 0
    for r in rows:
        t_embed = target_embeds.get(r["target_id"])
        j_embed = job_embeds.get(r["job_posting_id"])
        if t_embed is None:
            no_target_embed += 1
            continue
        if j_embed is None:
            no_job_embed += 1
            continue
        if cosine_similarity(t_embed, j_embed) < threshold:
            to_exclude.append(r["id"])

    logger.info(
        "would exclude %d / %d scores rows (skipped: no_target_embed=%d, no_job_embed=%d)",
        len(to_exclude),
        len(rows),
        no_target_embed,
        no_job_embed,
    )

    if not dry_run and to_exclude:
        for i in range(0, len(to_exclude), 500):
            chunk = to_exclude[i : i + 500]
            try:
                supabase.table("scores").update({"excluded": True}).in_(
                    "id", chunk
                ).execute()
            except Exception:
                logger.exception("failed to mark scores excluded (chunk %d)", i)
            logger.info(
                "  excluded %d/%d", min(i + 500, len(to_exclude)), len(to_exclude)
            )

    return {
        "evaluated": len(rows),
        "to_exclude": len(to_exclude),
        "no_target_embed": no_target_embed,
        "no_job_embed": no_job_embed,
    }


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report counts without writing to the DB.",
    )
    parser.add_argument(
        "--target-id",
        help=(
            "Only evaluate scores for this target_id. Embeddings are still "
            "back-filled for all targets/jobs."
        ),
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=PREFILTER_THRESHOLD,
        help=f"Cosine threshold below which to exclude. Default {PREFILTER_THRESHOLD}.",
    )
    parser.add_argument(
        "--skip-target-embed",
        action="store_true",
        help="Skip step 1 (target label backfill).",
    )
    parser.add_argument(
        "--skip-job-embed",
        action="store_true",
        help="Skip step 2 (job title backfill).",
    )
    parser.add_argument(
        "--skip-exclude",
        action="store_true",
        help="Skip step 3 (mark scores excluded). Useful for embedding-only runs.",
    )
    args = parser.parse_args()

    if settings.embeddings_provider != "voyage":
        raise SystemExit(
            "ERROR: EMBEDDINGS_PROVIDER must be 'voyage' (currently "
            f"{settings.embeddings_provider!r}). Aborting to avoid writing "
            "mock embeddings to the DB."
        )

    init_supabase()
    supabase = get_supabase_pool()
    if supabase is None:
        raise SystemExit(
            "ERROR: Supabase not configured — check SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in apps/wyrdfold-api/.env"
        )

    logger.info("dry_run=%s target_id=%s threshold=%s",
                args.dry_run, args.target_id, args.threshold)
    logger.info("---")

    target_embeds: dict[str, list[float]] = {}
    job_embeds: dict[str, list[float]] = {}

    if not args.skip_target_embed:
        logger.info(">> step 1: backfill target.label_embedding")
        target_embeds = await backfill_target_label_embeddings(
            supabase, dry_run=args.dry_run
        )
    else:
        logger.info(">> step 1: skipped")
        # Still load existing target embeds so step 3 can run.
        resp = supabase.table("targets").select("id, label_embedding").execute()
        for r in cast(list[dict[str, Any]], resp.data or []):
            embed = _parse_pgvector(r.get("label_embedding"))
            if embed is not None:
                target_embeds[r["id"]] = embed

    if not args.skip_job_embed:
        logger.info(">> step 2: backfill jobs.title_embedding")
        job_embeds = await backfill_job_title_embeddings(supabase, dry_run=args.dry_run)
    else:
        logger.info(">> step 2: skipped")

    if not args.skip_exclude:
        logger.info(">> step 3: mark cosine-failing scores rows as excluded")
        summary = exclude_cosine_failures(
            supabase,
            target_embeds=target_embeds,
            job_embeds=job_embeds,
            threshold=args.threshold,
            target_id_filter=args.target_id,
            dry_run=args.dry_run,
        )
        logger.info("summary: %s", summary)
    else:
        logger.info(">> step 3: skipped")


if __name__ == "__main__":
    asyncio.run(main())
