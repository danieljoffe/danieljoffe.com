from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.services.smartrecruiters import fetch_smartrecruiters_jobs
from app.services.standard_job import StandardJob


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


@pytest.mark.asyncio
async def test_fetch_404_returns_empty(mock_http_client):
    resp = _mock_response(404)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_smartrecruiters_jobs("missing-co")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_http_error_returns_empty(mock_http_client):
    mock_http_client.get = AsyncMock(side_effect=httpx.HTTPError("boom"))
    result = await fetch_smartrecruiters_jobs("bad")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_valid_json_maps_jobs(mock_http_client):
    payload = {
        "content": [
            {
                "id": "sr-001",
                "name": "Backend Engineer",
                "location": {"city": "Berlin", "country": "DE"},
                "department": {"label": "Engineering"},
                "company": {"website": "https://example.com"},
                "ref": "https://api.smartrecruiters.com/v1/companies/ex/postings/sr-001",
                "releasedDate": "2026-04-01T00:00:00Z",
                "jobAd": {
                    "sections": {
                        "jobDescription": {"text": "Build APIs"},
                    }
                },
            }
        ]
    }
    resp = _mock_response(200, payload)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_smartrecruiters_jobs("example")

    assert len(result) == 1
    job = result[0]
    assert isinstance(job, StandardJob)
    assert job.external_id == "sr-001"
    assert job.title == "Backend Engineer"
    assert job.location_name == "Berlin, DE"
    assert job.department == "Engineering"
    assert job.content == "Build APIs"
    assert job.absolute_url == "https://example.com"


@pytest.mark.asyncio
async def test_fetch_missing_optional_fields(mock_http_client):
    payload = {
        "content": [
            {
                "id": "sr-002",
                "name": "Designer",
                "location": {},
                "jobAd": {"sections": {}},
            }
        ]
    }
    resp = _mock_response(200, payload)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_smartrecruiters_jobs("co")

    assert len(result) == 1
    assert result[0].location_name is None
    assert result[0].department is None
    assert result[0].content == ""


@pytest.mark.asyncio
async def test_fetch_empty_content_returns_empty(mock_http_client):
    resp = _mock_response(200, {"content": []})
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_smartrecruiters_jobs("empty")
    assert result == []
