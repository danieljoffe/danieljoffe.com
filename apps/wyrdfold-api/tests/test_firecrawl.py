import json
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.services.firecrawl import (
    _make_external_id,
    fetch_firecrawl_jobs,
)
from app.services.standard_job import StandardJob

_SUCCESS_RESPONSE = {
    "success": True,
    "data": {
        "json": {
            "jobs": [
                {
                    "title": "Senior Frontend Engineer",
                    "location": "San Francisco, CA",
                    "department": "Engineering",
                    "url": "https://example.com/jobs/sfe",
                    "description": "Build amazing UIs",
                },
                {
                    "title": "Product Designer",
                    "location": "Remote",
                    "department": "Design",
                    "url": "https://example.com/jobs/pd",
                    "description": "Design product experiences",
                },
            ]
        }
    },
}

_EMPTY_RESPONSE = {"success": True, "data": {"json": {"jobs": []}}}

_PARTIAL_RESPONSE = {
    "success": True,
    "data": {
        "json": {
            "jobs": [
                {"title": "Backend Engineer"},
                {"title": "", "location": "NYC"},
                {"description": "No title here"},
            ]
        }
    },
}


def _mock_response(status_code: int, body: dict | str) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = body if isinstance(body, str) else json.dumps(body)
    resp.json.return_value = body if isinstance(body, dict) else {}
    return resp


# --- _make_external_id ---


class TestMakeExternalId:
    def test_deterministic(self):
        id1 = _make_external_id("https://example.com/careers", "Engineer", "NYC")
        id2 = _make_external_id("https://example.com/careers", "Engineer", "NYC")
        assert id1 == id2

    def test_different_inputs_different_ids(self):
        id1 = _make_external_id("https://example.com/careers", "Engineer", "NYC")
        id2 = _make_external_id("https://example.com/careers", "Designer", "NYC")
        assert id1 != id2

    def test_length(self):
        ext_id = _make_external_id("https://example.com", "Job", None)
        assert len(ext_id) == 16

    def test_none_location(self):
        id1 = _make_external_id("https://example.com", "Job", None)
        id2 = _make_external_id("https://example.com", "Job", "")
        # None and "" both map to empty string in the hash
        assert id1 == id2


# --- fetch_firecrawl_jobs ---


@pytest.mark.asyncio
async def test_fetch_success(mock_http_client, monkeypatch):
    monkeypatch.setattr("app.services.firecrawl.settings.firecrawl_api_key", "fc-test")
    mock_http_client.post = AsyncMock(return_value=_mock_response(200, _SUCCESS_RESPONSE))

    result = await fetch_firecrawl_jobs("https://example.com/careers")

    assert len(result) == 2
    assert all(isinstance(j, StandardJob) for j in result)

    job = result[0]
    assert job.title == "Senior Frontend Engineer"
    assert job.location_name == "San Francisco, CA"
    assert job.department == "Engineering"
    assert job.absolute_url == "https://example.com/jobs/sfe"
    assert job.content == "Build amazing UIs"
    assert len(job.external_id) == 16

    assert result[1].title == "Product Designer"


@pytest.mark.asyncio
async def test_fetch_empty_jobs(mock_http_client, monkeypatch):
    monkeypatch.setattr("app.services.firecrawl.settings.firecrawl_api_key", "fc-test")
    mock_http_client.post = AsyncMock(return_value=_mock_response(200, _EMPTY_RESPONSE))

    result = await fetch_firecrawl_jobs("https://example.com/careers")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_skips_jobs_without_title(mock_http_client, monkeypatch):
    monkeypatch.setattr("app.services.firecrawl.settings.firecrawl_api_key", "fc-test")
    mock_http_client.post = AsyncMock(return_value=_mock_response(200, _PARTIAL_RESPONSE))

    result = await fetch_firecrawl_jobs("https://example.com/careers")

    # Only the first job has a non-empty title
    assert len(result) == 1
    assert result[0].title == "Backend Engineer"
    assert result[0].location_name is None
    assert result[0].department is None


@pytest.mark.asyncio
async def test_fetch_no_api_key(mock_http_client, monkeypatch):
    monkeypatch.setattr("app.services.firecrawl.settings.firecrawl_api_key", "")

    result = await fetch_firecrawl_jobs("https://example.com/careers")
    assert result == []
    # Should not make any HTTP calls
    mock_http_client.post.assert_not_called()


@pytest.mark.asyncio
async def test_fetch_api_error(mock_http_client, monkeypatch):
    monkeypatch.setattr("app.services.firecrawl.settings.firecrawl_api_key", "fc-test")
    mock_http_client.post = AsyncMock(return_value=_mock_response(500, "Internal Server Error"))

    result = await fetch_firecrawl_jobs("https://example.com/careers")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_network_error(mock_http_client, monkeypatch):
    monkeypatch.setattr("app.services.firecrawl.settings.firecrawl_api_key", "fc-test")
    mock_http_client.post = AsyncMock(side_effect=httpx.HTTPError("timeout"))

    result = await fetch_firecrawl_jobs("https://example.com/careers")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_non_json_response(mock_http_client, monkeypatch):
    monkeypatch.setattr("app.services.firecrawl.settings.firecrawl_api_key", "fc-test")
    resp = MagicMock()
    resp.status_code = 200
    resp.text = "<html>not json</html>"
    resp.json.side_effect = ValueError("No JSON")
    mock_http_client.post = AsyncMock(return_value=resp)

    result = await fetch_firecrawl_jobs("https://example.com/careers")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_malformed_extraction(mock_http_client, monkeypatch):
    """Firecrawl returns 200 but extraction data is not the expected shape."""
    monkeypatch.setattr("app.services.firecrawl.settings.firecrawl_api_key", "fc-test")
    bad_shape = {"success": True, "data": {"json": {"jobs": "not a list"}}}
    mock_http_client.post = AsyncMock(return_value=_mock_response(200, bad_shape))

    result = await fetch_firecrawl_jobs("https://example.com/careers")
    assert result == []


@pytest.mark.asyncio
async def test_fetch_sends_correct_request(mock_http_client, monkeypatch):
    """Verify the request sent to Firecrawl has the right shape."""
    monkeypatch.setattr("app.services.firecrawl.settings.firecrawl_api_key", "fc-test-key")
    mock_http_client.post = AsyncMock(return_value=_mock_response(200, _EMPTY_RESPONSE))

    await fetch_firecrawl_jobs("https://example.com/careers")

    mock_http_client.post.assert_called_once()
    call_kwargs = mock_http_client.post.call_args
    assert call_kwargs.kwargs["headers"]["Authorization"] == "Bearer fc-test-key"
    body = call_kwargs.kwargs["json"]
    assert body["url"] == "https://example.com/careers"
    assert len(body["formats"]) == 1
    assert body["formats"][0]["type"] == "json"
    assert "schema" in body["formats"][0]


@pytest.mark.asyncio
async def test_fetch_stable_external_ids(mock_http_client, monkeypatch):
    """Same URL + jobs should produce the same external IDs across calls."""
    monkeypatch.setattr("app.services.firecrawl.settings.firecrawl_api_key", "fc-test")
    mock_http_client.post = AsyncMock(return_value=_mock_response(200, _SUCCESS_RESPONSE))

    result1 = await fetch_firecrawl_jobs("https://example.com/careers")
    result2 = await fetch_firecrawl_jobs("https://example.com/careers")

    assert [j.external_id for j in result1] == [j.external_id for j in result2]
