from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.services.jsonld import _extract_jobs, fetch_jsonld_jobs
from app.services.standard_job import StandardJob

_SINGLE_POSTING_HTML = """
<html>
<head>
<script type="application/ld+json">
{
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    "title": "Frontend Engineer",
    "description": "Build UI components",
    "datePosted": "2026-04-01",
    "url": "https://example.com/jobs/fe",
    "jobLocation": {
        "@type": "Place",
        "address": {
            "addressLocality": "Austin",
            "addressRegion": "TX"
        }
    },
    "hiringOrganization": {
        "@type": "Organization",
        "name": "Acme Inc"
    }
}
</script>
</head>
<body></body>
</html>
"""

_GRAPH_HTML = """
<html>
<head>
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@graph": [
        {"@type": "Organization", "name": "Acme"},
        {
            "@type": "JobPosting",
            "jobTitle": "Designer",
            "description": "Design things",
            "datePosted": "2026-04-02",
            "sameAs": "https://example.com/jobs/des"
        }
    ]
}
</script>
</head>
<body></body>
</html>
"""

_NO_JSONLD_HTML = """
<html><body><h1>Careers</h1><p>No structured data here.</p></body></html>
"""

_HTML_DESCRIPTION = """
<html>
<head>
<script type="application/ld+json">
{
    "@type": "JobPosting",
    "title": "DevOps",
    "description": "<p>Manage <b>infrastructure</b></p>",
    "url": "https://example.com/jobs/devops"
}
</script>
</head>
<body></body>
</html>
"""

_ARRAY_FORMAT_HTML = """
<html>
<head>
<script type="application/ld+json">
[
    {
        "@type": "JobPosting",
        "title": "Job A",
        "description": "desc a",
        "url": "https://example.com/a"
    },
    {
        "@type": "JobPosting",
        "title": "Job B",
        "description": "desc b",
        "url": "https://example.com/b"
    }
]
</script>
</head>
<body></body>
</html>
"""


# --- _extract_jobs unit tests ---


class TestExtractJobPostings:
    def test_single_posting(self):
        postings = _extract_jobs(_SINGLE_POSTING_HTML)
        assert len(postings) == 1
        assert postings[0]["title"] == "Frontend Engineer"

    def test_graph_format(self):
        postings = _extract_jobs(_GRAPH_HTML)
        assert len(postings) == 1
        assert postings[0]["jobTitle"] == "Designer"

    def test_no_jsonld(self):
        postings = _extract_jobs(_NO_JSONLD_HTML)
        assert postings == []

    def test_array_format(self):
        postings = _extract_jobs(_ARRAY_FORMAT_HTML)
        assert len(postings) == 2

    def test_invalid_json_skipped(self):
        html = '<script type="application/ld+json">not valid json</script>'
        postings = _extract_jobs(html)
        assert postings == []


# --- fetch_jsonld_jobs integration tests ---


def _mock_response(status_code: int, text: str) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    return resp


@pytest.mark.asyncio
async def test_fetch_single_posting(mock_http_client):
    resp = _mock_response(200, _SINGLE_POSTING_HTML)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_jsonld_jobs("https://example.com/careers")

    assert len(result) == 1
    job = result[0]
    assert isinstance(job, StandardJob)
    assert job.title == "Frontend Engineer"
    assert job.location_name == "Austin, TX"
    assert job.content == "Build UI components"
    assert job.absolute_url == "https://example.com/jobs/fe"
    assert len(job.external_id) == 16  # SHA256 truncated


@pytest.mark.asyncio
async def test_fetch_graph_format(mock_http_client):
    resp = _mock_response(200, _GRAPH_HTML)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_jsonld_jobs("https://example.com/careers")

    assert len(result) == 1
    assert result[0].title == "Designer"
    assert result[0].absolute_url == "https://example.com/jobs/des"


@pytest.mark.asyncio
async def test_fetch_strips_html_from_description(mock_http_client):
    resp = _mock_response(200, _HTML_DESCRIPTION)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_jsonld_jobs("https://example.com/careers")

    assert "<" not in result[0].content
    assert "infrastructure" in result[0].content


@pytest.mark.asyncio
async def test_fetch_no_jsonld_returns_empty(mock_http_client):
    resp = _mock_response(200, _NO_JSONLD_HTML)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_jsonld_jobs("https://example.com/careers")

    assert result == []


@pytest.mark.asyncio
async def test_fetch_404_returns_empty(mock_http_client):
    resp = _mock_response(404, "")
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_jsonld_jobs("https://example.com/careers")

    assert result == []


@pytest.mark.asyncio
async def test_fetch_network_error_returns_empty(mock_http_client):
    mock_http_client.get = AsyncMock(side_effect=httpx.HTTPError("timeout"))
    result = await fetch_jsonld_jobs("https://example.com/careers")

    assert result == []


@pytest.mark.asyncio
async def test_fetch_array_format(mock_http_client):
    resp = _mock_response(200, _ARRAY_FORMAT_HTML)
    mock_http_client.get = AsyncMock(return_value=resp)
    result = await fetch_jsonld_jobs("https://example.com/careers")

    assert len(result) == 2
    assert result[0].title == "Job A"
    assert result[1].title == "Job B"
