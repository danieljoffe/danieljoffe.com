"""Tests for job URL validation service (#496)."""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.validate import (
    BANNED_DOMAINS,
    _is_disallowed_address,
    _verify_content,
    assert_safe_host,
    is_banned_domain,
    registrable_domain,
    validate_format,
    validate_job_url,
)

# ---------------------------------------------------------------------------
# Layer 1: Format validation
# ---------------------------------------------------------------------------


class TestValidateFormat:
    def test_valid_https(self):
        assert validate_format("https://example.com/jobs/123") is not None

    def test_valid_http(self):
        assert validate_format("http://example.com/jobs") is not None

    def test_missing_scheme(self):
        assert validate_format("example.com/jobs") is None

    def test_ftp_rejected(self):
        assert validate_format("ftp://example.com/file") is None

    def test_ip_address_rejected(self):
        assert validate_format("https://192.168.1.1/jobs") is None

    def test_no_dot_rejected(self):
        assert validate_format("http://localhost/jobs") is None

    def test_whitespace_stripped(self):
        result = validate_format("  https://example.com/jobs  ")
        assert result == "https://example.com/jobs"

    def test_empty_string(self):
        assert validate_format("") is None

    def test_garbage_input(self):
        assert validate_format("not a url at all") is None

    def test_javascript_protocol(self):
        assert validate_format("javascript:alert(1)") is None

    def test_data_uri(self):
        assert validate_format("data:text/html,<h1>hi</h1>") is None

    def test_ipv6_literal_rejected(self):
        # Phase 5 P0-Sec-3: bare IPv6 literals are an SSRF vector.
        assert validate_format("http://[::1]/foo") is None
        assert validate_format("http://[fc00::1]/foo") is None


class TestSsrfHostCheck:
    """SSRF guard — rejects hostnames resolving to internal address ranges.

    These tests bypass the autouse `_bypass_ssrf_dns` conftest fixture by
    re-monkeypatching the resolver so we can exercise the rejection path.
    """

    def test_loopback_v4_blocked(self, monkeypatch):
        import ipaddress

        import app.services.validate as v

        monkeypatch.setattr(
            v, "_resolve_addresses", lambda _h: [ipaddress.ip_address("127.0.0.1")]
        )
        with pytest.raises(ValueError, match="disallowed"):
            assert_safe_host("anything.evil")

    def test_aws_metadata_v4_blocked(self, monkeypatch):
        import ipaddress

        import app.services.validate as v

        monkeypatch.setattr(
            v,
            "_resolve_addresses",
            lambda _h: [ipaddress.ip_address("169.254.169.254")],
        )
        with pytest.raises(ValueError, match="disallowed"):
            assert_safe_host("metadata.evil")

    def test_rfc1918_v4_blocked(self, monkeypatch):
        import ipaddress

        import app.services.validate as v

        for cidr in ("10.0.0.1", "172.16.0.1", "192.168.1.1"):
            monkeypatch.setattr(
                v, "_resolve_addresses", lambda _h, _c=cidr: [ipaddress.ip_address(_c)]
            )
            with pytest.raises(ValueError, match="disallowed"):
                assert_safe_host(f"private-{cidr}")

    def test_ipv6_loopback_blocked(self, monkeypatch):
        import ipaddress

        import app.services.validate as v

        monkeypatch.setattr(
            v, "_resolve_addresses", lambda _h: [ipaddress.ip_address("::1")]
        )
        with pytest.raises(ValueError, match="disallowed"):
            assert_safe_host("v6-loopback")

    def test_ipv6_ula_blocked(self, monkeypatch):
        import ipaddress

        import app.services.validate as v

        monkeypatch.setattr(
            v, "_resolve_addresses", lambda _h: [ipaddress.ip_address("fc00::1")]
        )
        with pytest.raises(ValueError, match="disallowed"):
            assert_safe_host("v6-ula")

    def test_ipv4_mapped_v6_blocked(self, monkeypatch):
        """Defense against IPv4-mapped IPv6 (::ffff:127.0.0.1) bypass."""
        import ipaddress

        import app.services.validate as v

        monkeypatch.setattr(
            v,
            "_resolve_addresses",
            lambda _h: [ipaddress.ip_address("::ffff:127.0.0.1")],
        )
        with pytest.raises(ValueError, match="disallowed"):
            assert_safe_host("mapped-loopback")

    def test_unresolvable_host_rejected(self, monkeypatch):
        import app.services.validate as v

        monkeypatch.setattr(v, "_resolve_addresses", lambda _h: [])
        with pytest.raises(ValueError, match="did not resolve"):
            assert_safe_host("never-going-to-resolve-xyzabc")

    def test_public_ip_passes(self, monkeypatch):
        import ipaddress

        import app.services.validate as v

        monkeypatch.setattr(
            v, "_resolve_addresses", lambda _h: [ipaddress.ip_address("1.1.1.1")]
        )
        assert_safe_host("public.example")  # no exception

    def test_any_disallowed_in_set_blocks(self, monkeypatch):
        """If hostname returns multiple A records and any is disallowed,
        reject — defense against split DNS / load-balanced rebinding."""
        import ipaddress

        import app.services.validate as v

        monkeypatch.setattr(
            v,
            "_resolve_addresses",
            lambda _h: [
                ipaddress.ip_address("1.1.1.1"),
                ipaddress.ip_address("169.254.169.254"),
            ],
        )
        with pytest.raises(ValueError, match="disallowed"):
            assert_safe_host("split-dns")


class TestIsDisallowedAddress:
    def test_public_v4_allowed(self):
        import ipaddress

        assert _is_disallowed_address(ipaddress.ip_address("1.1.1.1")) is False
        assert _is_disallowed_address(ipaddress.ip_address("8.8.8.8")) is False

    def test_public_v6_allowed(self):
        import ipaddress

        assert _is_disallowed_address(ipaddress.ip_address("2001:4860:4860::8888")) is False


# ---------------------------------------------------------------------------
# Layer 2: Banned domains
# ---------------------------------------------------------------------------


class TestBannedDomains:
    def test_known_banned(self):
        assert is_banned_domain("ziprecruiter.com") is True

    def test_subdomain_of_banned(self):
        assert is_banned_domain("jobs.ziprecruiter.com") is True

    def test_www_subdomain_of_banned(self):
        assert is_banned_domain("www.craigslist.org") is True

    def test_legit_domain(self):
        assert is_banned_domain("greenhouse.io") is False

    def test_case_insensitive(self):
        assert is_banned_domain("ZIPRECRUITER.COM") is True

    def test_seed_count(self):
        assert len(BANNED_DOMAINS) >= 20


class TestRegistrableDomain:
    def test_www_prefix(self):
        assert registrable_domain("www.example.com") == "example.com"

    def test_deep_subdomain(self):
        assert registrable_domain("jobs.boards.greenhouse.io") == "greenhouse.io"

    def test_bare_domain(self):
        assert registrable_domain("example.com") == "example.com"

    def test_trailing_dot(self):
        assert registrable_domain("example.com.") == "example.com"

    def test_uppercase(self):
        assert registrable_domain("WWW.EXAMPLE.COM") == "example.com"


# ---------------------------------------------------------------------------
# Layer 4: Content verification
# ---------------------------------------------------------------------------


class TestVerifyContent:
    def test_jsonld_job_posting(self):
        html = """
        <html><head>
        <script type="application/ld+json">
        {"@type": "JobPosting", "title": "Engineer", "description": "Build stuff"}
        </script>
        </head><body></body></html>
        """
        is_job, warnings = _verify_content(html)
        assert is_job is True
        assert warnings == []

    def test_apply_button_and_job_class(self):
        html = """
        <html><body>
        <div class="job-description">Some description</div>
        <a href="/apply">Apply Now</a>
        </body></html>
        """
        is_job, warnings = _verify_content(html)
        assert is_job is True
        assert warnings == []

    def test_title_keyword_only(self):
        html = """
        <html><head><title>Senior Engineer - Job Opening</title></head>
        <body><p>Some content</p></body></html>
        """
        is_job, warnings = _verify_content(html)
        assert is_job is True
        assert "content_verification:title_only" in warnings

    def test_generic_homepage(self):
        html = """
        <html><head><title>Acme Corp</title></head>
        <body><h1>Welcome to Acme</h1><p>We make widgets.</p></body></html>
        """
        is_job, warnings = _verify_content(html)
        assert is_job is False

    def test_empty_html(self):
        is_job, warnings = _verify_content("")
        assert is_job is False

    def test_og_type_job_with_apply_button(self):
        html = """
        <html><head>
        <meta property="og:type" content="job.listing" />
        </head><body>
        <button>Apply for this position</button>
        </body></html>
        """
        is_job, warnings = _verify_content(html)
        assert is_job is True


# ---------------------------------------------------------------------------
# Full validate_job_url (async, mocked HTTP)
# ---------------------------------------------------------------------------


def _mock_response(
    status_code: int = 200,
    text: str = "",
    url: str = "https://example.com/jobs/123",
    history: list | None = None,
) -> MagicMock:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.text = text
    resp.url = httpx.URL(url)
    resp.history = history or []
    return resp


class TestValidateJobUrl:
    @pytest.mark.asyncio
    async def test_valid_job_url(self):
        html = """
        <html><head>
        <script type="application/ld+json">
        {"@type": "JobPosting", "title": "Engineer"}
        </script>
        </head></html>
        """
        mock_resp = _mock_response(text=html)
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.validate.httpx.AsyncClient", return_value=mock_client):
            result = await validate_job_url("https://example.com/jobs/123")

        assert result.is_valid is True
        assert result.rejection_reason is None
        assert "content_verification:not_a_job_posting" not in result.warnings

    @pytest.mark.asyncio
    async def test_malformed_url(self):
        result = await validate_job_url("not-a-url")
        assert result.is_valid is False
        assert result.rejection_reason == "malformed_url"

    @pytest.mark.asyncio
    async def test_banned_domain(self):
        result = await validate_job_url("https://www.ziprecruiter.com/jobs/123")
        assert result.is_valid is False
        assert result.rejection_reason is not None
        assert "banned_domain" in result.rejection_reason

    @pytest.mark.asyncio
    async def test_redirect_to_banned_domain(self):
        mock_resp = _mock_response(
            url="https://www.ziprecruiter.com/jobs/redir",
        )
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.validate.httpx.AsyncClient", return_value=mock_client):
            result = await validate_job_url("https://legit-company.com/jobs/123")

        assert result.is_valid is False
        assert result.rejection_reason is not None
        assert "banned_domain_after_redirect" in result.rejection_reason

    @pytest.mark.asyncio
    async def test_domain_changing_redirect_warning(self):
        html = '<html><head><title>Job Opening at Acme</title></head><body></body></html>'
        mock_resp = _mock_response(
            url="https://different-domain.com/jobs/123",
            text=html,
        )
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.validate.httpx.AsyncClient", return_value=mock_client):
            result = await validate_job_url("https://original-domain.com/jobs/123")

        assert result.is_valid is True
        assert any("redirect_domain_change" in w for w in result.warnings)

    @pytest.mark.asyncio
    async def test_non_job_content_warning(self):
        html = "<html><head><title>Acme Corp</title></head><body>Welcome</body></html>"
        mock_resp = _mock_response(text=html)
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.validate.httpx.AsyncClient", return_value=mock_client):
            result = await validate_job_url("https://example.com/about")

        assert result.is_valid is True
        assert "content_verification:not_a_job_posting" in result.warnings

    @pytest.mark.asyncio
    async def test_network_error_warning(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.validate.httpx.AsyncClient", return_value=mock_client):
            result = await validate_job_url("https://example.com/jobs/123")

        assert result.is_valid is True
        assert "fetch_failed" in result.warnings

    @pytest.mark.asyncio
    async def test_non_200_status_warning(self):
        mock_resp = _mock_response(status_code=404, url="https://example.com/jobs/gone")
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.validate.httpx.AsyncClient", return_value=mock_client):
            result = await validate_job_url("https://example.com/jobs/gone")

        assert result.is_valid is True
        assert "http_status:404" in result.warnings

    @pytest.mark.asyncio
    async def test_too_many_redirects_warning(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(
            side_effect=httpx.TooManyRedirects(
                "Exceeded max redirects", request=MagicMock()
            )
        )
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.validate.httpx.AsyncClient", return_value=mock_client):
            result = await validate_job_url("https://example.com/redirect-loop")

        assert result.is_valid is True
        assert "too_many_redirects" in result.warnings

    @pytest.mark.asyncio
    async def test_final_url_updated(self):
        html = """
        <html><head>
        <script type="application/ld+json">
        {"@type": "JobPosting", "title": "Engineer"}
        </script>
        </head></html>
        """
        mock_resp = _mock_response(
            url="https://example.com/jobs/canonical-123",
            text=html,
        )
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.services.validate.httpx.AsyncClient", return_value=mock_client):
            result = await validate_job_url("https://example.com/jobs/123")

        assert result.final_url == "https://example.com/jobs/canonical-123"

    @pytest.mark.asyncio
    async def test_empty_url(self):
        result = await validate_job_url("")
        assert result.is_valid is False
        assert result.rejection_reason == "malformed_url"
