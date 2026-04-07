from app.services.scoring import score_job, strip_html
from app.seed.keyword_config import KeywordConfig, keyword_config


def test_strip_html_removes_tags():
    assert strip_html("<p>Hello <strong>world</strong></p>") == "Hello world"


def test_strip_html_handles_empty():
    assert strip_html("") == ""


def test_strip_html_preserves_plain_text():
    assert strip_html("no tags here") == "no tags here"


def test_high_score_for_ideal_match(config: KeywordConfig):
    title = "Senior Frontend Engineer"
    description = """
    <p>We are looking for a Senior Frontend Engineer to join our design systems team.
    You will work with React, Next.js, TypeScript, and Tailwind CSS to build
    our component library. Experience with accessibility (WCAG) and performance
    optimization is required. This is a senior role requiring mentorship and
    architectural ownership.</p>
    """
    result = score_job(title, description, config)
    assert result.score > 60
    assert not result.excluded
    assert "react" in result.matched_keywords
    assert "typescript" in result.matched_keywords


def test_low_score_for_poor_match(config: KeywordConfig):
    title = "Software Engineer"
    description = "<p>General software engineering role working on backend services.</p>"
    result = score_job(title, description, config)
    assert result.score < 30


def test_excluded_for_hard_exclude(config: KeywordConfig):
    title = "Junior Frontend Developer"
    description = "<p>Entry-level position for new grad developers learning React.</p>"
    result = score_job(title, description, config)
    assert result.excluded
    assert result.score == 0


def test_soft_exclude_reduces_score(config: KeywordConfig):
    title = "Senior Frontend Engineer"
    description = """
    <p>Build our frontend with React and TypeScript.
    Must have experience with Angular and Java backends.
    WordPress and PHP knowledge is a plus.</p>
    """
    result = score_job(title, description, config)
    assert result.breakdown.negative < 0


def test_score_clamped_to_0_100(config: KeywordConfig):
    title = "Software Engineer"
    description = "<p>Generic role.</p>"
    result = score_job(title, description, config)
    assert 0 <= result.score <= 100


def test_breakdown_populated(config: KeywordConfig):
    title = "Senior Frontend Engineer"
    description = "<p>React, TypeScript, design systems, accessibility.</p>"
    result = score_job(title, description, config)
    assert result.breakdown.role_titles > 0
    assert result.breakdown.technologies > 0
    assert result.breakdown.domain_skills > 0


def test_title_weighted_higher(config: KeywordConfig):
    """A keyword in the title should contribute more than the same keyword only in the body."""
    title_in_title = score_job("React Engineer", "<p>Generic role.</p>", config)
    title_in_body = score_job("Engineer", "<p>Uses React.</p>", config)
    assert title_in_title.score >= title_in_body.score
