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
async def test_valid_response(mock_http_client: Any) -> None:
    mock_http_client.post = AsyncMock(
        return_value=_make_resp(
            200,
            {
                "total": 2,
                "jobPostings": [
                    {
                        "externalPath": "job/abc123",
                        "title": "Software Engineer",
                        "locationsText": "San Francisco, CA",
                        "descriptionTeaser": "Build things",
                        "postedOn": "2026-04-01",
                        "bulletFields": ["abc123"],
                    },
                    {
                        "externalPath": "job/def456",
                        "title": "Product Manager",
                        "locationsText": "Remote",
                        "descriptionTeaser": "Manage things",
                        "postedOn": "2026-04-02",
                        "bulletFields": ["def456"],
                    },
                ],
            },
        )
    )

    token = "https://salesforce.wd12.myworkdayjobs.com|salesforce|External"
    jobs = await fetch_workday_jobs(token)

    assert len(jobs) == 2
    assert jobs[0].title == "Software Engineer"
    assert jobs[0].external_id == "job/abc123"
    assert jobs[0].location_name == "San Francisco, CA"
    assert jobs[1].title == "Product Manager"


@pytest.mark.asyncio
async def test_404_returns_empty(mock_http_client: Any) -> None:
    mock_http_client.post = AsyncMock(return_value=_make_resp(404))
    token = "https://example.wd5.myworkdayjobs.com|example|Site"
    jobs = await fetch_workday_jobs(token)
    assert jobs == []


@pytest.mark.asyncio
async def test_network_error(mock_http_client: Any) -> None:
    mock_http_client.post = AsyncMock(side_effect=httpx.HTTPError("timeout"))
    token = "https://example.wd5.myworkdayjobs.com|example|Site"
    jobs = await fetch_workday_jobs(token)
    assert jobs == []
