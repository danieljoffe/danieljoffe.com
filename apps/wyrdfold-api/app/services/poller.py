from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import Callable, Coroutine
from datetime import UTC, datetime, timedelta
from typing import Any, cast

from supabase import Client

from app.config import settings
from app.models.experience import OptimizedDoc
from app.models.schemas import PollResult
from app.models.targets import JobTarget
from app.services import notify
from app.services.analysis.analyze import analyze_job
from app.services.analysis.persistence import (
    get_cached as get_cached_analysis,
)
from app.services.analysis.persistence import (
    persist as persist_analysis,
)
from app.services.analysis.scoring import blend_scores, scorecard_to_numeric
from app.services.ashby import fetch_ashby_jobs
from app.services.experience.optimized import get_latest as get_latest_optimized
from app.services.extract import extract_salary_from_text
from app.services.firecrawl import fetch_firecrawl_jobs
from app.services.greenhouse import fetch_board_jobs
from app.services.jd_parser import parse_jd
from app.services.jsonld import fetch_jsonld_jobs
from app.services.lever import fetch_lever_jobs
from app.services.llm import get_default_client as get_default_llm_client
from app.services.llm.client import LLMClient
from app.services.llm.cost_log import enqueue as enqueue_llm_cost
from app.services.sanitize import sanitize_html
from app.services.scoring import score_title_against_profile, strip_html
from app.services.smartrecruiters import fetch_smartrecruiters_jobs
from app.services.standard_job import StandardJob
from app.services.supabase_retry import execute_with_retry_sync
from app.services.target_scoring import (
    batch_update_global_scores,
)
from app.services.target_scoring import (
    mark_complete as mark_target_scores_complete,
)
from app.services.target_scoring import (
    score_and_upsert as target_score_and_upsert,
)
from app.services.target_scoring import (
    score_title_and_upsert as target_title_score_and_upsert,
)
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
LLM_CONCURRENCY = 3

# Minimum keyword score to trigger LLM analysis during polling.
# Below this threshold, only keyword scoring is used.
LLM_SCORE_THRESHOLD = 40

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


def _title_matches_any_target(title: str, targets: list[JobTarget]) -> bool:
    """Check if a job title matches any active target's scoring profile.

    Uses stage 1 title scoring — if any target's keywords match the title,
    the job is worth ingesting.
    """
    for target in targets:
        result = score_title_against_profile(
            title,
            target.scoring_profile,
            search_keywords=target.search_keywords,
        )
        if result.matched_keywords or result.excluded:
            return True
    return False


# Tokens we drop before token-overlap matching — pure connective words
# that contribute no signal. Kept short on purpose; anything role-specific
# (e.g. "engineering", "operations") stays in.
_MATCH_STOPWORDS: frozenset[str] = frozenset(
    {"of", "the", "and", "a", "an", "for", "to", "in", "on", "at"}
)

# Minimum fraction of a keyword's content tokens that must appear in the
# title for a token-overlap match. 0.6 means a 5-token keyword needs 3 of
# those tokens in the title — strict enough that "Director" alone doesn't
# match "Director of CX Operations", lax enough that "Director, Customer
# Experience" matches both "director of customer experience" and
# "head of customer experience".
_MATCH_MIN_OVERLAP_RATIO: float = 0.6


def _content_tokens(text: str) -> list[str]:
    """Lower-case word-boundary split with stopwords removed.

    Used by ``_title_matches_target`` on both sides of the comparison so
    matching is symmetric (token-by-token rather than substring-by-substring).
    """
    raw = text.lower().replace(",", " ").replace("/", " ").split()
    return [t for t in raw if t and t not in _MATCH_STOPWORDS]


def _title_matches_target(title: str, keywords: list[str]) -> bool:
    """Token-overlap match between a job title and any of the target's
    search keywords.

    Previous version used pure substring match — ``"director of cx operations"
    in title_lower`` — which silently dropped almost every real posting
    because companies rarely include filler words verbatim in their titles
    ("Director, Customer Experience" doesn't contain "director of cx
    operations"). The new matcher tokenizes both sides on word boundaries,
    drops stopwords, and accepts the keyword when at least
    ``_MATCH_MIN_OVERLAP_RATIO`` of its content tokens appear as substrings
    of the title's tokens. Substring (not exact) so plurals and
    "Customer-Centric" → "Customer" still match.
    """
    if not keywords:
        return False
    title_tokens = _content_tokens(title)
    if not title_tokens:
        return False
    for keyword in keywords:
        kw_tokens = _content_tokens(keyword)
        if not kw_tokens:
            continue
        # Fast path: a 1-token keyword degenerates to plain substring match.
        if len(kw_tokens) == 1:
            if any(kw_tokens[0] in t for t in title_tokens):
                return True
            continue
        hits = sum(
            1 for kw in kw_tokens if any(kw in t for t in title_tokens)
        )
        if hits / len(kw_tokens) >= _MATCH_MIN_OVERLAP_RATIO:
            return True
    return False


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


async def _run_llm_scoring_for_row(
    supabase: Client,
    row_data: dict[str, Any],
    optimized_doc: OptimizedDoc,
    llm: LLMClient,
    target: JobTarget,
) -> None:
    """Stage 3: Run LLM analysis and mark target scores as complete.

    Fetches the current global score (set by stage 2) for the threshold
    check. Blends keyword and LLM scores, updates global score, and
    marks all target scores for this job as 'complete'.

    Cache key is (job_posting_id, target.id, optimized_doc.id) — the
    same row is reused by the user-facing analysis flow when viewing
    the job under this target.

    Silently falls back to keyword-only score on any error.
    """
    job_id = row_data.get("id")
    if not job_id:
        return

    # Fetch the current global score (average of target stage-2 scores)
    try:
        score_resp = await asyncio.to_thread(
            supabase.table("jobs")
            .select("score")
            .eq("id", job_id)
            .single()
            .execute
        )
        current_score = int(cast(dict[str, Any], score_resp.data).get("score", 0))
    except Exception:
        # Score row missing or unparseable — treat as 0 so the LLM-threshold
        # gate applies as if this is a fresh job. Logged so silent zeroing is
        # observable when investigating low-confidence matches.
        logger.warning(
            "Could not read current score for job %s — defaulting to 0",
            job_id,
            exc_info=True,
        )
        current_score = 0

    if current_score < LLM_SCORE_THRESHOLD:
        # Below threshold — skip LLM but still mark as complete
        try:
            await asyncio.to_thread(mark_target_scores_complete, supabase, job_id)
        except Exception:
            logger.exception("Failed to mark scores complete for job %s", job_id)
        return

    # Check LLM cache — skip re-analysis if this job+target+optimized was already done
    try:
        cached = await asyncio.to_thread(
            get_cached_analysis,
            supabase,
            job_id,
            target_id=target.id,
            optimized_doc_id=optimized_doc.id,
            user_id=None,
        )
        if cached is not None:
            llm_score = scorecard_to_numeric(cached.scorecard)
            blended = blend_scores(current_score, llm_score)
            await asyncio.to_thread(
                supabase.table("jobs")
                .update(
                    {
                        "score": blended,
                        "llm_score": llm_score,
                        "llm_analysis_id": cached.id,
                    }
                )
                .eq("id", job_id)
                .execute
            )
            await asyncio.to_thread(mark_target_scores_complete, supabase, job_id)
            return
    except Exception:
        logger.debug("LLM cache check failed for job %s, proceeding with analysis", job_id)

    try:
        description_text = strip_html(row_data.get("description_html", ""))

        analysis, llm_result = await analyze_job(
            llm,
            optimized=optimized_doc.payload,
            job_description=description_text,
            purpose="poll_scoring",
        )

        # Persist analysis and log cost
        record = await asyncio.to_thread(
            persist_analysis,
            supabase,
            job_posting_id=job_id,
            target_id=target.id,
            user_id=None,
            optimized_doc_id=optimized_doc.id,
            analysis=analysis,
            llm_result=llm_result,
        )
        # Cron path: enqueue instead of inline INSERT. The background
        # buffer batches per-row writes into a single bulk INSERT every
        # few seconds, so a fan-out of N concurrent LLM calls produces
        # ~1 cost-log INSERT instead of N.
        enqueue_llm_cost(None, "poll_scoring", llm_result)

        llm_score = scorecard_to_numeric(analysis.scorecard)
        blended = blend_scores(current_score, llm_score)

        # Update the jobs row with LLM score data
        await asyncio.to_thread(
            supabase.table("jobs")
            .update(
                {
                    "score": blended,
                    "llm_score": llm_score,
                    "llm_analysis_id": record.id,
                }
            )
            .eq("id", job_id)
            .execute
        )

        # Mark all target scores as complete
        await asyncio.to_thread(mark_target_scores_complete, supabase, job_id)

    except Exception:
        logger.exception(
            "LLM scoring failed for job %s ('%s')",
            row_data.get("id"),
            row_data.get("title", "?"),
        )
        # Still mark as complete on error — don't leave jobs stuck in stage2
        with contextlib.suppress(Exception):
            await asyncio.to_thread(mark_target_scores_complete, supabase, job_id)


async def _poll_one_source(
    source: dict[str, Any],
    supabase: Client,
    optimized_doc: OptimizedDoc | None = None,
) -> dict[str, Any]:
    """Poll a single job source. Returns a per-source summary dict.

    Three-stage scoring pipeline:
      1. Title-only match against each active target (inline, fast)
      2. Full JD match for stage-1 matches (async, after upsert)
      3. LLM analysis for top stage-2 scores (async)
    """
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

        # Fetch active targets once — used for title filtering and scoring
        active_targets = get_active_target(supabase)

        rows_to_upsert: list[dict[str, Any]] = []
        for job in jobs:
            # Filter by target relevance instead of static keyword list
            if active_targets and not _title_matches_any_target(job.title, active_targets):
                continue
            if not _is_us_location(job.location_name):
                continue

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
                    "score": 0,  # Placeholder — updated by target scoring pipeline
                    "score_breakdown": {},
                    "greenhouse_updated_at": job.updated_at,
                    "salary_text": salary,
                }
            )

        # Optional: validate job URLs before upserting (#496)
        if settings.validate_poll_urls and rows_to_upsert:
            rows_to_upsert = await _validate_rows(rows_to_upsert)

        # Upsert new/updated jobs AND fetch existing rows in parallel.
        existing_query = (
            supabase.table("jobs")
            .select("id, external_id")
            .eq("source_id", source_id)
            .not_.in_("status", ["saved", "applied", "archived"])
        )

        new_rows: list[dict[str, Any]] = []
        if rows_to_upsert:
            upsert_query = supabase.table("jobs").upsert(
                rows_to_upsert, on_conflict="source_id,external_id"
            )
            # Both calls are idempotent — the upsert keys on the unique
            # constraint, the SELECT is read-only — so retrying on a
            # Supabase HTTP/2 stream drop won't double-write or skew counts.
            upsert_resp, existing_resp = await asyncio.gather(
                asyncio.to_thread(
                    execute_with_retry_sync,
                    upsert_query.execute,
                    label=f"poll upsert {company_name}",
                ),
                asyncio.to_thread(
                    execute_with_retry_sync,
                    existing_query.execute,
                    label=f"poll existing {company_name}",
                ),
            )
            for raw_row in upsert_resp.data or []:
                data = cast(dict[str, Any], raw_row)
                if data.get("created_at") == data.get("updated_at"):
                    summary["new"] += 1
                    new_rows.append(data)
                else:
                    summary["updated"] += 1

            # ---- Stage 1: Title scoring per target ----
            for active_target in active_targets:

                async def _title_score_one(
                    row_data: dict[str, Any], target: JobTarget = active_target
                ) -> None:
                    try:
                        await asyncio.to_thread(
                            target_title_score_and_upsert,
                            supabase,
                            job_posting_id=row_data["id"],
                            title=row_data.get("title", ""),
                            target=target,
                        )
                    except Exception:
                        logger.exception(
                            "Stage 1 scoring failed for job %s", row_data.get("id")
                        )

                await asyncio.gather(
                    *(
                        _title_score_one(cast(dict[str, Any], r))
                        for r in upsert_resp.data or []
                    )
                )

            # Update global scores after stage 1 (batched)
            stage1_ids = [
                cast(dict[str, Any], r)["id"] for r in upsert_resp.data or []
            ]
            if stage1_ids:
                try:
                    await asyncio.to_thread(
                        batch_update_global_scores, supabase, stage1_ids
                    )
                except Exception:
                    logger.exception("Batch global score update failed after stage 1")

            # ---- Stage 2: Full JD scoring per target (async) ----
            # Pre-parse each JD once, reuse across all targets
            jd_cache: dict[str, Any] = {}
            for raw_row in upsert_resp.data or []:
                rd = cast(dict[str, Any], raw_row)
                jd_cache[rd["id"]] = parse_jd(rd.get("description_html") or "")

            for active_target in active_targets:

                async def _full_score_one(
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
                            parsed_jd=jd_cache.get(row_data["id"]),
                        )
                    except Exception:
                        logger.exception(
                            "Stage 2 scoring failed for job %s", row_data.get("id")
                        )

                await asyncio.gather(
                    *(
                        _full_score_one(cast(dict[str, Any], r))
                        for r in upsert_resp.data or []
                    )
                )

            # Update global scores after stage 2 (batched)
            stage2_ids = [
                cast(dict[str, Any], r)["id"] for r in upsert_resp.data or []
            ]
            if stage2_ids:
                try:
                    await asyncio.to_thread(
                        batch_update_global_scores, supabase, stage2_ids
                    )
                except Exception:
                    logger.exception("Batch global score update failed after stage 2")

            # ---- Stage 3: LLM scoring for qualified jobs (concurrent) ----
            # Cache key is (job, target, optimized) — pick the first active
            # target as the canonical one for the poller's cache row. The
            # user-facing analysis flow re-uses the same row when viewing
            # the job under that target, and runs its own LLM call for
            # other targets on demand.
            if optimized_doc is not None and active_targets:
                llm = get_default_llm_client()
                llm_sem = asyncio.Semaphore(LLM_CONCURRENCY)
                primary_target = active_targets[0]

                async def _llm_one(row_data: dict[str, Any]) -> None:
                    async with llm_sem:
                        await _run_llm_scoring_for_row(
                            supabase, row_data, optimized_doc, llm, primary_target
                        )

                await asyncio.gather(
                    *(
                        _llm_one(cast(dict[str, Any], r))
                        for r in upsert_resp.data or []
                    )
                )
        else:
            existing_resp = await asyncio.to_thread(existing_query.execute)

        # Identify stale jobs no longer on the board
        stale_ids: list[str] = []
        for existing_job in existing_resp.data or []:
            row_data = cast(dict[str, Any], existing_job)
            if row_data["external_id"] not in all_external_ids:
                stale_ids.append(row_data["id"])

        # Archive stale jobs AND update last_polled_at in parallel
        last_polled_query = (
            supabase.table("sources")
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
                supabase.table("jobs")
                .update({"status": "archived", "updated_at": datetime.now(UTC).isoformat()})
                .in_("id", stale_ids)
            )
            # Both writes are idempotent (UPDATE with stable WHERE), so a
            # retry after a stream drop is safe.
            await asyncio.gather(
                asyncio.to_thread(
                    execute_with_retry_sync,
                    archive_query.execute,
                    label=f"poll archive {company_name}",
                ),
                asyncio.to_thread(
                    execute_with_retry_sync,
                    last_polled_query.execute,
                    label=f"poll mark-polled {company_name}",
                ),
            )
            summary["archived"] = len(stale_ids)
        else:
            await asyncio.to_thread(
                execute_with_retry_sync,
                last_polled_query.execute,
                label=f"poll mark-polled {company_name}",
            )

        # Fire email + SMS alerts for newly-inserted high-scoring jobs.
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
    sources_query = supabase.table("sources").select("*").eq("enabled", True)
    sources_resp = await asyncio.to_thread(sources_query.execute)
    sources = sources_resp.data or []

    # Fetch optimized doc once for all sources
    optimized_doc = await asyncio.to_thread(get_latest_optimized, supabase, None)

    semaphore = asyncio.Semaphore(POLL_CONCURRENCY)

    async def _worker(raw_source: Any) -> dict[str, Any]:
        async with semaphore:
            return await _poll_one_source(
                cast(dict[str, Any], raw_source), supabase, optimized_doc
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
        result.archived_jobs += s["archived"]
        if s["error"]:
            result.errors.append(s["error"])

    return result


# ---- Due-source polling (cron entry point) ---------------------------------


# Fallback interval used when a source row predates the
# `poll_interval_minutes` column or has it set to NULL for any reason.
DEFAULT_POLL_INTERVAL_MINUTES = 240


def _is_due(source: dict[str, Any], now: datetime) -> bool:
    """Return True if the source should be polled this tick.

    A source is due when it has never been polled or when its
    ``last_polled_at + poll_interval_minutes`` is in the past.
    """
    last = source.get("last_polled_at")
    if not last:
        return True

    interval_min = source.get("poll_interval_minutes") or DEFAULT_POLL_INTERVAL_MINUTES
    try:
        last_dt = (
            datetime.fromisoformat(last.replace("Z", "+00:00"))
            if isinstance(last, str)
            else last
        )
    except (TypeError, ValueError):
        # Unparseable timestamp — treat as never-polled rather than
        # silently skipping the row forever.
        return True

    return last_dt + timedelta(minutes=int(interval_min)) <= now


def filter_due_sources(
    sources: list[dict[str, Any]], *, now: datetime | None = None
) -> list[dict[str, Any]]:
    """Pure helper for the due-filter — extracted so tests don't need Supabase."""
    moment = now or datetime.now(UTC)
    return [s for s in sources if _is_due(s, moment)]


async def poll_due_sources(supabase: Client) -> PollResult:
    """Poll only the sources whose interval has elapsed.

    Same shape as ``poll_all_sources`` but skips sources that were
    polled recently. Designed to be called from a frequent cron tick
    (e.g. every 30 min) without re-hammering boards that have a longer
    configured cadence.
    """
    sources_query = supabase.table("sources").select("*").eq("enabled", True)
    sources_resp = await asyncio.to_thread(sources_query.execute)
    all_enabled = cast(list[dict[str, Any]], sources_resp.data or [])

    due = filter_due_sources(all_enabled)
    if not due:
        return PollResult(
            sources_polled=0, new_jobs=0, updated_jobs=0, archived_jobs=0, errors=[]
        )

    optimized_doc = await asyncio.to_thread(get_latest_optimized, supabase, None)

    semaphore = asyncio.Semaphore(POLL_CONCURRENCY)

    async def _worker(source: dict[str, Any]) -> dict[str, Any]:
        async with semaphore:
            return await _poll_one_source(source, supabase, optimized_doc)

    summaries = await asyncio.gather(*(_worker(s) for s in due))

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
    source: dict[str, Any],
    supabase: Client,
    target: JobTarget,
    optimized_doc: OptimizedDoc | None = None,
) -> dict[str, Any]:
    """Poll a single source for a specific target. Three-stage pipeline."""
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
                    "score": 0,  # Updated by target scoring pipeline
                    "score_breakdown": {},
                    "greenhouse_updated_at": job.updated_at,
                    "salary_text": salary,
                }
            )

        if settings.validate_poll_urls and rows_to_upsert:
            rows_to_upsert = await _validate_rows(rows_to_upsert)

        if rows_to_upsert:
            upsert_resp = await asyncio.to_thread(
                supabase.table("jobs")
                .upsert(rows_to_upsert, on_conflict="source_id,external_id")
                .execute
            )
            for raw_row in upsert_resp.data or []:
                data = cast(dict[str, Any], raw_row)
                if data.get("created_at") == data.get("updated_at"):
                    summary["new"] += 1
                else:
                    summary["updated"] += 1

            # Stage 1: Title scoring
            async def _title_score_one(row_data: dict[str, Any]) -> None:
                try:
                    await asyncio.to_thread(
                        target_title_score_and_upsert,
                        supabase,
                        job_posting_id=row_data["id"],
                        title=row_data.get("title", ""),
                        target=target,
                    )
                except Exception:
                    logger.exception(
                        "Stage 1 scoring failed for job %s", row_data.get("id")
                    )

            await asyncio.gather(
                *(_title_score_one(cast(dict[str, Any], r)) for r in upsert_resp.data or [])
            )

            # Stage 2: Full JD scoring (pre-parse JDs once)
            jd_cache: dict[str, Any] = {}
            for raw_row in upsert_resp.data or []:
                rd = cast(dict[str, Any], raw_row)
                jd_cache[rd["id"]] = parse_jd(rd.get("description_html") or "")

            async def _full_score_one(row_data: dict[str, Any]) -> None:
                try:
                    await asyncio.to_thread(
                        target_score_and_upsert,
                        supabase,
                        job_posting_id=row_data["id"],
                        title=row_data.get("title", ""),
                        description_html=row_data.get("description_html", ""),
                        target=target,
                        parsed_jd=jd_cache.get(row_data["id"]),
                    )
                except Exception:
                    logger.exception(
                        "Stage 2 scoring failed for job %s", row_data.get("id")
                    )

            await asyncio.gather(
                *(_full_score_one(cast(dict[str, Any], r)) for r in upsert_resp.data or [])
            )

            # Update global scores after stage 2 (batched)
            s2_ids = [
                cast(dict[str, Any], r)["id"] for r in upsert_resp.data or []
            ]
            if s2_ids:
                try:
                    await asyncio.to_thread(
                        batch_update_global_scores, supabase, s2_ids
                    )
                except Exception:
                    logger.exception("Batch global score update failed after stage 2")

            # Stage 3: LLM scoring for qualified jobs (concurrent)
            if optimized_doc is not None:
                llm = get_default_llm_client()
                llm_sem = asyncio.Semaphore(LLM_CONCURRENCY)

                async def _llm_one_t(row_data: dict[str, Any]) -> None:
                    async with llm_sem:
                        await _run_llm_scoring_for_row(
                            supabase, row_data, optimized_doc, llm, target
                        )

                await asyncio.gather(
                    *(
                        _llm_one_t(cast(dict[str, Any], r))
                        for r in upsert_resp.data or []
                    )
                )

    except Exception:
        logger.exception("Poll failed for %s (target %s)", company_name, target.label)
        summary["error"] = f"{company_name}: poll failed"

    # Stamp ``last_polled_at`` on the source row whenever we made it past
    # the fetcher dispatch — including the "polled but zero matches against
    # this target" case, which previously left the column null and gave
    # operators no signal that the source was actually being touched. We
    # explicitly skip on the "unknown provider" branch above (that path
    # returns early before reaching here) so a misconfigured row doesn't
    # silently look healthy.
    if summary.get("polled"):
        try:
            source_id_for_stamp = source.get("id")
            if source_id_for_stamp:
                await asyncio.to_thread(
                    supabase.table("sources")
                    .update({"last_polled_at": datetime.now(UTC).isoformat()})
                    .eq("id", source_id_for_stamp)
                    .execute
                )
        except Exception:
            # Non-fatal — the actual poll already happened, this is just
            # the operator-visibility stamp.
            logger.exception(
                "Failed to update last_polled_at for source %s", company_name
            )

    return summary


async def poll_sources_for_target(supabase: Client, target: JobTarget) -> PollResult:
    """Poll all enabled sources, filtering for jobs matching a target's search keywords."""
    if not target.search_keywords:
        return PollResult(
            sources_polled=0, new_jobs=0, updated_jobs=0, archived_jobs=0,
            errors=["Target has no search keywords"],
        )

    sources_query = supabase.table("sources").select("*").eq("enabled", True)
    sources_resp = await asyncio.to_thread(sources_query.execute)
    sources = sources_resp.data or []

    # Fetch optimized doc once for all sources
    optimized_doc = await asyncio.to_thread(get_latest_optimized, supabase, None)

    semaphore = asyncio.Semaphore(POLL_CONCURRENCY)

    async def _worker(raw_source: Any) -> dict[str, Any]:
        async with semaphore:
            return await _poll_one_source_for_target(
                cast(dict[str, Any], raw_source), supabase, target, optimized_doc
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
