"""Tests for POST /jobs/manual endpoint (#500)."""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.services.extract import MANUAL_SOURCE_ID


def _mock_response(
    status_code: int = 200,
    text: str = "",
    url: str = "https://example.com/jobs/123",
) -> MagicMock:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.text = text
    resp.url = httpx.URL(url)
    return resp


JSONLD_HTML = """
<html><head>
<script type="application/ld+json">
{
    "@type": "JobPosting",
    "title": "Senior Engineer",
    "description": "<p>Build things</p>",
    "hiringOrganization": {"@type": "Organization", "name": "Acme Corp"},
    "jobLocation": {
        "@type": "Place",
        "address": {"addressLocality": "New York", "addressRegion": "NY"}
    }
}
</script>
</head></html>
"""

OG_HTML = """
<html><head>
<meta property="og:title" content="Product Designer" />
<meta property="og:site_name" content="Figma" />
<meta property="og:description" content="Design things" />
</head><body></body></html>
"""


class TestManualJobEndpoint:
    @pytest.fixture(autouse=True)
    def _no_active_target(self, monkeypatch):
        """Prevent target scoring from firing in manual-job tests."""
        from app.routers import jobs as jobs_router

        monkeypatch.setattr(jobs_router, "get_active_target", lambda *_a, **_kw: [])

    @pytest.mark.asyncio
    async def test_happy_path_jsonld(self, mock_http_client):
        mock_http_client.get = AsyncMock(
            return_value=_mock_response(text=JSONLD_HTML)
        )

        mock_supabase = MagicMock()
        mock_upsert = MagicMock()
        mock_upsert.execute = MagicMock(
            return_value=MagicMock(data=[{"id": "posting-uuid-1"}])
        )
        mock_supabase.table.return_value.upsert.return_value = mock_upsert

        from app.models.schemas import ManualJobRequest
        from app.routers.jobs import add_manual_job

        body = ManualJobRequest(url="https://example.com/jobs/123")
        result = await add_manual_job(body=body, supabase=mock_supabase)

        assert result.success is True
        assert result.posting_id == "posting-uuid-1"
        assert result.extraction_tier == "jsonld"
        assert result.extracted["title"] == "Senior Engineer"
        assert result.needs_manual_fields is False

        # Verify upsert was called with correct source_id
        upsert_call = mock_supabase.table.return_value.upsert.call_args
        row = upsert_call[0][0]
        assert row["source_id"] == MANUAL_SOURCE_ID
        assert row["title"] == "Senior Engineer"
        assert row["company_name"] == "Acme Corp"
        assert row["score"] >= 0

    @pytest.mark.asyncio
    async def test_user_overrides(self, mock_http_client):
        # Page with OG tags, but user provides their own title
        mock_http_client.get = AsyncMock(
            return_value=_mock_response(text=OG_HTML)
        )

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.upsert.return_value.execute.return_value = (
            MagicMock(data=[{"id": "posting-uuid-2"}])
        )

        from app.models.schemas import ManualJobRequest
        from app.routers.jobs import add_manual_job

        body = ManualJobRequest(
            url="https://example.com/jobs/456",
            title="My Custom Title",
            company_name="Override Corp",
        )
        result = await add_manual_job(body=body, supabase=mock_supabase)

        assert result.success is True
        # User overrides should win
        upsert_call = mock_supabase.table.return_value.upsert.call_args
        row = upsert_call[0][0]
        assert row["title"] == "My Custom Title"
        assert row["company_name"] == "Override Corp"

    @pytest.mark.asyncio
    async def test_malformed_url(self, mock_http_client):
        from fastapi import HTTPException

        from app.models.schemas import ManualJobRequest
        from app.routers.jobs import add_manual_job

        body = ManualJobRequest(url="not-a-url")
        with pytest.raises(HTTPException) as exc_info:
            await add_manual_job(body=body, supabase=MagicMock())
        assert exc_info.value.status_code == 400
        assert "Malformed" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_banned_domain(self, mock_http_client):
        from fastapi import HTTPException

        from app.models.schemas import ManualJobRequest
        from app.routers.jobs import add_manual_job

        body = ManualJobRequest(url="https://www.ziprecruiter.com/jobs/123")
        with pytest.raises(HTTPException) as exc_info:
            await add_manual_job(body=body, supabase=MagicMock())
        assert exc_info.value.status_code == 400
        assert "Banned" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_extraction_fails_needs_manual_fields(self, mock_http_client):
        # Empty page with no extractable metadata
        mock_http_client.get = AsyncMock(
            return_value=_mock_response(text="<html><body>Nothing</body></html>")
        )

        from app.models.schemas import ManualJobRequest
        from app.routers.jobs import add_manual_job

        body = ManualJobRequest(url="https://example.com/opaque-page")
        result = await add_manual_job(body=body, supabase=MagicMock())

        assert result.success is False
        assert result.needs_manual_fields is True
        assert result.posting_id is None

    @pytest.mark.asyncio
    async def test_extraction_fails_with_user_title_succeeds(self, mock_http_client):
        # Empty page but user provides a title
        mock_http_client.get = AsyncMock(
            return_value=_mock_response(text="<html><body>Nothing</body></html>")
        )

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.upsert.return_value.execute.return_value = (
            MagicMock(data=[{"id": "posting-uuid-3"}])
        )

        from app.models.schemas import ManualJobRequest
        from app.routers.jobs import add_manual_job

        body = ManualJobRequest(
            url="https://example.com/opaque-page",
            title="Manually Entered Job",
            company_name="Some Company",
        )
        result = await add_manual_job(body=body, supabase=mock_supabase)

        assert result.success is True
        assert result.posting_id == "posting-uuid-3"

    @pytest.mark.asyncio
    async def test_dedup_same_url(self, mock_http_client):
        """Same URL should generate same external_id."""
        import hashlib

        url = "https://example.com/jobs/same"
        expected_id = str(int(hashlib.sha256(url.encode()).hexdigest()[:15], 16))

        mock_http_client.get = AsyncMock(
            return_value=_mock_response(text=JSONLD_HTML, url=url)
        )

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.upsert.return_value.execute.return_value = (
            MagicMock(data=[{"id": "uuid"}])
        )

        from app.models.schemas import ManualJobRequest
        from app.routers.jobs import add_manual_job

        body = ManualJobRequest(url=url)
        await add_manual_job(body=body, supabase=mock_supabase)

        upsert_call = mock_supabase.table.return_value.upsert.call_args
        row = upsert_call[0][0]
        assert row["external_id"] == expected_id

    @pytest.mark.asyncio
    async def test_fetch_error(self, mock_http_client):
        mock_http_client.get = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        from fastapi import HTTPException

        from app.models.schemas import ManualJobRequest
        from app.routers.jobs import add_manual_job

        body = ManualJobRequest(url="https://example.com/jobs/123")
        with pytest.raises(HTTPException) as exc_info:
            await add_manual_job(body=body, supabase=MagicMock())
        assert exc_info.value.status_code == 400
        assert "fetch" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_redirect_to_banned(self, mock_http_client):
        mock_http_client.get = AsyncMock(
            return_value=_mock_response(
                text="", url="https://www.ziprecruiter.com/redirect"
            )
        )

        from fastapi import HTTPException

        from app.models.schemas import ManualJobRequest
        from app.routers.jobs import add_manual_job

        body = ManualJobRequest(url="https://legit.com/jobs/123")
        with pytest.raises(HTTPException) as exc_info:
            await add_manual_job(body=body, supabase=MagicMock())
        assert exc_info.value.status_code == 400
        assert "banned" in exc_info.value.detail.lower()
