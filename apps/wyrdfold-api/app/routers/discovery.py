"""Cron-facing bulk source discovery.

The per-target endpoint (``/targets/{id}/discover-sources``) is JWT-gated
and operator-triggered. This router is the API-key-gated counterpart for
scheduled callers (pg_cron, GitHub Actions, Railway cron) — it walks every
active target and runs discovery for each, so new boards keep appearing
without anyone pressing a button.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from supabase import Client

from app.dependencies import get_supabase, verify_api_key
from app.services.source_discovery import DiscoveryRunStats, run_discovery_for_target
from app.services.targets import crud

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/discovery", tags=["discovery"], dependencies=[Depends(verify_api_key)]
)


class BulkDiscoveryResult(BaseModel):
    """Aggregate of one discovery pass across all active targets."""

    targets_processed: int = 0
    queries_issued: int = 0
    urls_examined: int = 0
    inserted: int = 0
    duplicates: int = 0
    unclassified: int = 0
    filtered: int = 0
    errors: list[str] = Field(default_factory=list)
    per_target: list[DiscoveryRunStats] = Field(default_factory=list)


@router.post("/run", response_model=BulkDiscoveryResult)
async def run_discovery_all_targets(
    supabase: Client = Depends(get_supabase),
) -> BulkDiscoveryResult:
    """Run source discovery for every active target, sequentially.

    Sequential on purpose: each per-target run already fans its Brave
    queries out under an internal semaphore, and the per-run query cap
    applies per target — running targets concurrently would multiply the
    burst against Brave's rate limit without finishing meaningfully
    sooner. A failed target is recorded and skipped; the rest still run.
    """
    targets = crud.get_active(supabase)
    result = BulkDiscoveryResult()

    for target in targets:
        try:
            stats = await run_discovery_for_target(supabase, target)
        except Exception:
            logger.exception("bulk discovery failed for target %s", target.id)
            result.errors.append(f"{target.id}: discovery failed")
            continue
        result.targets_processed += 1
        result.queries_issued += stats.queries_issued
        result.urls_examined += stats.urls_examined
        result.inserted += stats.inserted
        result.duplicates += stats.duplicates
        result.unclassified += stats.unclassified
        result.filtered += stats.filtered
        result.per_target.append(stats)

    logger.info(
        "bulk discovery: %d targets, %d queries, %d inserted, %d errors",
        result.targets_processed,
        result.queries_issued,
        result.inserted,
        len(result.errors),
    )
    return result
