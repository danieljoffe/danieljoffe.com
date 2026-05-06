"""Backfill payload_md for documents rows that predate the markdown pivot.

Markdown is now the source of truth for the editor and the pandoc-rendered
.docx. Older rows have only the structured `payload` JSONB. This script
walks them, serializes via the canonical markdown helpers, and writes
payload_md back. The docx_payload_md_hash stays NULL so the next download
re-renders via pandoc and atomically caches the result.

Idempotent: only touches rows where payload_md IS NULL. Safe to re-run.
Per-row try/except keeps one bad payload from blocking the rest.

Usage:
    cd apps/wyrdfold-api && uv run python scripts/backfill_payload_md.py
    cd apps/wyrdfold-api && uv run python scripts/backfill_payload_md.py --dry-run
"""

from __future__ import annotations

import argparse
import logging
from typing import Any, cast

from app.models.tailor import TailoredCoverLetter, TailoredResume
from app.services.tailor.markdown_render import (
    to_markdown,
    to_markdown_cover_letter,
)
from app.supabase_pool import get_supabase_pool, init_supabase

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("backfill_payload_md")

TABLE = "documents"


def _serialize(row: dict[str, Any]) -> str:
    payload = row.get("payload") or {}
    document_type = row.get("document_type") or "resume"
    if document_type == "cover_letter":
        return to_markdown_cover_letter(TailoredCoverLetter.model_validate(payload))
    return to_markdown(TailoredResume.model_validate(payload))


def backfill(*, dry_run: bool) -> tuple[int, int]:
    """Returns (updated, failed)."""
    init_supabase()
    supabase = get_supabase_pool()
    if supabase is None:
        raise RuntimeError("Supabase not configured — check .env")

    resp = (
        supabase.table(TABLE)
        .select("id, document_type, payload")
        .is_("payload_md", "null")
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    logger.info("Found %d row(s) with NULL payload_md", len(rows))

    updated = 0
    failed = 0
    for row in rows:
        rid = row["id"]
        try:
            markdown = _serialize(row)
        except Exception as exc:
            failed += 1
            logger.warning("skip %s: %s", rid, exc)
            continue

        if dry_run:
            updated += 1
            logger.info("would update %s (%d chars)", rid, len(markdown))
            continue

        try:
            supabase.table(TABLE).update({"payload_md": markdown}).eq(
                "id", rid
            ).execute()
            updated += 1
            logger.info("updated %s (%d chars)", rid, len(markdown))
        except Exception as exc:
            failed += 1
            logger.warning("write failed for %s: %s", rid, exc)

    logger.info("done — updated=%d failed=%d", updated, failed)
    return updated, failed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be updated without writing.",
    )
    args = parser.parse_args()
    backfill(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
