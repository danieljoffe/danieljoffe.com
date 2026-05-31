from datetime import UTC, datetime

from app.models.targets import (
    CategoryProfile,
    JobTarget,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.poller import (
    _is_us_location,
    _title_matches_any_target,
    _title_matches_target,
)


def _make_target(core_keywords: dict[str, int]) -> JobTarget:
    """Create a minimal target with the given core_skills keywords."""
    return JobTarget(
        id="test-target",
        label="Test Target",
        scoring_profile=ScoringProfile(
            categories={
                "core_skills": CategoryProfile(keywords=core_keywords, weight=2.0),
            },
            seniority=SeniorityProfile(signals=["senior", "staff", "lead"]),
        ),
        search_keywords=[],
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def test_title_matches_target_with_keyword():
    targets = [_make_target({"react": 3, "typescript": 3})]
    assert _title_matches_any_target("Senior React Engineer", targets) is True


def test_title_no_match():
    targets = [_make_target({"react": 3, "typescript": 3})]
    assert _title_matches_any_target("Marketing Specialist", targets) is False


def test_title_matches_seniority_signal():
    targets = [_make_target({"react": 3})]
    assert _title_matches_any_target("Senior Software Engineer", targets) is True


def test_title_matches_with_multiple_targets():
    targets = [
        _make_target({"java": 3}),
        _make_target({"react": 3}),
    ]
    assert _title_matches_any_target("React Developer", targets) is True


def test_empty_targets_no_match():
    assert _title_matches_any_target("Senior React Engineer", []) is False


# ---- _title_matches_target token-overlap behaviour --------------------------
#
# The previous matcher did a plain substring check: "director of cx operations"
# had to literally appear in the title. Real postings almost never match that
# verbatim — companies rewrite titles ("Director, Customer Experience"
# without "of cx", "VP Customer Operations" with no "director"). The new
# matcher tokenizes both sides and requires a content-token overlap, which
# is the actual behaviour these tests guard.


def test_multi_token_keyword_matches_reordered_title():
    """The bug-from-prod case: pasted "director of cx operations" keyword
    against a title that contains the same content tokens in a different
    order with different filler words.
    """
    keywords = ["director of cx operations"]
    assert _title_matches_target("Director, CX Operations", keywords) is True


def test_multi_token_keyword_matches_when_stopwords_differ():
    """Filler words ('of', 'and') shouldn't gate the match either way."""
    keywords = ["head of customer experience"]
    assert _title_matches_target("Head, Customer Experience", keywords) is True


def test_single_token_keyword_still_substring_matches():
    """1-token keywords (the existing common case) keep the old behaviour:
    pure substring against the title. Plurals and compound words still match.
    """
    keywords = ["engineer"]
    assert _title_matches_target("Senior Software Engineer", keywords) is True
    assert _title_matches_target("Engineering Manager", keywords) is True


def test_overlap_below_threshold_does_not_match():
    """A keyword with 5 content tokens needs >= 3 to land. Only 1 hit on a
    long keyword should be rejected so we don't surface every job whose title
    happens to mention "director".
    """
    keywords = ["director of customer experience transformation"]
    # Only "director" overlaps — 1 of 4 content tokens, below the 0.6 ratio.
    assert _title_matches_target("Director of Engineering", keywords) is False


def test_disjoint_keywords_do_not_match():
    keywords = ["software engineer", "frontend developer"]
    assert (
        _title_matches_target("Director of Customer Experience", keywords) is False
    )


def test_any_one_of_several_keywords_is_enough():
    """The function returns True as soon as one keyword in the list
    overlaps — used by the caller to spread a target's full keyword list
    against each posting.
    """
    keywords = ["product manager", "director of cx operations"]
    assert _title_matches_target("Director, CX Operations", keywords) is True


def test_empty_keyword_list_does_not_match():
    assert _title_matches_target("Director of Engineering", []) is False


def test_empty_title_does_not_match():
    assert _title_matches_target("", ["director of cx operations"]) is False


class TestIsUsLocation:
    def test_none_is_allowed(self):
        assert _is_us_location(None) is True

    def test_empty_string_is_allowed(self):
        assert _is_us_location("") is True

    def test_remote_is_allowed(self):
        assert _is_us_location("Remote") is True

    def test_us_city_state_is_allowed(self):
        assert _is_us_location("San Francisco, CA") is True
        assert _is_us_location("New York, NY") is True
        assert _is_us_location("Austin, TX") is True

    def test_us_remote_is_allowed(self):
        assert _is_us_location("Remote - US") is True
        assert _is_us_location("US (Remote)") is True

    def test_uk_rejected(self):
        assert _is_us_location("London, United Kingdom") is False

    def test_germany_rejected(self):
        assert _is_us_location("Berlin, Germany") is False

    def test_canada_rejected(self):
        assert _is_us_location("Toronto, Canada") is False
        assert _is_us_location("Vancouver, BC") is False

    def test_india_rejected(self):
        assert _is_us_location("Bangalore, India") is False

    def test_emea_rejected(self):
        assert _is_us_location("Remote - EMEA") is False

    def test_europe_rejected(self):
        assert _is_us_location("Europe") is False

    def test_apac_rejected(self):
        assert _is_us_location("APAC") is False

    def test_case_insensitive(self):
        assert _is_us_location("BERLIN, GERMANY") is False
        assert _is_us_location("berlin") is False
