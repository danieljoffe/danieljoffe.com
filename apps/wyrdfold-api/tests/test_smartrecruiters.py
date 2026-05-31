"""Tests for the SmartRecruiters fetcher.

The fetcher does a two-phase pull:
  1. ``GET /v1/companies/{slug}/postings`` — surfaces posting IDs + shallow
     metadata.
  2. ``GET /v1/companies/{slug}/postings/{id}`` — per-posting detail, the
     only endpoint that actually returns the JD body and ``postingUrl``.

Tests mock both phases by switching on the request URL.
"""

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.services.smartrecruiters import fetch_smartrecruiters_jobs
from app.services.standard_job import StandardJob

_LIST_URL = "https://api.smartrecruiters.com/v1/companies/{slug}/postings"
_DETAIL_URL = (
    "https://api.smartrecruiters.com/v1/companies/{slug}/postings/{posting_id}"
)


def _mock_response(
    status_code: int, json_data: dict[str, Any] | None = None
) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    if status_code >= 400 and status_code != 404:
        resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            "error", request=MagicMock(), response=resp
        )
    else:
        resp.raise_for_status.return_value = None
    return resp


def _two_phase_handler(
    *,
    list_response: MagicMock,
    detail_responses: dict[str, MagicMock] | None = None,
):
    """Build an AsyncMock side_effect that returns the list response for the
    list-endpoint URL, and the corresponding per-id detail response for any
    detail-endpoint URL. Default detail responses are 404 so unmapped IDs
    fall out of the result.
    """
    detail_responses = detail_responses or {}

    async def _handler(url, **_):
        # The first call is always the list endpoint.
        if "/postings/" not in url and url.endswith("/postings"):
            return list_response
        # Detail endpoint — extract the posting id from the URL.
        posting_id = url.rsplit("/", 1)[-1]
        return detail_responses.get(posting_id, _mock_response(404))

    return _handler


@pytest.mark.asyncio
async def test_fetch_404_returns_empty(mock_http_client):
    """List endpoint 404 → no detail calls, empty result."""
    list_resp = _mock_response(404)
    mock_http_client.get = AsyncMock(
        side_effect=_two_phase_handler(list_response=list_resp)
    )
    result = await fetch_smartrecruiters_jobs("missing-co")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_http_error_returns_empty(mock_http_client):
    """A transport error on the list call short-circuits to []."""
    mock_http_client.get = AsyncMock(side_effect=httpx.HTTPError("boom"))
    result = await fetch_smartrecruiters_jobs("bad")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_pulls_jd_body_and_posting_url_from_detail(mock_http_client):
    """Happy path: list returns a posting id, detail returns the full JD body
    across all four ``jobAd.sections`` keys plus a ``postingUrl``. We expect
    the returned StandardJob to carry the concatenated body and the
    human-facing posting URL — not the API endpoint URL.
    """
    list_payload = {
        "content": [
            {
                "id": "sr-001",
                "name": "Backend Engineer",
                "location": {"city": "Berlin", "country": "DE"},
                "department": {"label": "Engineering"},
                "releasedDate": "2026-04-01T00:00:00Z",
            }
        ]
    }
    detail_payload = {
        "id": "sr-001",
        "name": "Backend Engineer",
        "location": {"city": "Berlin", "country": "DE"},
        "department": {"label": "Engineering"},
        "releasedDate": "2026-04-01T00:00:00Z",
        "postingUrl": (
            "https://jobs.smartrecruiters.com/example/sr-001-backend-engineer"
        ),
        "applyUrl": (
            "https://jobs.smartrecruiters.com/example/sr-001-backend-engineer?oga=true"
        ),
        "ref": "https://api.smartrecruiters.com/v1/companies/example/postings/sr-001",
        "jobAd": {
            "sections": {
                "companyDescription": {"text": "<p>About Example</p>"},
                "jobDescription": {"text": "<p>Build APIs</p>"},
                "qualifications": {"text": "<p>5+ years Python</p>"},
                "additionalInformation": {"text": "<p>Remote OK</p>"},
            }
        },
    }
    mock_http_client.get = AsyncMock(
        side_effect=_two_phase_handler(
            list_response=_mock_response(200, list_payload),
            detail_responses={"sr-001": _mock_response(200, detail_payload)},
        )
    )

    result = await fetch_smartrecruiters_jobs("example")

    assert len(result) == 1
    job = result[0]
    assert isinstance(job, StandardJob)
    assert job.external_id == "sr-001"
    assert job.title == "Backend Engineer"
    # The four section bodies should appear in the assembled content, in
    # order, separated by blank lines.
    assert "<p>About Example</p>" in job.content
    assert "<p>Build APIs</p>" in job.content
    assert "<p>5+ years Python</p>" in job.content
    assert "<p>Remote OK</p>" in job.content
    # The posting URL — the human-facing apply page — wins over applyUrl
    # and over the API ``ref``. Previously the fetcher used ``company.website``
    # which fell through to ``ref`` (the API URL) and that's why the LLM
    # analyzer was being handed JSON instead of HTML.
    assert (
        job.absolute_url
        == "https://jobs.smartrecruiters.com/example/sr-001-backend-engineer"
    )


@pytest.mark.asyncio
async def test_fetch_falls_back_to_apply_url_when_posting_url_missing(
    mock_http_client,
):
    """If ``postingUrl`` is absent we use ``applyUrl`` next."""
    list_payload = {"content": [{"id": "sr-002", "name": "Designer"}]}
    detail_payload = {
        "id": "sr-002",
        "name": "Designer",
        "applyUrl": "https://jobs.smartrecruiters.com/example/sr-002-designer?oga=true",
        "ref": "https://api.smartrecruiters.com/v1/companies/example/postings/sr-002",
        "jobAd": {"sections": {"jobDescription": {"text": "<p>Design things</p>"}}},
    }
    mock_http_client.get = AsyncMock(
        side_effect=_two_phase_handler(
            list_response=_mock_response(200, list_payload),
            detail_responses={"sr-002": _mock_response(200, detail_payload)},
        )
    )

    result = await fetch_smartrecruiters_jobs("example")

    assert len(result) == 1
    assert (
        result[0].absolute_url
        == "https://jobs.smartrecruiters.com/example/sr-002-designer?oga=true"
    )


@pytest.mark.asyncio
async def test_fetch_drops_posting_when_detail_fetch_404s(mock_http_client):
    """A 404 on the detail endpoint should drop that posting from the
    result — we don't want to write a row with an empty description_html
    because the LLM analyzer would 422 on it on every retry.
    """
    list_payload = {
        "content": [
            {"id": "sr-003", "name": "Skipped"},
            {"id": "sr-004", "name": "Kept"},
        ]
    }
    detail_kept = {
        "id": "sr-004",
        "name": "Kept",
        "postingUrl": "https://jobs.smartrecruiters.com/example/sr-004-kept",
        "jobAd": {"sections": {"jobDescription": {"text": "<p>Kept body</p>"}}},
    }
    mock_http_client.get = AsyncMock(
        side_effect=_two_phase_handler(
            list_response=_mock_response(200, list_payload),
            detail_responses={
                # sr-003 missing → defaults to 404 → dropped
                "sr-004": _mock_response(200, detail_kept),
            },
        )
    )

    result = await fetch_smartrecruiters_jobs("example")

    assert len(result) == 1
    assert result[0].external_id == "sr-004"


@pytest.mark.asyncio
async def test_fetch_empty_content_returns_empty(mock_http_client):
    """An empty ``content`` array on the list response → no detail calls."""
    mock_http_client.get = AsyncMock(
        side_effect=_two_phase_handler(
            list_response=_mock_response(200, {"content": []})
        )
    )
    result = await fetch_smartrecruiters_jobs("empty")
    assert result == []
