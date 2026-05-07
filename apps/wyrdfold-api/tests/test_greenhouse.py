from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.services.greenhouse import fetch_board_jobs
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
    result = await fetch_board_jobs("missing")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_http_error_returns_empty(mock_http_client):
    mock_http_client.get = AsyncMock(side_effect=httpx.HTTPError("boom"))
    result = await fetch_board_jobs("bad")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_valid_json_maps_jobs(mock_http_client):
    payload = {
        "jobs": [
            {
                "id": 123,
                "title": "Senior Frontend Engineer",
                "location": {"name": "Remote"},
                "departments": [{"name": "Engineering"}],
                "content": "<p>desc</p>",
                "updated_at": "2024-01-01T00:00:00Z",
                "absolute_url": "https://example.com/jobs/123",
            }
        ]
    }
    resp = _mock_response(200, payload)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_board_jobs("foo")
    assert len(result) == 1
    job = result[0]
    assert isinstance(job, StandardJob)
    assert job.external_id == "123"
    assert job.title == "Senior Frontend Engineer"
    assert job.location_name == "Remote"
    assert job.department == "Engineering"
    assert job.content == "<p>desc</p>"
    assert job.updated_at == "2024-01-01T00:00:00Z"
    assert job.absolute_url == "https://example.com/jobs/123"


@pytest.mark.asyncio
async def test_fetch_missing_location_and_departments(mock_http_client):
    payload = {
        "jobs": [
            {
                "id": 1,
                "title": "Engineer",
                "location": None,
                "departments": [],
                "content": "",
                "updated_at": "",
                "absolute_url": "",
            }
        ]
    }
    resp = _mock_response(200, payload)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_board_jobs("foo")
    assert result[0].location_name is None
    assert result[0].department is None
