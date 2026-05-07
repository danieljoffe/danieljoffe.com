from datetime import UTC, datetime

from app.models.targets import (
    CategoryProfile,
    JobTarget,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.poller import _is_us_location, _title_matches_any_target


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
