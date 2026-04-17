import asyncio
import logging
from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.config import settings
from app.models.schemas import PollResult
from app.seed.keyword_config import keyword_config
from app.services.greenhouse import fetch_board_jobs
from app.services.sanitize import sanitize_html
from app.services.scoring import score_job

logger = logging.getLogger(__name__)


def _title_matches_any_role(title: str) -> bool:
    title_lower = title.lower()
    all_titles = (
        keyword_config.role_titles.high
        + keyword_config.role_titles.medium
        + keyword_config.role_titles.low
    )
    return any(kw.lower() in title_lower for kw in all_titles)


async def poll_all_sources(supabase: Client) -> PollResult:
    sources_resp = supabase.table("job_sources").select("*").eq("enabled", True).execute()
    sources = sources_resp.data or []

    result = PollResult(
        sources_polled=0, new_jobs=0, updated_jobs=0, archived_jobs=0, errors=[]
    )

    for raw_source in sources:
        source = cast(dict[str, Any], raw_source)
        try:
            board_token: str = source["board_token"]
            company_name: str = source["company_name"]
            source_id: str = source["id"]

            jobs = await fetch_board_jobs(board_token)
            result.sources_polled += 1

            # Collect ALL greenhouse IDs from the API (before title filtering)
            # so we don't archive jobs that exist on Greenhouse but don't match
            # our role filter.
            all_greenhouse_ids: set[int] = {job.id for job in jobs}

            for job in jobs:
                if not _title_matches_any_role(job.title):
                    continue

                score_result = score_job(job.title, job.content, keyword_config)

                row: dict[str, Any] = {
                    "greenhouse_id": job.id,
                    "source_id": source_id,
                    "title": job.title,
                    "company_name": company_name,
                    "location": job.location_name,
                    "department": job.department,
                    "description_html": sanitize_html(job.content),
                    "absolute_url": job.absolute_url,
                    "score": score_result.score,
                    "score_breakdown": score_result.breakdown.model_dump(),
                    "greenhouse_updated_at": job.updated_at,
                }

                upsert_resp = (
                    supabase.table("job_postings")
                    .upsert(row, on_conflict="greenhouse_id")
                    .execute()
                )

                if upsert_resp.data:
                    data = cast(dict[str, Any], upsert_resp.data[0])
                    if data.get("created_at") == data.get("updated_at"):
                        result.new_jobs += 1
                    else:
                        result.updated_jobs += 1

            # Archive stale jobs: postings in the DB for this source that are
            # no longer returned by Greenhouse. Skip user-intent statuses.
            existing_resp = (
                supabase.table("job_postings")
                .select("id, greenhouse_id")
                .eq("source_id", source_id)
                .not_.in_("status", ["saved", "applied", "archived"])
                .execute()
            )
            now_iso = datetime.now(UTC).isoformat()
            for existing_job in existing_resp.data or []:
                row_data = cast(dict[str, Any], existing_job)
                if row_data["greenhouse_id"] not in all_greenhouse_ids:
                    supabase.table("job_postings").update(
                        {"status": "archived", "updated_at": now_iso}
                    ).eq("id", row_data["id"]).execute()
                    result.archived_jobs += 1

            supabase.table("job_sources").update(
                {
                    "last_polled_at": datetime.now(UTC).isoformat(),
                    "job_count": len(jobs),
                }
            ).eq("id", source_id).execute()

            await asyncio.sleep(settings.greenhouse_delay_ms / 1000)

        except Exception:
            company = source.get("company_name", "?")
            logger.exception("Poll failed for %s", company)
            result.errors.append(f"{company}: poll failed")

    return result
