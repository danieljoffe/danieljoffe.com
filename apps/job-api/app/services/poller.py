import asyncio
import json
from datetime import datetime, timezone

from supabase import Client

from app.config import settings
from app.models.schemas import PollResult
from app.seed.keyword_config import keyword_config
from app.services.greenhouse import fetch_board_jobs
from app.services.scoring import score_job


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

    result = PollResult(sources_polled=0, new_jobs=0, updated_jobs=0, errors=[])

    for source in sources:
        try:
            board_token = source["board_token"]
            company_name = source["company_name"]
            source_id = source["id"]

            jobs = await fetch_board_jobs(board_token)
            result.sources_polled += 1

            for job in jobs:
                if not _title_matches_any_role(job.title):
                    continue

                score_result = score_job(job.title, job.content, keyword_config)

                row = {
                    "greenhouse_id": job.id,
                    "source_id": source_id,
                    "title": job.title,
                    "company_name": company_name,
                    "location": job.location_name,
                    "department": job.department,
                    "description_html": job.content,
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
                    data = upsert_resp.data[0]
                    if data.get("created_at") == data.get("updated_at"):
                        result.new_jobs += 1
                    else:
                        result.updated_jobs += 1

            supabase.table("job_sources").update(
                {
                    "last_polled_at": datetime.now(timezone.utc).isoformat(),
                    "job_count": len(jobs),
                }
            ).eq("id", source_id).execute()

            await asyncio.sleep(settings.greenhouse_delay_ms / 1000)

        except Exception as e:
            result.errors.append(f"{source.get('company_name', '?')}: {e!s}")

    return result
