from app.services.poller import _is_us_location, _title_matches_any_role


def test_title_matches_senior_frontend_engineer():
    assert _title_matches_any_role("Senior Frontend Engineer") is True


def test_title_does_not_match_marketing():
    assert _title_matches_any_role("Marketing Specialist") is False


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


# TODO: An integration test for `poll_all_sources` would require mocking the full
# Supabase client chain (.table().select().eq().execute(), .upsert(...), .update(...))
# plus all fetchers. The non-trivial chain is skipped here — scoring, sanitize,
# location/title filters, and each fetcher are covered individually.
