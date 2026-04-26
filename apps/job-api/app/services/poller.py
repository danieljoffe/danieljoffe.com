import asyncio
import logging
from collections.abc import Callable, Coroutine
from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.config import settings
from app.models.schemas import PollResult
from app.models.targets import JobTarget
from app.seed.keyword_config import keyword_config
from app.services import notify
from app.services.ashby import fetch_ashby_jobs
from app.services.extract import extract_salary_from_text
from app.services.firecrawl import fetch_firecrawl_jobs
from app.services.greenhouse import fetch_board_jobs
from app.services.jsonld import fetch_jsonld_jobs
from app.services.lever import fetch_lever_jobs
from app.services.sanitize import sanitize_html
from app.services.scoring import score_job, strip_html
from app.services.smartrecruiters import fetch_smartrecruiters_jobs
from app.services.standard_job import StandardJob
from app.services.target_scoring import score_and_upsert as target_score_and_upsert
from app.services.targets.crud import get_active as get_active_target
from app.services.validate import validate_job_url
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
    "crawl": fetch_firecrawl_jobs,
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


def _title_matches_target(title: str, keywords: list[str]) -> bool:
    """Check if a job title matches any of the target's search keywords."""
    title_lower = title.lower()
    return any(kw.lower() in title_lower for kw in keywords)


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


async def _validate_one_row(row: dict[str, Any]) -> dict[str, Any]:
    """Validate the absolute_url of a single job row."""
    url = row.get("absolute_url")
    if not url:
        return row
    try:
        result = await validate_job_url(url)
        if not result.is_valid:
            row["url_validation_status"] = "rejected"
            row["url_validation_warnings"] = [result.rejection_reason]
            row["absolute_url"] = None
        else:
            row["url_validation_status"] = "valid"
            row["url_validation_warnings"] = result.warnings
            if result.final_url != url:
                row["absolute_url"] = result.final_url
    except Exception:
        logger.exception("URL validation failed for %s", url)
    return row


async def _validate_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Validate URLs for all rows concurrently."""
    return list(await asyncio.gather(*(_validate_one_row(r) for r in rows)))


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
            salary = job.salary_text or extract_salary_from_text(strip_html(job.content))

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
                    "salary_text": salary,
                }
            )

        # Optional: validate job URLs before upserting (#496)
        if settings.validate_poll_urls and rows_to_upsert:
            rows_to_upsert = await _validate_rows(rows_to_upsert)

        # Phase 1: Upsert new/updated jobs AND fetch existing rows in parallel.
        # These are independent — upsert adds/updates matched rows, existing
        # query looks for stale rows by external_id not in the ATS response.
        existing_query = (
            supabase.table("job_postings")
            .select("id, external_id")
            .eq("source_id", source_id)
            .not_.in_("status", ["saved", "applied", "archived"])
        )

        new_rows: list[dict[str, Any]] = []
        if rows_to_upsert:
            upsert_query = supabase.table("job_postings").upsert(
                rows_to_upsert, on_conflict="source_id,external_id"
            )
            upsert_resp, existing_resp = await asyncio.gather(
                asyncio.to_thread(upsert_query.execute),
                asyncio.to_thread(existing_query.execute),
            )
            for raw_row in upsert_resp.data or []:
                data = cast(dict[str, Any], raw_row)
                if data.get("created_at") == data.get("updated_at"):
                    summary["new"] += 1
                    new_rows.append(data)
                else:
                    summary["updated"] += 1

            # Score upserted jobs against all active targets (#502)
            active_targets = get_active_target(supabase, user_id=None)
            for active_target in active_targets:

                async def _score_one(
                    row_data: dict[str, Any], target: JobTarget = active_target
                ) -> None:
                    try:
                        await asyncio.to_thread(
                            target_score_and_upsert,
                            supabase,
                            job_posting_id=row_data["id"],
                            title=row_data.get("title", ""),
                            description_html=row_data.get("description_html", ""),
                            target=target,
                        )
                    except Exception:
                        logger.exception(
                            "Target scoring failed for job %s", row_data.get("id")
                        )

                await asyncio.gather(
                    *(_score_one(cast(dict[str, Any], r)) for r in upsert_resp.data or [])
                )
        else:
            existing_resp = await asyncio.to_thread(existing_query.execute)

        # Identify stale jobs no longer on the board
        stale_ids: list[str] = []
        for existing_job in existing_resp.data or []:
            row_data = cast(dict[str, Any], existing_job)
            if row_data["external_id"] not in all_external_ids:
                stale_ids.append(row_data["id"])

        # Phase 2: Archive stale jobs AND update last_polled_at in parallel
        last_polled_query = (
            supabase.table("job_sources")
            .update(
                {
                    "last_polled_at": datetime.now(UTC).isoformat(),
                    "job_count": len(jobs),
                }
            )
            .eq("id", source_id)
        )

        if stale_ids:
            archive_query = (
                supabase.table("job_postings")
                .update({"status": "archived", "updated_at": datetime.now(UTC).isoformat()})
                .in_("id", stale_ids)
            )
            await asyncio.gather(
                asyncio.to_thread(archive_query.execute),
                asyncio.to_thread(last_polled_query.execute),
            )
            summary["archived"] = len(stale_ids)
        else:
            await asyncio.to_thread(last_polled_query.execute)

        # Fire email + SMS alerts for newly-inserted high-scoring jobs.
        # Notification failures are logged inside the service and must not
        # fail the poll.
        if new_rows:
            try:
                await notify.send_alerts_for_new_jobs(supabase, new_rows)
            except Exception:
                logger.exception(
                    "Email alert dispatch raised for %s", company_name
                )
            try:
                await notify.send_sms_alerts_for_new_jobs(supabase, new_rows)
            except Exception:
                logger.exception(
                    "SMS alert dispatch raised for %s", company_name
                )

    except Exception:
        logger.exception("Poll failed for %s", company_name)
        summary["error"] = f"{company_name}: poll failed"

    return summary


async def poll_all_sources(supabase: Client) -> PollResult:
    sources_query = supabase.table("job_sources").select("*").eq("enabled", True)
    sources_resp = await asyncio.to_thread(sources_query.execute)
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


# ---- Target-specific polling ------------------------------------------------


async def _poll_one_source_for_target(
    source: dict[str, Any], supabase: Client, target: JobTarget
) -> dict[str, Any]:
    """Poll a single source, filtering by target keywords and scoring against target profile."""
    summary: dict[str, Any] = {"polled": False, "new": 0, "updated": 0, "error": None}
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

        rows_to_upsert: list[dict[str, Any]] = []
        for job in jobs:
            if not _title_matches_target(job.title, target.search_keywords):
                continue
            if not _is_us_location(job.location_name):
                continue

            # Global score (for "All Jobs" tab)
            score_result = score_job(job.title, job.content, keyword_config)
            salary = job.salary_text or extract_salary_from_text(strip_html(job.content))

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
                    "salary_text": salary,
                }
            )

        if settings.validate_poll_urls and rows_to_upsert:
            rows_to_upsert = await _validate_rows(rows_to_upsert)

        if rows_to_upsert:
            upsert_resp = await asyncio.to_thread(
                supabase.table("job_postings")
                .upsert(rows_to_upsert, on_conflict="source_id,external_id")
                .execute
            )
            for raw_row in upsert_resp.data or []:
                data = cast(dict[str, Any], raw_row)
                if data.get("created_at") == data.get("updated_at"):
                    summary["new"] += 1
                else:
                    summary["updated"] += 1

            # Score all upserted jobs against the target
            async def _score_one(row_data: dict[str, Any]) -> None:
                try:
                    await asyncio.to_thread(
                        target_score_and_upsert,
                        supabase,
                        job_posting_id=row_data["id"],
                        title=row_data.get("title", ""),
                        description_html=row_data.get("description_html", ""),
                        target=target,
                    )
                except Exception:
                    logger.exception(
                        "Target scoring failed for job %s", row_data.get("id")
                    )

            await asyncio.gather(
                *(_score_one(cast(dict[str, Any], r)) for r in upsert_resp.data or [])
            )

    except Exception:
        logger.exception("Poll failed for %s (target %s)", company_name, target.label)
        summary["error"] = f"{company_name}: poll failed"

    return summary


async def poll_sources_for_target(supabase: Client, target: JobTarget) -> PollResult:
    """Poll all enabled sources, filtering for jobs matching a target's search keywords."""
    if not target.search_keywords:
        return PollResult(
            sources_polled=0, new_jobs=0, updated_jobs=0, archived_jobs=0,
            errors=["Target has no search keywords"],
        )

    sources_query = supabase.table("job_sources").select("*").eq("enabled", True)
    sources_resp = await asyncio.to_thread(sources_query.execute)
    sources = sources_resp.data or []

    semaphore = asyncio.Semaphore(POLL_CONCURRENCY)

    async def _worker(raw_source: Any) -> dict[str, Any]:
        async with semaphore:
            return await _poll_one_source_for_target(
                cast(dict[str, Any], raw_source), supabase, target
            )

    summaries = await asyncio.gather(*(_worker(s) for s in sources))

    result = PollResult(
        sources_polled=0, new_jobs=0, updated_jobs=0, archived_jobs=0, errors=[]
    )
    for s in summaries:
        if s["polled"]:
            result.sources_polled += 1
        result.new_jobs += s["new"]
        result.updated_jobs += s["updated"]
        if s.get("error"):
            result.errors.append(s["error"])

    return result
