from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.services.ashby import fetch_ashby_jobs
from app.services.standard_job import StandardJob


def _mock_response(status_code: int, json_data: dict[str, Any] | None = None) -> MagicMock:
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
    result = await fetch_ashby_jobs("missing")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_http_error_returns_empty(mock_http_client):
    mock_http_client.get = AsyncMock(side_effect=httpx.HTTPError("boom"))
    result = await fetch_ashby_jobs("bad")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_valid_json_maps_jobs(mock_http_client):
    payload = {
        "jobs": [
            {
                "id": "ashby-001",
                "title": "Senior Frontend Engineer",
                "location": "Remote",
                "department": "Engineering",
                "descriptionHtml": "<p>desc</p>",
                "publishedAt": "2024-01-01T00:00:00Z",
                "jobUrl": "https://jobs.ashbyhq.com/acme/ashby-001",
            }
        ]
    }
    resp = _mock_response(200, payload)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_ashby_jobs("acme")
    assert len(result) == 1
    job = result[0]
    assert isinstance(job, StandardJob)
    assert job.external_id == "ashby-001"
    assert job.title == "Senior Frontend Engineer"
    assert job.location_name == "Remote"
    assert job.department == "Engineering"
    assert job.absolute_url == "https://jobs.ashbyhq.com/acme/ashby-001"


@pytest.mark.asyncio
async def test_fetch_missing_fields(mock_http_client):
    payload = {
        "jobs": [
            {
                "id": "x",
                "title": "Engineer",
            }
        ]
    }
    resp = _mock_response(200, payload)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_ashby_jobs("co")
    assert result[0].location_name is None
    assert result[0].department is None
    assert result[0].content == ""
