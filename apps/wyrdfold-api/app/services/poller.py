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
from app.services.fit import run_phase2_for_jobs
from app.services.greenhouse import fetch_board_jobs
from app.services.jd_parser import parse_jd
from app.services.jsonld import fetch_jsonld_jobs
from app.services.lever import fetch_lever_jobs
from app.services.llm import get_default_client as get_default_llm_client
from app.services.llm.client import LLMClient
from app.services.llm.cost_log import enqueue as enqueue_llm_cost
from app.services.llm.cost_log import record as record_llm_cost
from app.services.recency import refresh_recency_scores
from app.services.relevance.title_triage import (
    PHASE1_BATCH_SIZE,
    PHASE1_PURPOSE,
    TitleVerdict,
    triage_titles,
)
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
    """Check if a job title is worth ingesting for at least one target.

    Admission rules per target (any one target admitting → admit):
      1. Excluded by negative keywords → admit anyway, so the scoring
         pipeline records the rejection (excluded=True) for audit.
         Without this, junior-vs-director hits would silently vanish
         instead of being explainable in the UI.
      2. Matched scoring keywords AND (search_keywords overlap matches
         the title, OR the target has no search_keywords). This is the
         AND-semantics fix from the relevance-matcher research doc:
         a title that only hits incidental skill/seniority tokens but
         doesn't look like the *kind* of role the user is hunting for
         (no search-keyword overlap) is rejected at the door rather
         than ingested as low-score noise.
    """
    for target in targets:
        result = score_title_against_profile(
            title,
            target.scoring_profile,
            search_keywords=target.search_keywords,
        )
        if result.excluded:
            return True
        if not result.matched_keywords:
            continue
        # Empty search_keywords means we can't gate on role-title intent;
        # fall back to legacy "any keyword match admits" semantics so a
        # draft / legacy profile doesn't ingestion-block itself.
        if target.search_keywords and not _title_matches_target(
            title, target.search_keywords
        ):
            continue
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


def _content_dedupe_key(
    company: str | None, title: str | None
) -> tuple[str, str]:
    """Stable lowercase + collapsed-whitespace key for the
    (company, title) dedupe pass. Whitespace differences ("Director"
    vs "Director " vs "Director\\n") are normalized; punctuation and
    casing differences are normalized; everything else is left as-is
    on purpose (e.g. "Director, Customer Ops" vs "Director Customer
    Ops" should still be considered distinct because the comma
    might actually delimit a different role)."""
    co = " ".join((company or "").lower().split())
    ti = " ".join((title or "").lower().split())
    return (co, ti)


def _dedupe_by_content(
    rows: list[dict[str, Any]],
    *,
    existing: list[dict[str, Any]],
    source: str,
) -> list[dict[str, Any]]:
    """Drop rows whose (company, title) collides with another row in
    the batch OR with an existing in-DB row whose external_id differs.

    Greenhouse posts the same role under each office's location as a
    separate listing with a distinct external_id. The upsert's
    on_conflict key only matches by external_id so the duplicates
    sneak through. This helper closes that hole.

    Within-batch dedupe keeps the first row seen (input order is the
    poll cycle's discovery order, so this is reasonably stable). The
    cross-batch dedupe leaves the existing-in-DB row alone — only
    new incoming candidates with a different external_id are
    dropped. An upsert of the SAME external_id (the legitimate
    update path) is unaffected.
    """
    existing_by_key: dict[tuple[str, str], str] = {}
    for row in existing:
        key = _content_dedupe_key(
            row.get("company_name"), row.get("title")
        )
        # First-seen wins on the DB side too (existing rows may already
        # contain duplicates from before this dedupe existed — pin to
        # one of them as the canonical entry).
        existing_by_key.setdefault(key, row.get("external_id", ""))

    seen_in_batch: set[tuple[str, str]] = set()
    deduped: list[dict[str, Any]] = []
    skipped_within = 0
    skipped_cross = 0
    for row in rows:
        key = _content_dedupe_key(row.get("company_name"), row.get("title"))

        if key in seen_in_batch:
            skipped_within += 1
            continue

        existing_ext = existing_by_key.get(key)
        if existing_ext and existing_ext != row.get("external_id"):
            skipped_cross += 1
            continue

        seen_in_batch.add(key)
        deduped.append(row)

    if skipped_within or skipped_cross:
        logger.info(
            "dedupe %s: %d within-batch, %d cross-batch (kept %d of %d)",
            source,
            skipped_within,
            skipped_cross,
            len(deduped),
            len(rows),
        )
    return deduped


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


async def _batch_fetch_job_scores(
    supabase: Client, job_ids: list[str]
) -> dict[str, int]:
    """Return ``{job_id: score}`` for the given ids in a single round-trip.

    Callers in the poller fan out Stage 3 over N rows; without this batch
    helper each call did its own ``.eq("id", jid).single()`` lookup — N
    sequential queries to read scores that Stage 2 just wrote. One
    ``.in_()`` lookup replaces all of them.
    """
    if not job_ids:
        return {}
    resp = await asyncio.to_thread(
        supabase.table("jobs").select("id, score").in_("id", job_ids).execute
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return {
        cast(str, r["id"]): int(r.get("score") or 0)
        for r in rows
        if r.get("id") is not None
    }


async def _run_llm_scoring_for_row(
    supabase: Client,
    row_data: dict[str, Any],
    optimized_doc: OptimizedDoc,
    llm: LLMClient,
    target: JobTarget,
    *,
    current_score: int | None = None,
) -> None:
    """Stage 3: Run LLM analysis and mark target scores as complete.

    The caller may pass ``current_score`` to skip the per-job score
    lookup — strongly preferred when invoking in a fan-out loop, since
    Stage 2 already wrote the score and pre-fetching the batch via
    ``_batch_fetch_job_scores`` collapses N round-trips into 1. When
    omitted, falls back to a per-row ``.eq().single()`` lookup for
    callers that don't have a batch context.

    Blends keyword and LLM scores, updates global score, and marks all
    target scores for this job as 'complete'.

    Cache key is (job_posting_id, target.id, optimized_doc.id) — the
    same row is reused by the user-facing analysis flow when viewing
    the job under this target.

    Silently falls back to keyword-only score on any error.
    """
    job_id = row_data.get("id")
    if not job_id:
        return

    if current_score is None:
        # Single-row fallback for callers without a pre-fetched batch.
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


async def _resolve_user_targets_for_stage3(
    supabase: Client,
    active_targets: list[JobTarget],
    company_name: str,
) -> tuple[dict[str, JobTarget], dict[str, OptimizedDoc]]:
    """Pair each user with a primary active target + their optimized doc.

    Targets are global; ``user_targets`` is the junction. We fetch the
    junction once, build (user_id → first active target) and (user_id →
    optimized doc) maps, and skip users whose optimized doc hasn't been
    generated yet (onboarding incomplete) — keyword scoring still runs
    for them via stage 1 + stage 2.

    Returns ``(primary_by_user, user_optimized)``. ``company_name`` is
    used only for the skip-log message.
    """
    if not active_targets:
        return {}, {}

    target_ids = [t.id for t in active_targets]
    junction_resp = await asyncio.to_thread(
        supabase.table("user_targets")
        .select("target_id, user_id")
        .eq("is_active", True)
        .in_("target_id", target_ids)
        .execute
    )
    junction_rows = cast(list[dict[str, Any]], junction_resp.data or [])
    users_by_target: dict[str, list[str]] = {}
    for row in junction_rows:
        users_by_target.setdefault(row["target_id"], []).append(row["user_id"])

    primary_by_user: dict[str, JobTarget] = {}
    user_optimized: dict[str, OptimizedDoc] = {}
    for t in active_targets:
        for user_id in users_by_target.get(t.id, []):
            if user_id in primary_by_user:
                continue
            doc = await asyncio.to_thread(get_latest_optimized, supabase, user_id)
            if doc is None:
                logger.info(
                    "No optimized doc for user %s; skipping stage 3 for %s",
                    user_id,
                    company_name,
                )
                continue
            primary_by_user[user_id] = t
            user_optimized[user_id] = doc

    return primary_by_user, user_optimized


async def _poll_one_source(
    source: dict[str, Any],
    supabase: Client,
    *,
    active_targets: list[JobTarget] | None = None,
    stage3_users: tuple[dict[str, JobTarget], dict[str, OptimizedDoc]] | None = None,
) -> dict[str, Any]:
    """Poll a single job source. Returns a per-source summary dict.

    Three-stage scoring pipeline:
      1. Title-only match against each active target (inline, fast)
      2. Full JD match for stage-1 matches (async, after upsert)
      3. LLM analysis for top stage-2 scores (async)

    ``active_targets`` and ``stage3_users`` are cycle-wide constants —
    callers polling many sources should resolve them once and pass them
    in rather than paying one targets query plus one user/doc resolution
    per source. Both fall back to a per-source fetch when omitted.
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

        # Targets are normally resolved once per cycle by the caller; the
        # fallback keeps direct/legacy callers working.
        if active_targets is None:
            active_targets = await asyncio.to_thread(get_active_target, supabase)

        # Existing rows are needed in three places: skipping Phase 1
        # triage for already-known jobs, the (company, title) dedupe, and
        # stale-row archiving. Fetch once, up front.
        existing_query = (
            supabase.table("jobs")
            .select("id, external_id, title, company_name")
            .eq("source_id", source_id)
            .not_.in_("status", ["saved", "applied", "archived"])
        )
        existing_resp = await asyncio.to_thread(
            execute_with_retry_sync,
            existing_query.execute,
            label=f"poll existing {company_name}",
        )
        existing_rows = cast(list[dict[str, Any]], existing_resp.data or [])
        known_external_ids = {r.get("external_id") for r in existing_rows}

        # Phase 1: per-target LLM binary title triage (replaces cosine
        # prefilter). See ``app/services/relevance/title_triage.py``.
        # Verdicts: phase1_verdicts[target.id][1-based job idx] -> bool.
        # Missing entries treated as fail-open admit. Behind a feature
        # flag so the PR can ship dark; when flag is False the gate
        # admits everything (pass-through) and we rely on downstream
        # keyword scoring for filtering.
        #
        # Only NEW external_ids are triaged. Jobs already in the DB were
        # admitted on a previous cycle; re-triaging them re-paid the LLM
        # cost for the same titles on every poll. Known jobs simply have
        # no verdict entry, which the fail-open gate treats as admit.
        phase1_verdicts: dict[str, dict[int, TitleVerdict]] = {}
        triage_candidates = [
            (idx, job)
            for idx, job in enumerate(jobs)
            if job.external_id not in known_external_ids
        ]
        if settings.phase1_triage_enabled and active_targets and triage_candidates:
            llm = get_default_llm_client()
            titles = [job.title for _, job in triage_candidates]
            for active_target in active_targets:
                # Chunk to PHASE1_BATCH_SIZE per call. Sources usually
                # return well under one batch (10-200 jobs); larger
                # sources spread cost across multiple calls.
                target_verdicts: dict[int, TitleVerdict] = {}
                for start in range(0, len(titles), PHASE1_BATCH_SIZE):
                    batch = titles[start : start + PHASE1_BATCH_SIZE]
                    verdicts, result = await triage_titles(
                        llm, target=active_target, titles=batch
                    )
                    if result is not None:
                        try:
                            record_llm_cost(
                                supabase,
                                user_id=None,
                                purpose=PHASE1_PURPOSE,
                                result=result,
                                metadata={
                                    "target_id": active_target.id,
                                    "source": company_name,
                                    "batch_size": len(batch),
                                },
                            )
                        except Exception:
                            logger.exception(
                                "Failed to record Phase 1 cost for target %s",
                                active_target.id,
                            )
                    # Shift batch-local ids (1-based within the triage
                    # subset) to global 1-based job indices via the
                    # triage-candidate mapping.
                    for batch_idx, verdict in verdicts.items():
                        subset_pos = start + batch_idx - 1  # 0-based
                        if 0 <= subset_pos < len(triage_candidates):
                            global_idx = triage_candidates[subset_pos][0] + 1
                            target_verdicts[global_idx] = verdict
                phase1_verdicts[active_target.id] = target_verdicts

        def _any_target_admits(global_job_idx: int) -> bool:
            """``global_job_idx`` is 1-based (matches Phase 1's id contract).

            Fail-open: a missing verdict (LLM didn't return an id) is
            treated as PROMISING. Same semantics as before the
            confidence rollout.
            """
            if not phase1_verdicts:
                return True  # gate disabled or no targets — admit
            for target_verdicts in phase1_verdicts.values():
                v = target_verdicts.get(global_job_idx)
                if v is None or v.promising:
                    return True
            return False

        rows_to_upsert: list[dict[str, Any]] = []
        # Parallel map: external_id → 1-based Phase 1 idx. Stage 2 uses
        # this to look up per-(job, target) verdicts after the upsert
        # has resolved DB ids. Kept out of the upsert payload because
        # the jobs table doesn't have a column for it.
        phase1_idx_by_external_id: dict[str, int] = {}
        # Pre-DB drop counters for #845 funnel diagnostics. Order
        # matches the gate order below — first miss wins, mutually
        # exclusive. Emitted as a single `poll_funnel` log line at end
        # of cycle so an operator can grep one source's funnel without
        # a DB pass.
        dropped_phase1 = 0
        dropped_title_prematch = 0
        dropped_non_us = 0
        for idx, job in enumerate(jobs):
            # Phase 1 IDs are 1-based; the per-target verdict-check
            # below uses the same idx + 1 convention.
            if not _any_target_admits(idx + 1):
                dropped_phase1 += 1
                continue
            # Filter by target relevance instead of static keyword list
            if active_targets and not _title_matches_any_target(job.title, active_targets):
                dropped_title_prematch += 1
                continue
            if not _is_us_location(job.location_name):
                dropped_non_us += 1
                continue

            salary = job.salary_text or extract_salary_from_text(strip_html(job.content))

            phase1_idx_by_external_id[job.external_id] = idx + 1
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

        new_rows: list[dict[str, Any]] = []
        if rows_to_upsert:
            # Dedupe rows_to_upsert by (company, title). Both within
            # the current batch and against existing rows that have a
            # different external_id. This catches the case Greenhouse
            # surfaces the same role under multiple location offices as
            # separate listings (e.g. Smartsheet's "Professional Services
            # Business Development Director" at "-REMOTE, USA-" +
            # "Bellevue, WA, USA").
            rows_to_upsert = _dedupe_by_content(
                rows_to_upsert,
                existing=existing_rows,
                source=company_name,
            )

            upsert_query = supabase.table("jobs").upsert(
                rows_to_upsert, on_conflict="source_id,external_id"
            )
            upsert_resp = await asyncio.to_thread(
                execute_with_retry_sync,
                upsert_query.execute,
                label=f"poll upsert {company_name}",
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
                # Per-target Phase 1 verdicts (None when flag off): keyed by
                # the 1-based job idx assigned during the candidate-build
                # loop above. Each row in upsert_resp carries an
                # ``external_id`` we look up to get the idx, then to get the
                # verdict. Missing entries are fail-open (admit).
                target_verdicts = phase1_verdicts.get(active_target.id, {})

                async def _full_score_one(
                    row_data: dict[str, Any],
                    target: JobTarget = active_target,
                    verdicts: dict[int, TitleVerdict] = target_verdicts,
                ) -> None:
                    try:
                        ext_id = row_data.get("external_id", "")
                        phase1_idx = phase1_idx_by_external_id.get(ext_id)
                        verdict = (
                            verdicts.get(phase1_idx)
                            if phase1_idx is not None
                            else None
                        )
                        # Fail-open: missing verdict = admit (matches the
                        # pre-confidence rollout's `.get(idx, True)` default).
                        promising = verdict.promising if verdict is not None else True
                        phase1_confidence = verdict.confidence if verdict is not None else None
                        await asyncio.to_thread(
                            target_score_and_upsert,
                            supabase,
                            job_posting_id=row_data["id"],
                            title=row_data.get("title", ""),
                            description_html=row_data.get("description_html", ""),
                            target=target,
                            parsed_jd=jd_cache.get(row_data["id"]),
                            excluded_by_prefilter=not promising,
                            promising=promising if phase1_verdicts else None,
                            phase1_confidence=phase1_confidence,
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
            # Each user with an active target gets one LLM analysis per
            # job, using their personal optimized doc. Previously this
            # fetched a single ``user_id IS NULL`` optimized doc which
            # has never existed in production — so stage 3 silently
            # no-op'd since the multi-user migration.
            #
            # Targets are global rows (no user_id column); the user link
            # lives on ``user_targets``. One query maps active target IDs
            # to their owning users, then we group: per user pick the
            # first active target and that user's latest optimized doc.
            if stage3_users is not None:
                primary_by_user, user_optimized = stage3_users
            else:
                (
                    primary_by_user,
                    user_optimized,
                ) = await _resolve_user_targets_for_stage3(
                    supabase, active_targets, company_name
                )

            if settings.phase2_enabled and primary_by_user:
                # ---- Phase 2: LLM job-fit grading (#6) ----
                # Replaces the legacy Stage 3 keyword+LLM blend with the
                # Sonnet scorecard. ``run_phase2_for_jobs`` gates on the
                # Phase 1 ``promising`` verdict, honours the re-grade
                # contract, enforces the per-target daily cap, and applies
                # progressive batching. We re-aggregate the global
                # ``jobs.score`` afterwards because Phase 2 rewrites
                # ``scores.score`` (Stage 2's keyword value was a
                # placeholder until graded).
                llm = get_default_llm_client()
                cycle_rows = [
                    cast(dict[str, Any], r) for r in upsert_resp.data or []
                ]
                for uid, p2_target in primary_by_user.items():
                    try:
                        await run_phase2_for_jobs(
                            supabase,
                            llm,
                            target=p2_target,
                            payload=user_optimized[uid].payload,
                            jobs=cycle_rows,
                            user_id=uid,
                        )
                    except Exception:
                        logger.exception(
                            "Phase 2 grading failed for user %s / target %s",
                            uid,
                            p2_target.id,
                        )
                if stage2_ids:
                    try:
                        await asyncio.to_thread(
                            batch_update_global_scores, supabase, stage2_ids
                        )
                    except Exception:
                        logger.exception(
                            "Global score update failed after Phase 2"
                        )
            elif primary_by_user:
                llm = get_default_llm_client()
                llm_sem = asyncio.Semaphore(LLM_CONCURRENCY)

                # Pre-fetch scores once: Stage 2 just wrote them, and
                # _run_llm_scoring_for_row would otherwise issue one
                # .eq().single() per row in the fan-out below.
                stage3_ids = [
                    cast(str, cast(dict[str, Any], r).get("id"))
                    for r in upsert_resp.data or []
                    if cast(dict[str, Any], r).get("id")
                ]
                score_map = await _batch_fetch_job_scores(supabase, stage3_ids)

                async def _llm_one(
                    row_data: dict[str, Any],
                    target: JobTarget,
                    doc: OptimizedDoc,
                ) -> None:
                    async with llm_sem:
                        await _run_llm_scoring_for_row(
                            supabase,
                            row_data,
                            doc,
                            llm,
                            target,
                            current_score=score_map.get(
                                cast(str, row_data.get("id", "")), 0
                            ),
                        )

                await asyncio.gather(
                    *(
                        _llm_one(
                            cast(dict[str, Any], r),
                            primary_by_user[uid],
                            user_optimized[uid],
                        )
                        for r in upsert_resp.data or []
                        for uid in primary_by_user
                    )
                )

            # ---- Recency decay refresh (#5) ----
            # Re-derive ``scores.recency_score`` for every row touched
            # this cycle from the job's age, now that the fit scores are
            # settled. Gated on the flag so a disabled rollout skips the
            # extra writes — recency_score already mirrors score from the
            # upsert in that case, so the list sort is unaffected.
            if settings.recency_decay_enabled and stage2_ids:
                try:
                    await asyncio.to_thread(
                        refresh_recency_scores, supabase, stage2_ids
                    )
                except Exception:
                    logger.exception(
                        "Recency refresh failed for %s", company_name
                    )

        # Identify stale jobs no longer on the board
        stale_ids: list[str] = []
        if not jobs and existing_rows:
            # Mass-archive guard: several fetchers (workday in particular)
            # swallow API errors and return [] instead of raising, which is
            # indistinguishable from "the board emptied out". Archiving
            # everything on a zero-job fetch turns a transient upstream
            # hiccup into a wiped source, so we skip the stale pass and
            # leave the rows for a cycle where the fetch returns data.
            # Genuinely emptied boards stop producing new rows immediately;
            # their leftover rows age out via recency scoring instead.
            logger.warning(
                "poll %s returned 0 jobs but %d active rows exist — "
                "skipping stale-archive pass (suspected fetch failure)",
                company_name,
                len(existing_rows),
            )
        else:
            for existing_job in existing_rows:
                if existing_job["external_id"] not in all_external_ids:
                    stale_ids.append(existing_job["id"])

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

        # Funnel diagnostics for #845. One structured line per source per
        # cycle so an operator can `grep poll_funnel | grep <Company>` in
        # Railway and read where jobs are dropping pre-DB. The counts
        # are mutually exclusive — first gate to fire wins per job.
        per_target_phase1_no = {
            tid: sum(1 for v in verdicts.values() if not v.promising)
            for tid, verdicts in phase1_verdicts.items()
        }
        logger.info(
            "poll_funnel source=%s fetched=%d dropped_phase1=%d "
            "dropped_title_prematch=%d dropped_non_us=%d candidates=%d "
            "upserted_new=%d upserted_updated=%d archived=%d "
            "phase1_no_by_target=%s",
            company_name,
            len(jobs),
            dropped_phase1,
            dropped_title_prematch,
            dropped_non_us,
            len(rows_to_upsert),
            summary["new"],
            summary["updated"],
            summary["archived"],
            per_target_phase1_no or "{}",
        )

    except Exception:
        logger.exception("Poll failed for %s", company_name)
        summary["error"] = f"{company_name}: poll failed"

    return summary


async def poll_all_sources(supabase: Client) -> PollResult:
    sources_query = supabase.table("sources").select("*").eq("enabled", True)
    sources_resp = await asyncio.to_thread(sources_query.execute)
    sources = sources_resp.data or []

    # Cycle-wide constants resolved once instead of once per source:
    # active targets and the stage-3 (user → target/optimized-doc) maps.
    active_targets = await asyncio.to_thread(get_active_target, supabase)
    stage3_users = await _resolve_user_targets_for_stage3(
        supabase, active_targets, "(cycle prefetch)"
    )

    semaphore = asyncio.Semaphore(POLL_CONCURRENCY)

    async def _worker(raw_source: Any) -> dict[str, Any]:
        async with semaphore:
            return await _poll_one_source(
                cast(dict[str, Any], raw_source),
                supabase,
                active_targets=active_targets,
                stage3_users=stage3_users,
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

    active_targets = await asyncio.to_thread(get_active_target, supabase)
    stage3_users = await _resolve_user_targets_for_stage3(
        supabase, active_targets, "(cycle prefetch)"
    )

    semaphore = asyncio.Semaphore(POLL_CONCURRENCY)

    async def _worker(source: dict[str, Any]) -> dict[str, Any]:
        async with semaphore:
            return await _poll_one_source(
                source,
                supabase,
                active_targets=active_targets,
                stage3_users=stage3_users,
            )

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

        # Phase 1 per-target triage (single target). Same semantics as
        # ``_poll_one_source`` but the candidate set is one target, so
        # ``phase1_verdicts`` collapses to a single dict.
        target_verdicts: dict[int, TitleVerdict] = {}
        if settings.phase1_triage_enabled and jobs:
            llm = get_default_llm_client()
            titles = [job.title for job in jobs]
            for start in range(0, len(titles), PHASE1_BATCH_SIZE):
                batch = titles[start : start + PHASE1_BATCH_SIZE]
                verdicts, result = await triage_titles(
                    llm, target=target, titles=batch
                )
                if result is not None:
                    try:
                        record_llm_cost(
                            supabase,
                            user_id=None,
                            purpose=PHASE1_PURPOSE,
                            result=result,
                            metadata={
                                "target_id": target.id,
                                "source": company_name,
                                "batch_size": len(batch),
                            },
                        )
                    except Exception:
                        logger.exception(
                            "Failed to record Phase 1 cost for target %s",
                            target.id,
                        )
                for batch_idx, verdict in verdicts.items():
                    target_verdicts[start + batch_idx] = verdict

        rows_to_upsert: list[dict[str, Any]] = []
        phase1_idx_by_external_id: dict[str, int] = {}
        for idx, job in enumerate(jobs):
            # Phase 1 ids are 1-based. Fail-open when no verdict (gate
            # disabled or LLM dropped the entry).
            if target_verdicts:
                v = target_verdicts.get(idx + 1)
                if v is not None and not v.promising:
                    continue
            if not _title_matches_target(job.title, target.search_keywords):
                continue
            if not _is_us_location(job.location_name):
                continue

            salary = job.salary_text or extract_salary_from_text(strip_html(job.content))

            phase1_idx_by_external_id[job.external_id] = idx + 1
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
                    # Phase 1 verdict for this (job, this-target) pair.
                    # The gate already filtered out non-promising jobs
                    # above, so every row here is promising — but we
                    # still want ``scores.promising=True`` persisted so
                    # Phase 2 candidate selection can rely on it.
                    ext_id = row_data.get("external_id", "")
                    phase1_idx = phase1_idx_by_external_id.get(ext_id)
                    verdict = (
                        target_verdicts.get(phase1_idx)
                        if phase1_idx is not None
                        else None
                    )
                    promising = verdict.promising if verdict is not None else True
                    phase1_confidence = (
                        verdict.confidence if verdict is not None else None
                    )
                    await asyncio.to_thread(
                        target_score_and_upsert,
                        supabase,
                        job_posting_id=row_data["id"],
                        title=row_data.get("title", ""),
                        description_html=row_data.get("description_html", ""),
                        target=target,
                        parsed_jd=jd_cache.get(row_data["id"]),
                        excluded_by_prefilter=not promising,
                        promising=promising if target_verdicts else None,
                        phase1_confidence=phase1_confidence,
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

            # Stage 3: LLM scoring for qualified jobs (concurrent).
            # JobTarget is a global row with no user_id — resolve owning
            # users via the user_targets junction, then fetch each user's
            # optimized doc. The pre-fix ``get_latest(None)`` returned
            # nothing since no system-wide doc exists in the multi-user
            # schema.
            primary_by_user, user_optimized = await _resolve_user_targets_for_stage3(
                supabase, [target], company_name
            )
            if primary_by_user:
                llm = get_default_llm_client()
                llm_sem = asyncio.Semaphore(LLM_CONCURRENCY)

                # Pre-fetch scores once (Stage 2 just wrote them).
                stage3_ids_t = [
                    cast(str, cast(dict[str, Any], r).get("id"))
                    for r in upsert_resp.data or []
                    if cast(dict[str, Any], r).get("id")
                ]
                score_map_t = await _batch_fetch_job_scores(supabase, stage3_ids_t)

                async def _llm_one_t(
                    row_data: dict[str, Any],
                    doc: OptimizedDoc,
                ) -> None:
                    async with llm_sem:
                        await _run_llm_scoring_for_row(
                            supabase,
                            row_data,
                            doc,
                            llm,
                            target,
                            current_score=score_map_t.get(
                                cast(str, row_data.get("id", "")), 0
                            ),
                        )

                await asyncio.gather(
                    *(
                        _llm_one_t(cast(dict[str, Any], r), user_optimized[uid])
                        for r in upsert_resp.data or []
                        for uid in primary_by_user
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
    """Poll all enabled sources, filtering for jobs matching a target's search keywords.

    Skips inactive targets entirely (returns an empty ``PollResult``).
    The ``targets.is_active`` flag is the OR across all users via the
    user_targets trigger; if it's ``False`` no one currently has the
    target enabled, so a per-target poll would fan out work nobody
    will see. The /activate endpoint sets ``is_active`` to ``True``
    before calling this, so the activation pipeline still works.
    """
    if not target.is_active:
        logger.info(
            "poll_sources_for_target: skipping inactive target %s (%s)",
            target.id,
            target.label,
        )
        return PollResult(
            sources_polled=0, new_jobs=0, updated_jobs=0, archived_jobs=0, errors=[]
        )

    if not target.search_keywords:
        return PollResult(
            sources_polled=0, new_jobs=0, updated_jobs=0, archived_jobs=0,
            errors=["Target has no search keywords"],
        )

    sources_query = supabase.table("sources").select("*").eq("enabled", True)
    sources_resp = await asyncio.to_thread(sources_query.execute)
    sources = sources_resp.data or []

    # Optimized doc is fetched per-user inside
    # ``_poll_one_source_for_target`` now — the previous shared-doc fetch
    # (``user_id=None``) never returned a row in the multi-user schema.

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
