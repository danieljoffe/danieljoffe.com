import asyncio
import logging
from typing import Any

from app.http_client import FetchExhaustedError, request_with_retry
from app.services.standard_job import StandardJob

logger = logging.getLogger(__name__)

MAX_JOBS = 200
PAGE_SIZE = 20
# Cap on per-posting detail fetches in flight so a 200-posting board doesn't
# slam Workday's CXS endpoint. Five mirrors the SmartRecruiters fan-out.
_DETAIL_CONCURRENCY = 5


async def _fetch_one_posting_detail(
    *, base_url: str, tenant: str, site: str, external_path: str
) -> dict[str, Any] | None:
    """GET the per-posting detail endpoint.

    Workday's CXS detail URL is the same base + cxs prefix + site + the
    externalPath returned by the list endpoint, e.g.
    ``https://salesforce.wd12.myworkdayjobs.com/wday/cxs/salesforce/External_Career_Site/job/Japan---Tokyo/Senior-Manager--Sales_JR343895``.
    The response carries ``jobPostingInfo.jobDescription`` (the JD body
    we want) and ``jobPostingInfo.externalUrl`` (the human-facing apply
    page).
    """
    url = f"{base_url}/wday/cxs/{tenant}/{site}{external_path}"
    try:
        resp = await request_with_retry("GET", url)
    except FetchExhaustedError as exc:
        logger.warning(
            "workday detail fetch exhausted retries for %s%s: %s",
            base_url,
            external_path,
            exc,
        )
        return None
    if resp.status_code == 404:
        return None
    if resp.status_code >= 400:
        logger.warning(
            "workday detail %s returned %d for %s",
            base_url,
            resp.status_code,
            external_path,
        )
        return None
    body = resp.json()
    if not isinstance(body, dict):
        return None
    info = body.get("jobPostingInfo")
    return info if isinstance(info, dict) else None


async def fetch_workday_jobs(board_token: str) -> list[StandardJob]:
    """Fetch jobs from Workday's internal CXS API.

    board_token format: "{base_url}|{tenant}|{site}"
    e.g. "https://salesforce.wd12.myworkdayjobs.com|salesforce|External_Career_Site"

    Two-phase fetch: paginated list endpoint surfaces titles + externalPaths,
    then per-posting detail endpoint returns the JD body and the human-facing
    apply URL. The list response's ``descriptionTeaser`` field is empty on
    every Workday board I've probed; the body lives exclusively on the
    detail endpoint. Without this we ship rows with ``description_html = ""``
    and the LLM analyzer 422s with "no description to analyze".

    Per-posting detail fetches fan out under ``_DETAIL_CONCURRENCY``. A
    posting whose detail fetch fails is dropped from this run rather than
    written with an empty body; the next poll cycle retries.
    """
    parts = board_token.split("|")
    if len(parts) != 3:
        return []

    base_url, tenant, site = parts
    list_url = f"{base_url}/wday/cxs/{tenant}/{site}/jobs"

    # Phase 1: paginated list pull. Collect (externalPath, list_item) so we
    # can pair list-time metadata (locationsText, postedOn) with detail-time
    # body when we fan out.
    shallow: list[dict[str, Any]] = []
    offset = 0
    while offset < MAX_JOBS:
        try:
            resp = await request_with_retry(
                "POST",
                list_url,
                json={
                    "appliedFacets": {},
                    "limit": PAGE_SIZE,
                    "offset": offset,
                    "searchText": "",
                },
            )
        except FetchExhaustedError as exc:
            logger.warning(
                "workday list fetch exhausted retries for %s (offset %d): %s",
                board_token,
                offset,
                exc,
            )
            return []

        if resp.status_code != 200:
            logger.warning(
                "workday %s returned %d at offset %d",
                board_token,
                resp.status_code,
                offset,
            )
            return []

        data = resp.json()
        postings = data.get("jobPostings", [])
        if not postings:
            break
        shallow.extend(postings)

        total = data.get("total", 0)
        offset += PAGE_SIZE
        if offset >= total:
            break

    if not shallow:
        return []

    # Phase 2: fan out detail fetches under the concurrency cap.
    semaphore = asyncio.Semaphore(_DETAIL_CONCURRENCY)

    async def _bounded_detail(external_path: str) -> dict[str, Any] | None:
        if not external_path:
            return None
        async with semaphore:
            return await _fetch_one_posting_detail(
                base_url=base_url,
                tenant=tenant,
                site=site,
                external_path=external_path,
            )

    paths = [item.get("externalPath", "") for item in shallow]
    detail_results = await asyncio.gather(
        *(_bounded_detail(p) for p in paths),
        return_exceptions=True,
    )

    jobs: list[StandardJob] = []
    for list_item, detail_result in zip(shallow, detail_results, strict=True):
        if isinstance(detail_result, BaseException):
            logger.warning("workday detail raised: %s", detail_result)
            continue
        if detail_result is None:
            # Detail fetch failed. Drop the posting — see module docstring
            # for the trade-off rationale.
            continue

        external_path = list_item.get("externalPath", "")
        # Prefer the detail endpoint's ``externalUrl`` (the apply page);
        # fall back to constructing it from base + site + path. Note the
        # previous code did ``f"{base_url}/job/{external_path}"`` which
        # produced a broken URL with a doubled ``/job/`` segment whenever
        # ``externalPath`` already started with ``/job/...`` (it always
        # does). The correct construction is base + site + path.
        absolute_url = (
            detail_result.get("externalUrl")
            or f"{base_url}/{site}{external_path}"
            if external_path
            else ""
        )

        jobs.append(
            StandardJob(
                external_id=external_path
                or str(list_item.get("bulletFields", [""])[0]),
                title=detail_result.get("title", list_item.get("title", "")),
                location_name=list_item.get("locationsText"),
                department=None,
                content=detail_result.get("jobDescription", ""),
                updated_at=detail_result.get("postedOn", list_item.get("postedOn", "")),
                absolute_url=absolute_url,
            )
        )
    return jobs
