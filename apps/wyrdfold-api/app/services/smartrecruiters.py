import asyncio
import logging
from typing import Any

from app.http_client import FetchExhaustedError, request_with_retry
from app.services.standard_job import StandardJob

logger = logging.getLogger(__name__)

SMARTRECRUITERS_BASE = "https://api.smartrecruiters.com/v1/companies"

# Cap on per-posting detail fetches per fan-out so we don't slam the
# SmartRecruiters API. A board with 500 postings still completes — just in
# batches.
_DETAIL_CONCURRENCY = 5


def _build_content(posting_detail: dict[str, Any]) -> str:
    """Assemble the full JD body from a posting-detail response.

    SmartRecruiters partitions the JD body across four ``jobAd.sections``
    keys: ``companyDescription``, ``jobDescription``, ``qualifications``,
    ``additionalInformation``. Each value is HTML-ish (``<p>``, ``<ul>``,
    ``<strong>`` etc.) but the API doesn't guarantee a full document, so
    we concatenate the four section bodies with paragraph breaks. The
    downstream sanitizer + parser are tolerant of fragment HTML.
    """
    sections = posting_detail.get("jobAd", {}).get("sections", {}) or {}
    parts: list[str] = []
    for key in (
        "companyDescription",
        "jobDescription",
        "qualifications",
        "additionalInformation",
    ):
        body = sections.get(key, {}).get("text")
        if body:
            parts.append(body)
    return "\n\n".join(parts)


async def _fetch_one_posting_detail(
    company_id: str, posting_id: str
) -> dict[str, Any] | None:
    """GET ``/postings/{posting_id}`` — the detail endpoint, which is the
    only one that actually returns ``jobAd.sections.*.text`` and the human
    facing ``postingUrl``. The list endpoint returns shells with empty
    sections even when called with ``?format=full``.
    """
    url = f"{SMARTRECRUITERS_BASE}/{company_id}/postings/{posting_id}"
    try:
        resp = await request_with_retry("GET", url)
    except FetchExhaustedError as exc:
        logger.warning(
            "smartrecruiters detail fetch exhausted retries for %s/%s: %s",
            company_id,
            posting_id,
            exc,
        )
        return None
    if resp.status_code == 404:
        return None
    if resp.status_code >= 400:
        logger.warning(
            "smartrecruiters detail %s/%s returned %d",
            company_id,
            posting_id,
            resp.status_code,
        )
        return None
    body = resp.json()
    return body if isinstance(body, dict) else None


async def fetch_smartrecruiters_jobs(company_id: str) -> list[StandardJob]:
    """Fetch jobs from SmartRecruiters' public Posting API.

    Two-phase fetch: list endpoint surfaces the posting IDs + shallow
    metadata, then the per-posting detail endpoint provides the JD body
    and the apply-page URL. The list endpoint's ``?format=full`` flag
    does NOT include the JD body — only the detail endpoint does.

    Per-posting fans out under ``_DETAIL_CONCURRENCY`` so a 500-posting
    board doesn't hammer the API on a single poll cycle. Per-posting
    failures degrade gracefully — the posting is dropped from this run
    and the next poll cycle will retry.
    """
    list_url = f"{SMARTRECRUITERS_BASE}/{company_id}/postings"
    try:
        resp = await request_with_retry("GET", list_url)
    except FetchExhaustedError as exc:
        logger.warning(
            "smartrecruiters list fetch exhausted retries for %s: %s",
            company_id,
            exc,
        )
        return []

    if resp.status_code == 404:
        return []
    if resp.status_code >= 400:
        logger.warning(
            "smartrecruiters %s returned %d for %s",
            company_id,
            resp.status_code,
            list_url,
        )
        return []

    data = resp.json()
    items = data.get("content", [])
    if not isinstance(items, list):
        return []

    # Phase 2: fan out detail fetches under a concurrency cap.
    semaphore = asyncio.Semaphore(_DETAIL_CONCURRENCY)

    async def _bounded_detail(posting_id: str) -> dict[str, Any] | None:
        async with semaphore:
            return await _fetch_one_posting_detail(company_id, posting_id)

    detail_results = await asyncio.gather(
        *(_bounded_detail(str(item.get("id", ""))) for item in items if item.get("id")),
        return_exceptions=True,
    )

    # Build a lookup so we can pair each list item with its detail body.
    details_by_id: dict[str, dict[str, Any]] = {}
    for result in detail_results:
        if isinstance(result, BaseException):
            logger.warning("smartrecruiters detail raised: %s", result)
            continue
        if result is None:
            continue
        pid = str(result.get("id", ""))
        if pid:
            details_by_id[pid] = result

    jobs: list[StandardJob] = []
    for item in items:
        list_id = str(item.get("id", ""))
        detail = details_by_id.get(list_id)
        if detail is None:
            # Detail fetch failed for this posting. Skip it — we'd otherwise
            # write a row with empty description_html, which the LLM analyzer
            # would 422 on anyway. The next poll cycle will retry.
            continue

        location = detail.get("location", {}) or {}
        city = location.get("city", "")
        country = location.get("country", "")
        location_str = f"{city}, {country}".strip(", ") if city or country else None

        department = detail.get("department", {}) or {}

        # Prefer ``postingUrl`` — that's the human-facing apply page
        # (``jobs.smartrecruiters.com/{company}/{id}-{slug}``). Fall back
        # in order: applyUrl → ref (API URL — last resort, the previous
        # code used this and that's why the LLM analyzer was handed a
        # JSON endpoint to parse as HTML).
        absolute_url = (
            detail.get("postingUrl")
            or detail.get("applyUrl")
            or detail.get("ref", "")
        )

        jobs.append(
            StandardJob(
                external_id=str(detail.get("id", list_id)),
                title=detail.get("name", item.get("name", "")),
                location_name=location_str,
                department=department.get("label") if department else None,
                content=_build_content(detail),
                updated_at=detail.get("releasedDate", item.get("releasedDate", "")),
                absolute_url=absolute_url,
            )
        )
    return jobs
