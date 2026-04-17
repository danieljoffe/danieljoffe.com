import asyncio
import logging
from collections.abc import Callable, Coroutine
from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.models.schemas import PollResult
from app.seed.keyword_config import keyword_config
from app.services.ashby import fetch_ashby_jobs
from app.services.greenhouse import fetch_board_jobs
from app.services.jsonld import fetch_jsonld_jobs
from app.services.lever import fetch_lever_jobs
from app.services.sanitize import sanitize_html
from app.services.scoring import score_job
from app.services.smartrecruiters import fetch_smartrecruiters_jobs
from app.services.standard_job import StandardJob
from app.services.workday import fetch_workday_jobs

logger = logging.getLogger(__name__)

Fetcher = Callable[[str], Coroutine[Any, Any, list[StandardJob]]]

FETCHERS: dict[str, Fetcher] = {
    "greenhouse": fetch_board_jobs,
    "lever": fetch_lever_jobs,
    "ashby": fetch_ashby_jobs,
    "workday": fetch_workday_jobs,
    "smartrecruiters": fetch_smartrecruiters_jobs,
    "jsonld": fetch_jsonld_jobs,
}

POLL_CONCURRENCY = 10

# Substrings that flag a location as non-US. Case-insensitive, substring match.
_NON_US_HINTS: tuple[str, ...] = (
    "united kingdom",
    "england",
    "scotland",
    "wales",
    "ireland",
    "dublin",
    "germany",
    "berlin",
    "munich",
    "france",
    "paris",
    "netherlands",
    "amsterdam",
    "spain",
    "barcelona",
    "madrid",
    "italy",
    "rome",
    "milan",
    "sweden",
    "stockholm",
    "denmark",
    "copenhagen",
    "norway",
    "oslo",
    "finland",
    "helsinki",
    "switzerland",
    "zurich",
    "geneva",
    "austria",
    "vienna",
    "poland",
    "warsaw",
    "czech",
    "prague",
    "portugal",
    "lisbon",
    "greece",
    "athens",
    "turkey",
    "istanbul",
    "canada",
    "toronto",
    "vancouver",
    "montreal",
    "ottawa",
    "mexico",
    "brazil",
    "são paulo",
    "sao paulo",
    "india",
    "bangalore",
    "bengaluru",
    "hyderabad",
    "mumbai",
    "delhi",
    "pune",
    "china",
    "beijing",
    "shanghai",
    "hong kong",
    "singapore",
    "japan",
    "tokyo",
    "korea",
    "seoul",
    "taiwan",
    "australia",
    "sydney",
    "melbourne",
    "new zealand",
    "auckland",
    "israel",
    "tel aviv",
    "south africa",
    "johannesburg",
    "argentina",
    "buenos aires",
    "chile",
    "colombia",
    "peru",
    "uae",
    "dubai",
    "abu dhabi",
    "emea",
    "apac",
    "latam",
    "europe",
)


def _title_matches_any_role(title: str) -> bool:
    title_lower = title.lower()
    all_titles = (
        keyword_config.role_titles.high
        + keyword_config.role_titles.medium
        + keyword_config.role_titles.low
    )
    return any(kw.lower() in title_lower for kw in all_titles)


def _is_us_location(location: str | None) -> bool:
    """Return True if the location looks like it's in the US (or is ambiguous).

    Permissive by design: empty/None and generic 'Remote' pass through,
    since many US companies list remote roles with no country. Rejects
    only when a known non-US country or major city name is detected.
    """
    if not location:
        return True
    loc = location.lower()
    return not any(hint in loc for hint in _NON_US_HINTS)


async def _poll_one_source(
    source: dict[str, Any], supabase: Client
) -> dict[str, Any]:
    """Poll a single job source. Returns a per-source summary dict."""
    summary: dict[str, Any] = {
        "polled": False,
        "new": 0,
        "updated": 0,
        "archived": 0,
        "error": None,
    }
    company_name: str = source.get("company_name", "?")

    try:
        board_token: str = source["board_token"]
        source_id: str = source["id"]
        provider: str = source.get("provider", "greenhouse")

        fetcher = FETCHERS.get(provider)
        if not fetcher:
            summary["error"] = f"{company_name}: unknown provider '{provider}'"
            return summary

        jobs = await fetcher(board_token)
        summary["polled"] = True

        # Collect ALL external IDs from the API (before title/location filtering)
        # so we don't archive jobs that exist on the board but don't match filters.
        all_external_ids: set[str] = {job.external_id for job in jobs}

        rows_to_upsert: list[dict[str, Any]] = []
        for job in jobs:
            if not _title_matches_any_role(job.title):
                continue
            if not _is_us_location(job.location_name):
                continue

            score_result = score_job(job.title, job.content, keyword_config)

            rows_to_upsert.append(
                {
                    "external_id": job.external_id,
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
            )

        if rows_to_upsert:
            upsert_resp = (
                supabase.table("job_postings")
                .upsert(rows_to_upsert, on_conflict="source_id,external_id")
                .execute()
            )
            for raw_row in upsert_resp.data or []:
                data = cast(dict[str, Any], raw_row)
                if data.get("created_at") == data.get("updated_at"):
                    summary["new"] += 1
                else:
                    summary["updated"] += 1

        # Archive stale jobs: postings in the DB for this source that are
        # no longer returned by the ATS. Skip user-intent statuses.
        existing_resp = (
            supabase.table("job_postings")
            .select("id, external_id")
            .eq("source_id", source_id)
            .not_.in_("status", ["saved", "applied", "archived"])
            .execute()
        )
        stale_ids: list[str] = []
        for existing_job in existing_resp.data or []:
            row_data = cast(dict[str, Any], existing_job)
            if row_data["external_id"] not in all_external_ids:
                stale_ids.append(row_data["id"])

        if stale_ids:
            supabase.table("job_postings").update(
                {"status": "archived", "updated_at": datetime.now(UTC).isoformat()}
            ).in_("id", stale_ids).execute()
            summary["archived"] = len(stale_ids)

        supabase.table("job_sources").update(
            {
                "last_polled_at": datetime.now(UTC).isoformat(),
                "job_count": len(jobs),
            }
        ).eq("id", source_id).execute()

    except Exception:
        logger.exception("Poll failed for %s", company_name)
        summary["error"] = f"{company_name}: poll failed"

    return summary


async def poll_all_sources(supabase: Client) -> PollResult:
    sources_resp = supabase.table("job_sources").select("*").eq("enabled", True).execute()
    sources = sources_resp.data or []

    semaphore = asyncio.Semaphore(POLL_CONCURRENCY)

    async def _worker(raw_source: Any) -> dict[str, Any]:
        async with semaphore:
            return await _poll_one_source(cast(dict[str, Any], raw_source), supabase)

    summaries = await asyncio.gather(*(_worker(s) for s in sources))

    result = PollResult(
        sources_polled=0, new_jobs=0, updated_jobs=0, archived_jobs=0, errors=[]
    )
    for s in summaries:
        if s["polled"]:
            result.sources_polled += 1
        result.new_jobs += s["new"]
        result.updated_jobs += s["updated"]
        result.archived_jobs += s["archived"]
        if s["error"]:
            result.errors.append(s["error"])

    return result
