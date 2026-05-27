"""One-off: wipe a single user's onboarding state for a clean-slate test.

Deletes (per-user_id):
  - documents (resumes + cover letters)
  - document_versions (cascade-safe via FK; do explicitly for safety)
  - scores rows for any of the user's user_targets
  - status_log rows for postings scored under the user's user_targets
  - user_targets
  - optimized_doc rows
  - experience_prose rows
  - conversation rows (onboarding chat history)

Resets (per-user-touched postings) on the shared ``jobs`` table:
  - jobs.status -> 'new' for any posting that had a non-'new' status
    via the user's actions. (jobs is a shared catalog; we don't
    delete shared rows here. The poller will rediscover them.)

Does NOT touch:
  - auth.users (the account stays)
  - user_profiles (identity / notification prefs)
  - targets (the shared catalog of role profiles)
  - sources, jobs catalog rows (other users may rely on them)

Usage:
    cd apps/wyrdfold-api && uv run python scripts/wipe_user_data.py <user_id>

Run with --dry-run to print counts without deleting.
"""

from __future__ import annotations

import argparse
import logging
import sys
from typing import Any, cast

from app.supabase_pool import get_supabase_pool, init_supabase

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("wipe")


def _count(supabase: Any, table: str, **filters: Any) -> int:
    q = supabase.table(table).select("id", count="exact")
    for k, v in filters.items():
        q = q.eq(k, v)
    resp = q.execute()
    return resp.count or 0


def _delete(supabase: Any, table: str, dry_run: bool, **filters: Any) -> int:
    """Delete rows matching filters, return deleted count.

    ``dry_run=True`` only reports the count without mutating.
    """
    count = _count(supabase, table, **filters)
    if dry_run or count == 0:
        return count
    q = supabase.table(table).delete()
    for k, v in filters.items():
        q = q.eq(k, v)
    q.execute()
    return count


def wipe(user_id: str, dry_run: bool) -> None:
    init_supabase()
    supabase = get_supabase_pool()
    if supabase is None:
        raise RuntimeError("Supabase not configured — check .env")
    sb: Any = supabase

    prefix = "[dry-run] would delete" if dry_run else "deleted"

    # 1. Resolve the user's user_targets so we can scope scores + status_log
    ut_resp = sb.table("user_targets").select("id, target_id").eq(
        "user_id", user_id
    ).execute()
    ut_rows = cast(list[dict[str, Any]], ut_resp.data or [])
    user_target_ids = [r["id"] for r in ut_rows]
    target_ids = list({r["target_id"] for r in ut_rows})
    logger.info(
        "found %d user_targets (%d distinct target_ids) for user %s",
        len(user_target_ids),
        len(target_ids),
        user_id,
    )

    # 2. Find postings scored under those user_targets so we can reset
    #    status. ``status_log`` rows are also scoped to those postings.
    posting_ids: list[str] = []
    if target_ids:
        scores_resp = (
            sb.table("scores")
            .select("job_posting_id")
            .in_("target_id", target_ids)
            .execute()
        )
        posting_ids = list({
            r["job_posting_id"]
            for r in cast(list[dict[str, Any]], scores_resp.data or [])
        })
    logger.info("user touched %d distinct postings (via scores)", len(posting_ids))

    # 3. Tailored docs — ON DELETE CASCADE on ``document_versions.resume_id``
    #    (the column wasn't renamed when the table moved from
    #    ``tailored_resume_versions``) handles version rows automatically.
    n = _delete(sb, "documents", dry_run, user_id=user_id)
    logger.info("%s %d documents (versions cascade)", prefix, n)

    # 4. Scores rows for the user's targets.
    if target_ids:
        scores_count = (
            sb.table("scores")
            .select("job_posting_id", count="exact")
            .in_("target_id", target_ids)
            .execute()
            .count
            or 0
        )
        if not dry_run:
            sb.table("scores").delete().in_("target_id", target_ids).execute()
        logger.info("%s %d scores rows", prefix, scores_count)

    # 5. status_log rows for postings the user touched.
    if posting_ids:
        sl_count = (
            sb.table("status_log")
            .select("id", count="exact")
            .in_("posting_id", posting_ids)
            .execute()
            .count
            or 0
        )
        if not dry_run:
            sb.table("status_log").delete().in_(
                "posting_id", posting_ids
            ).execute()
        logger.info("%s %d status_log rows", prefix, sl_count)

    # 6. Reset jobs.status for the touched postings (shared catalog).
    if posting_ids:
        if not dry_run:
            sb.table("jobs").update({"status": "new"}).in_(
                "id", posting_ids
            ).execute()
        logger.info(
            "%s reset %d jobs.status -> 'new' (shared catalog rows)",
            "would" if dry_run else "did",
            len(posting_ids),
        )

    # 7. user_targets, optimized_doc, experience_prose, conversations,
    #    analyses (per-user LLM analysis cache).
    n = _delete(sb, "user_targets", dry_run, user_id=user_id)
    logger.info("%s %d user_targets rows", prefix, n)

    n = _delete(sb, "experience_optimized_docs", dry_run, user_id=user_id)
    logger.info("%s %d experience_optimized_docs rows", prefix, n)

    n = _delete(sb, "experience_prose_docs", dry_run, user_id=user_id)
    logger.info("%s %d experience_prose_docs rows", prefix, n)

    n = _delete(sb, "experience_conversation_turns", dry_run, user_id=user_id)
    logger.info("%s %d experience_conversation_turns rows", prefix, n)

    n = _delete(sb, "analyses", dry_run, user_id=user_id)
    logger.info("%s %d analyses rows", prefix, n)

    logger.info("%s wipe complete for user %s", "dry-run" if dry_run else "done:", user_id)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("user_id", help="Supabase auth user id (UUID)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    wipe(args.user_id, args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
