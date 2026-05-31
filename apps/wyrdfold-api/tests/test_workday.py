"""Tests for the Workday CXS fetcher.

The fetcher does a two-phase pull:
  1. ``POST .../wday/cxs/{tenant}/{site}/jobs`` — paginated list, surfaces
     ``externalPath`` + shallow metadata.
  2. ``GET .../wday/cxs/{tenant}/{site}{externalPath}`` — per-posting detail,
     the only endpoint that returns ``jobPostingInfo.jobDescription`` (the
     JD body) and ``jobPostingInfo.externalUrl`` (human-facing apply page).

Tests mock both phases independently.
"""

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.services.workday import fetch_workday_jobs


def _make_resp(status: int, json_data: dict[str, Any] | None = None) -> MagicMock:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status
    resp.json.return_value = json_data or {}
    resp.headers = {}
    return resp


@pytest.mark.asyncio
async def test_invalid_token_format() -> None:
    result = await fetch_workday_jobs("bad-token")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_pulls_jd_body_and_external_url_from_detail(
    mock_http_client: Any,
) -> None:
    """Happy path: list returns posting paths, detail returns the full JD
    body. We expect the JD body to land on ``content`` and the human-facing
    ``externalUrl`` to land on ``absolute_url`` — not the broken
    ``base_url/job/{path}`` construction the previous code produced.
    """
    # Phase 1: list endpoint returns two postings with empty descriptionTeaser
    # (the bug from real Workday boards).
    mock_http_client.post = AsyncMock(
        return_value=_make_resp(
            200,
            {
                "total": 2,
                "jobPostings": [
                    {
                        "externalPath": "/job/SF/Senior-SWE_JR1",
                        "title": "Senior SWE",
                        "locationsText": "San Francisco, CA",
                        "descriptionTeaser": "",  # always empty on the list
                        "postedOn": "2026-04-01",
                    },
                    {
                        "externalPath": "/job/NYC/PM_JR2",
                        "title": "Product Manager",
                        "locationsText": "New York, NY",
                        "descriptionTeaser": "",
                        "postedOn": "2026-04-02",
                    },
                ],
            },
        )
    )

    # Phase 2: detail endpoint returns the full body + externalUrl.
    detail_responses = {
        "/job/SF/Senior-SWE_JR1": _make_resp(
            200,
            {
                "jobPostingInfo": {
                    "title": "Senior SWE",
                    "jobDescription": "<p>Build distributed systems</p>",
                    "externalUrl": (
                        "https://example.wd12.myworkdayjobs.com/External/job/SF/Senior-SWE_JR1"
                    ),
                    "postedOn": "2026-04-01",
                }
            },
        ),
        "/job/NYC/PM_JR2": _make_resp(
            200,
            {
                "jobPostingInfo": {
                    "title": "Product Manager",
                    "jobDescription": "<p>Manage product</p>",
                    "externalUrl": (
                        "https://example.wd12.myworkdayjobs.com/External/job/NYC/PM_JR2"
                    ),
                    "postedOn": "2026-04-02",
                }
            },
        ),
    }

    async def _detail_get(url: str, **_: Any) -> MagicMock:
        # Detail URL is base + cxs prefix + site + externalPath
        for path, resp in detail_responses.items():
            if url.endswith(path):
                return resp
        return _make_resp(404)

    mock_http_client.get = AsyncMock(side_effect=_detail_get)

    token = "https://example.wd12.myworkdayjobs.com|example|External"
    jobs = await fetch_workday_jobs(token)

    assert len(jobs) == 2
    assert jobs[0].title == "Senior SWE"
    assert jobs[0].external_id == "/job/SF/Senior-SWE_JR1"
    assert jobs[0].location_name == "San Francisco, CA"
    assert jobs[0].content == "<p>Build distributed systems</p>"
    # The detail's ``externalUrl`` wins — not the broken old base/job/path.
    assert (
        jobs[0].absolute_url
        == "https://example.wd12.myworkdayjobs.com/External/job/SF/Senior-SWE_JR1"
    )
    assert jobs[1].title == "Product Manager"
    assert jobs[1].content == "<p>Manage product</p>"


@pytest.mark.asyncio
async def test_fetch_falls_back_to_constructed_url_when_external_url_missing(
    mock_http_client: Any,
) -> None:
    """If the detail response omits ``externalUrl`` we construct the URL
    from base + site + externalPath — the correct form, not the previous
    code's broken ``base/job/{path}`` which double-prefixed ``/job/``.
    """
    mock_http_client.post = AsyncMock(
        return_value=_make_resp(
            200,
            {
                "total": 1,
                "jobPostings": [
                    {
                        "externalPath": "/job/Remote/Designer_JR3",
                        "title": "Designer",
                        "locationsText": "Remote",
                        "postedOn": "2026-04-03",
                    },
                ],
            },
        )
    )

    async def _detail_get(url: str, **_: Any) -> MagicMock:
        return _make_resp(
            200,
            {
                "jobPostingInfo": {
                    "title": "Designer",
                    "jobDescription": "<p>Design things</p>",
                    # externalUrl deliberately omitted.
                    "postedOn": "2026-04-03",
                }
            },
        )

    mock_http_client.get = AsyncMock(side_effect=_detail_get)

    token = "https://example.wd12.myworkdayjobs.com|example|External"
    jobs = await fetch_workday_jobs(token)

    assert len(jobs) == 1
    assert (
        jobs[0].absolute_url
        == "https://example.wd12.myworkdayjobs.com/External/job/Remote/Designer_JR3"
    )


@pytest.mark.asyncio
async def test_fetch_drops_posting_when_detail_fetch_404s(
    mock_http_client: Any,
) -> None:
    """A 404 from the detail endpoint should drop that posting, not write
    an empty-body row that the LLM analyzer would 422 on every retry.
    """
    mock_http_client.post = AsyncMock(
        return_value=_make_resp(
            200,
            {
                "total": 2,
                "jobPostings": [
                    {
                        "externalPath": "/job/Skipped_JR4",
                        "title": "Skipped",
                        "locationsText": "Remote",
                        "postedOn": "2026-04-04",
                    },
                    {
                        "externalPath": "/job/Kept_JR5",
                        "title": "Kept",
                        "locationsText": "Remote",
                        "postedOn": "2026-04-05",
                    },
                ],
            },
        )
    )

    async def _detail_get(url: str, **_: Any) -> MagicMock:
        if url.endswith("/job/Kept_JR5"):
            return _make_resp(
                200,
                {
                    "jobPostingInfo": {
                        "title": "Kept",
                        "jobDescription": "<p>Kept body</p>",
                        "externalUrl": "https://example.wd12.myworkdayjobs.com/External/job/Kept_JR5",
                        "postedOn": "2026-04-05",
                    }
                },
            )
        return _make_resp(404)

    mock_http_client.get = AsyncMock(side_effect=_detail_get)

    token = "https://example.wd12.myworkdayjobs.com|example|External"
    jobs = await fetch_workday_jobs(token)

    assert len(jobs) == 1
    assert jobs[0].title == "Kept"
    assert jobs[0].external_id == "/job/Kept_JR5"


@pytest.mark.asyncio
async def test_404_on_list_returns_empty(mock_http_client: Any) -> None:
    """A 404 on the list endpoint short-circuits — no detail calls fire."""
    mock_http_client.post = AsyncMock(return_value=_make_resp(404))
    mock_http_client.get = AsyncMock(
        side_effect=AssertionError("detail must not be called")
    )
    token = "https://example.wd5.myworkdayjobs.com|example|Site"
    jobs = await fetch_workday_jobs(token)
    assert jobs == []


@pytest.mark.asyncio
async def test_network_error_on_list_returns_empty(mock_http_client: Any) -> None:
    mock_http_client.post = AsyncMock(side_effect=httpx.HTTPError("timeout"))
    mock_http_client.get = AsyncMock(
        side_effect=AssertionError("detail must not be called")
    )
    token = "https://example.wd5.myworkdayjobs.com|example|Site"
    jobs = await fetch_workday_jobs(token)
    assert jobs == []
