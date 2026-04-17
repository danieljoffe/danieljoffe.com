from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.ats_detect import _parse_input, detect_ats

# --- _parse_input tests ---


class TestParseInput:
    def test_plain_slug(self):
        provider, slug = _parse_input("stripe")
        assert provider is None
        assert slug == "stripe"

    def test_plain_slug_with_spaces(self):
        _, slug = _parse_input("  stripe  ")
        assert slug == "stripe"

    def test_greenhouse_board_url(self):
        provider, slug = _parse_input("https://boards.greenhouse.io/stripe")
        assert provider == "greenhouse"
        assert slug == "stripe"

    def test_greenhouse_api_url(self):
        provider, slug = _parse_input("https://boards-api.greenhouse.io/v1/boards/stripe")
        assert provider == "greenhouse"
        assert slug == "stripe"

    def test_lever_url(self):
        provider, slug = _parse_input("https://jobs.lever.co/netlify")
        assert provider == "lever"
        assert slug == "netlify"

    def test_ashby_url(self):
        provider, slug = _parse_input("https://jobs.ashbyhq.com/linear")
        assert provider == "ashby"
        assert slug == "linear"

    def test_careers_page_url(self):
        provider, slug = _parse_input("https://stripe.com/jobs")
        assert provider is None
        assert slug == "stripe"

    def test_www_url(self):
        provider, slug = _parse_input("www.notion.so/careers")
        assert provider is None
        assert slug == "notion"

    def test_company_name_with_spaces(self):
        _, slug = _parse_input("open ai")
        assert slug == "openai"

    def test_lever_url_with_path(self):
        provider, slug = _parse_input("https://jobs.lever.co/netlify/some-job-id")
        assert provider == "lever"
        assert slug == "netlify"

    def test_workday_url(self):
        provider, slug = _parse_input(
            "https://salesforce.wd12.myworkdayjobs.com/en-US/External"
        )
        assert provider == "workday"
        assert slug == "salesforce"

    def test_smartrecruiters_api_url(self):
        provider, slug = _parse_input(
            "https://api.smartrecruiters.com/v1/companies/VISA"
        )
        assert provider == "smartrecruiters"
        assert slug == "visa"


# --- detect_ats tests ---


def _make_http_response(status: int, json_data: object) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = json_data
    return resp


@pytest.mark.asyncio
async def test_detect_greenhouse_from_url():
    mock_client = AsyncMock()
    mock_client.get.return_value = _make_http_response(
        200, {"name": "Stripe", "departments": [{}, {}]}
    )
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.ats_detect.httpx.AsyncClient", return_value=mock_client):
        result = await detect_ats("https://boards.greenhouse.io/stripe")

    assert result is not None
    assert result.provider == "greenhouse"
    assert result.board_token == "stripe"
    assert result.company_name == "Stripe"


@pytest.mark.asyncio
async def test_detect_lever_from_url():
    mock_client = AsyncMock()
    mock_client.get.return_value = _make_http_response(200, [{"id": "1", "text": "Engineer"}])
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.ats_detect.httpx.AsyncClient", return_value=mock_client):
        result = await detect_ats("https://jobs.lever.co/netlify")

    assert result is not None
    assert result.provider == "lever"
    assert result.board_token == "netlify"


@pytest.mark.asyncio
async def test_detect_ashby_from_url():
    mock_client = AsyncMock()
    mock_client.get.return_value = _make_http_response(
        200, {"organizationName": "Linear", "jobs": [{"id": "1"}]}
    )
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.ats_detect.httpx.AsyncClient", return_value=mock_client):
        result = await detect_ats("https://jobs.ashbyhq.com/linear")

    assert result is not None
    assert result.provider == "ashby"
    assert result.board_token == "linear"
    assert result.company_name == "Linear"


@pytest.mark.asyncio
async def test_detect_probes_all_when_plain_slug():
    """When given just a name, probe providers in order and return first match."""
    mock_client = AsyncMock()

    # Greenhouse 404, Lever returns empty, Ashby succeeds
    responses = [
        _make_http_response(404, {}),  # greenhouse
        _make_http_response(200, []),  # lever (empty = no match)
        _make_http_response(200, {"organizationName": "Acme", "jobs": [{"id": "1"}]}),  # ashby
    ]
    mock_client.get.side_effect = responses
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.services.ats_detect.httpx.AsyncClient", return_value=mock_client),
        patch("app.services.ats_detect.PROBE_DELAY", 0),
    ):
        result = await detect_ats("acme")

    assert result is not None
    assert result.provider == "ashby"
    assert result.board_token == "acme"


@pytest.mark.asyncio
async def test_detect_returns_none_when_no_match():
    mock_client = AsyncMock()
    mock_client.get.return_value = _make_http_response(404, {})
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.services.ats_detect.httpx.AsyncClient", return_value=mock_client),
        patch("app.services.ats_detect.PROBE_DELAY", 0),
    ):
        result = await detect_ats("nonexistent-company-xyz")

    assert result is None


@pytest.mark.asyncio
async def test_detect_handles_network_error():
    mock_client = AsyncMock()
    mock_client.get.side_effect = httpx.HTTPError("Connection failed")
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.services.ats_detect.httpx.AsyncClient", return_value=mock_client),
        patch("app.services.ats_detect.PROBE_DELAY", 0),
    ):
        result = await detect_ats("stripe")

    assert result is None


@pytest.mark.asyncio
async def test_detect_careers_page_url_probes_all():
    """A generic careers URL extracts the domain stem and probes all providers."""
    mock_client = AsyncMock()
    mock_client.get.return_value = _make_http_response(200, {"name": "Notion", "departments": []})
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.ats_detect.httpx.AsyncClient", return_value=mock_client):
        result = await detect_ats("https://notion.so/careers")

    assert result is not None
    assert result.provider == "greenhouse"
    assert result.board_token == "notion"


@pytest.mark.asyncio
async def test_detect_smartrecruiters_from_api_url():
    mock_client = AsyncMock()
    mock_client.get.return_value = _make_http_response(
        200,
        {
            "content": [{"id": "1", "name": "Engineer"}],
            "totalFound": 42,
        },
    )
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch(
        "app.services.ats_detect.httpx.AsyncClient",
        return_value=mock_client,
    ):
        result = await detect_ats(
            "https://api.smartrecruiters.com/v1/companies/VISA"
        )

    assert result is not None
    assert result.provider == "smartrecruiters"
    assert result.board_token == "visa"
    assert result.job_count == 42
