"""Tests for job metadata extraction service (#500)."""

from app.services.extract import (
    _company_from_domain,
    _extract_from_html_meta,
    _extract_from_jsonld,
    extract_job_from_html,
)

# ---------------------------------------------------------------------------
# Tier 1: JSON-LD extraction
# ---------------------------------------------------------------------------


class TestExtractJsonLD:
    def test_full_job_posting(self):
        html = """
        <html><head>
        <script type="application/ld+json">
        {
            "@type": "JobPosting",
            "title": "Senior Frontend Engineer",
            "description": "<p>Build amazing UIs</p>",
            "hiringOrganization": {"@type": "Organization", "name": "Acme Corp"},
            "jobLocation": {
                "@type": "Place",
                "address": {
                    "addressLocality": "San Francisco",
                    "addressRegion": "CA"
                }
            }
        }
        </script>
        </head></html>
        """
        result = _extract_from_jsonld(html)
        assert result is not None
        assert result.title == "Senior Frontend Engineer"
        assert result.company_name == "Acme Corp"
        assert result.location == "San Francisco, CA"
        assert result.description_html == "<p>Build amazing UIs</p>"
        assert result.tier == "jsonld"

    def test_missing_title_returns_none(self):
        html = """
        <html><head>
        <script type="application/ld+json">
        {"@type": "JobPosting", "description": "Some description"}
        </script>
        </head></html>
        """
        result = _extract_from_jsonld(html)
        assert result is None

    def test_no_jsonld_returns_none(self):
        html = "<html><body>No structured data here</body></html>"
        result = _extract_from_jsonld(html)
        assert result is None

    def test_hiring_organization_missing(self):
        html = """
        <html><head>
        <script type="application/ld+json">
        {"@type": "JobPosting", "title": "Engineer", "description": "Work here"}
        </script>
        </head></html>
        """
        result = _extract_from_jsonld(html)
        assert result is not None
        assert result.title == "Engineer"
        assert result.company_name is None

    def test_uses_job_title_field(self):
        """Some sites use jobTitle instead of title."""
        html = """
        <html><head>
        <script type="application/ld+json">
        {"@type": "JobPosting", "jobTitle": "Staff Engineer", "description": "x"}
        </script>
        </head></html>
        """
        result = _extract_from_jsonld(html)
        assert result is not None
        assert result.title == "Staff Engineer"


# ---------------------------------------------------------------------------
# Tier 2: HTML meta/OG extraction
# ---------------------------------------------------------------------------


class TestExtractHtmlMeta:
    def test_og_tags(self):
        html = """
        <html><head>
        <meta property="og:title" content="Software Engineer at Stripe" />
        <meta property="og:site_name" content="Stripe Careers" />
        <meta property="og:description" content="Build payment systems" />
        </head><body></body></html>
        """
        result = _extract_from_html_meta(html, "https://stripe.com/jobs/123")
        assert result is not None
        assert result.title == "Software Engineer at Stripe"
        assert result.company_name == "Stripe Careers"
        assert result.description_html == "Build payment systems"
        assert result.tier == "html_meta"

    def test_title_tag_fallback(self):
        html = "<html><head><title>React Developer - Apply Now</title></head><body></body></html>"
        result = _extract_from_html_meta(html, "https://example.com/jobs/1")
        assert result is not None
        assert result.title == "React Developer - Apply Now"

    def test_company_from_domain(self):
        html = "<html><head><title>Some Job</title></head><body></body></html>"
        result = _extract_from_html_meta(html, "https://careers.google.com/jobs/1")
        assert result is not None
        assert result.company_name == "Google"

    def test_no_title_returns_none(self):
        html = "<html><head></head><body>No title at all</body></html>"
        result = _extract_from_html_meta(html, "https://example.com")
        assert result is None

    def test_description_from_content_area(self):
        html = """
        <html><head><title>Engineer</title></head><body>
        <div class="job-description">
            <p>Requirements: 5 years experience</p>
        </div>
        </body></html>
        """
        result = _extract_from_html_meta(html, "https://example.com/jobs/1")
        assert result is not None
        assert "Requirements" in (result.description_html or "")


# ---------------------------------------------------------------------------
# Company from domain
# ---------------------------------------------------------------------------


class TestCompanyFromDomain:
    def test_jobs_subdomain(self):
        assert _company_from_domain("https://jobs.stripe.com/123") == "Stripe"

    def test_careers_subdomain(self):
        assert _company_from_domain("https://careers.google.com/jobs") == "Google"

    def test_www_prefix(self):
        assert _company_from_domain("https://www.example.com/careers") == "Example"

    def test_bare_domain(self):
        assert _company_from_domain("https://netflix.com/jobs") == "Netflix"


# ---------------------------------------------------------------------------
# Full cascade
# ---------------------------------------------------------------------------


class TestExtractCascade:
    def test_jsonld_stops_at_tier1(self):
        html = """
        <html><head>
        <title>Fallback Title</title>
        <script type="application/ld+json">
        {"@type": "JobPosting", "title": "JSON-LD Title", "description": "desc"}
        </script>
        </head></html>
        """
        result = extract_job_from_html(html, "https://example.com/jobs/1")
        assert result.tier == "jsonld"
        assert result.title == "JSON-LD Title"

    def test_no_jsonld_falls_to_tier2(self):
        html = """
        <html><head>
        <meta property="og:title" content="OG Title" />
        </head><body></body></html>
        """
        result = extract_job_from_html(html, "https://example.com/jobs/1")
        assert result.tier == "html_meta"
        assert result.title == "OG Title"

    def test_empty_page_returns_none_tier(self):
        result = extract_job_from_html("", "https://example.com")
        assert result.tier == "none"
        assert result.title is None

    def test_no_metadata_returns_none_tier(self):
        html = "<html><head></head><body>Just text</body></html>"
        result = extract_job_from_html(html, "https://example.com")
        assert result.tier == "none"
        assert "extraction_failed" in result.warnings[0]
