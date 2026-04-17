from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.workday import fetch_workday_jobs


def _make_resp(status: int, json_data: object) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = json_data
    return resp


@pytest.mark.asyncio
async def test_invalid_token_format():
    result = await fetch_workday_jobs("bad-token")
    assert result == []


@pytest.mark.asyncio
async def test_valid_response():
    mock_client = AsyncMock()
    mock_client.post.return_value = _make_resp(
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
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch(
        "app.services.workday.httpx.AsyncClient",
        return_value=mock_client,
    ):
        token = "https://salesforce.wd12.myworkdayjobs.com|salesforce|External"
        jobs = await fetch_workday_jobs(token)

    assert len(jobs) == 2
    assert jobs[0].title == "Software Engineer"
    assert jobs[0].external_id == "job/abc123"
    assert jobs[0].location_name == "San Francisco, CA"
    assert jobs[1].title == "Product Manager"


@pytest.mark.asyncio
async def test_404_returns_empty():
    mock_client = AsyncMock()
    mock_client.post.return_value = _make_resp(404, {})
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch(
        "app.services.workday.httpx.AsyncClient",
        return_value=mock_client,
    ):
        token = "https://example.wd5.myworkdayjobs.com|example|Site"
        jobs = await fetch_workday_jobs(token)

    assert jobs == []


@pytest.mark.asyncio
async def test_network_error():
    mock_client = AsyncMock()
    mock_client.post.side_effect = httpx.HTTPError("timeout")
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch(
        "app.services.workday.httpx.AsyncClient",
        return_value=mock_client,
    ):
        token = "https://example.wd5.myworkdayjobs.com|example|Site"
        jobs = await fetch_workday_jobs(token)

    assert jobs == []
