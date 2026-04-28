"""Tests for JD section parser."""

from app.services.jd_parser import (
    SECTION_WEIGHTS,
    classify_heading,
    parse_jd,
)

# ---- classify_heading tests ------------------------------------------------


class TestClassifyHeading:
    def test_requirements_heading(self):
        assert classify_heading("Requirements") == "requirements"
        assert classify_heading("Minimum Qualifications") == "requirements"
        assert classify_heading("What You'll Need") == "requirements"
        assert classify_heading("Skills Required") == "requirements"
        assert classify_heading("What You'll Bring") == "requirements"
        assert classify_heading("Technical Skills") == "requirements"
        assert classify_heading("Core Competencies") == "requirements"

    def test_nice_to_have_heading(self):
        assert classify_heading("Nice to Have") == "nice_to_have"
        assert classify_heading("Preferred Qualifications") == "nice_to_have"
        assert classify_heading("Bonus Skills") == "nice_to_have"
        assert classify_heading("A Plus") == "nice_to_have"
        assert classify_heading("Additional Skills") == "nice_to_have"

    def test_about_heading(self):
        assert classify_heading("About Us") == "about"
        assert classify_heading("About the Company") == "about"
        assert classify_heading("Who We Are") == "about"
        assert classify_heading("Our Team") == "about"
        assert classify_heading("Company Description") == "about"

    def test_benefits_heading(self):
        assert classify_heading("Benefits") == "benefits"
        assert classify_heading("Perks & Benefits") == "benefits"
        assert classify_heading("Compensation") == "benefits"
        assert classify_heading("What We Offer") == "benefits"
        assert classify_heading("Why Join Us") == "benefits"

    def test_default_heading(self):
        assert classify_heading("Responsibilities") == "default"
        assert classify_heading("The Role") == "default"
        assert classify_heading("Overview") == "default"

    def test_case_insensitive(self):
        assert classify_heading("REQUIREMENTS") == "requirements"
        assert classify_heading("nice to have") == "nice_to_have"
        assert classify_heading("ABOUT US") == "about"


# ---- parse_jd tests -------------------------------------------------------


class TestParseJD:
    def test_empty_html(self):
        result = parse_jd("")
        assert result.sections == []

    def test_none_like_html(self):
        result = parse_jd("   ")
        assert result.sections == []

    def test_plain_text_fallback(self):
        """No headings → single default section."""
        result = parse_jd("<p>React and TypeScript required.</p>")
        assert len(result.sections) == 1
        assert result.sections[0].name == "default"
        assert result.sections[0].weight == SECTION_WEIGHTS["default"]
        assert "React" in result.sections[0].text

    def test_structured_jd_with_headings(self):
        html = """
        <h2>About Us</h2>
        <p>We are a fintech company.</p>
        <h2>Requirements</h2>
        <p>5+ years React experience</p>
        <p>TypeScript required</p>
        <h2>Nice to Have</h2>
        <p>GraphQL experience</p>
        <h2>Benefits</h2>
        <p>Unlimited PTO</p>
        """
        result = parse_jd(html)
        names = [s.name for s in result.sections]
        assert "about" in names
        assert "requirements" in names
        assert "nice_to_have" in names
        assert "benefits" in names

    def test_section_weights_applied(self):
        html = """
        <h2>Requirements</h2>
        <p>React experience</p>
        <h2>About Us</h2>
        <p>We are great</p>
        """
        result = parse_jd(html)
        req = next(s for s in result.sections if s.name == "requirements")
        about = next(s for s in result.sections if s.name == "about")
        assert req.weight == 2.0
        assert about.weight == 0.5

    def test_text_before_first_heading_is_default(self):
        html = """
        <p>Overview of the role.</p>
        <h2>Requirements</h2>
        <p>React experience</p>
        """
        result = parse_jd(html)
        assert result.sections[0].name == "default"
        assert "Overview" in result.sections[0].text

    def test_h1_through_h6_all_work(self):
        for level in range(1, 7):
            html = f"<h{level}>Requirements</h{level}><p>React</p>"
            result = parse_jd(html)
            assert any(s.name == "requirements" for s in result.sections), f"h{level} failed"

    def test_bold_heading_detection(self):
        """Bold text as the sole content of a <p> acts as a heading."""
        html = """
        <p><strong>Requirements</strong></p>
        <p>React experience needed</p>
        """
        result = parse_jd(html)
        assert any(s.name == "requirements" for s in result.sections)

    def test_list_items_captured(self):
        html = """
        <h2>Requirements</h2>
        <ul>
            <li>React</li>
            <li>TypeScript</li>
            <li>Node.js</li>
        </ul>
        """
        result = parse_jd(html)
        req = next(s for s in result.sections if s.name == "requirements")
        assert "React" in req.text
        assert "TypeScript" in req.text
        assert "Node.js" in req.text

    def test_all_text_accessor(self):
        html = """
        <h2>About</h2>
        <p>Company info</p>
        <h2>Requirements</h2>
        <p>React needed</p>
        """
        result = parse_jd(html)
        all_text = result.all_text()
        assert "Company info" in all_text
        assert "React needed" in all_text

    def test_text_lower_populated(self):
        """Each section's text_lower equals text.lower()."""
        html = """
        <h2>Requirements</h2>
        <p>React and TypeScript Experience</p>
        <h2>About Us</h2>
        <p>We Build GREAT Software</p>
        """
        result = parse_jd(html)
        for section in result.sections:
            assert section.text_lower == section.text.lower()

    def test_text_lower_on_fallback(self):
        """Fallback single-section path also sets text_lower."""
        result = parse_jd("<p>React AND TypeScript</p>")
        assert len(result.sections) == 1
        assert result.sections[0].text_lower == result.sections[0].text.lower()

    def test_multiple_requirements_variants(self):
        """Different heading phrasings for requirements all classify correctly."""
        variants = [
            "What You'll Need",
            "Minimum Qualifications",
            "Skills Required",
            "Must Have",
            "Essential Requirements",
        ]
        for heading in variants:
            html = f"<h3>{heading}</h3><p>React</p>"
            result = parse_jd(html)
            assert any(
                s.name == "requirements" for s in result.sections
            ), f"'{heading}' not classified as requirements"
