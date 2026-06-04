"""Tests for the location post-filter on /jobs.

The previous implementation used naive case-insensitive substring
matching: ``term in location.lower()``. That false-positived on short
country codes — most visibly ``"us"`` matching ``"Austin"`` (a-US-tin)
or ``"customer"`` (c-US-tomer). The new implementation matches short
codes (≤3 chars) at word boundaries and expands a curated set of
synonyms (US → USA / U.S. / United States).
"""

from __future__ import annotations

from app.routers.jobs import _location_passes

# ---- Real-world false positives the old filter let through ----------


def test_us_does_not_match_austin() -> None:
    """The bug that triggered this PR. Austin is in the US — but the
    filter should not have matched on the literal substring 'us' in
    the city name. (Austin is still findable via 'usa', 'texas', or
    by the user not filtering by location at all.)"""
    assert (
        _location_passes("Austin", exclude_terms=[], only_terms=["us"]) is False
    )


def test_us_does_not_match_belarus() -> None:
    """Belarus has 'us' as a substring but is NOT in the United States."""
    assert (
        _location_passes("Minsk, Belarus", exclude_terms=[], only_terms=["us"])
        is False
    )


def test_us_does_not_match_mauritius() -> None:
    assert (
        _location_passes(
            "Port Louis, Mauritius", exclude_terms=[], only_terms=["us"]
        )
        is False
    )


# ---- Legitimate US-location matches ---------------------------------


def test_us_matches_word_boundary_us() -> None:
    assert _location_passes("Remote, US", exclude_terms=[], only_terms=["us"])


def test_us_matches_word_boundary_us_in_middle() -> None:
    assert _location_passes(
        "Remote - US: Select locations",
        exclude_terms=[],
        only_terms=["us"],
    )


def test_us_matches_usa_synonym() -> None:
    assert _location_passes(
        "-REMOTE, USA-", exclude_terms=[], only_terms=["us"]
    )


def test_us_matches_united_states_synonym() -> None:
    assert _location_passes(
        "San Francisco, United States",
        exclude_terms=[],
        only_terms=["us"],
    )


def test_us_matches_us_with_punctuation() -> None:
    """U.S. and U.S.A. punctuated forms — both common in JD locations."""
    assert _location_passes(
        "Remote, U.S.", exclude_terms=[], only_terms=["us"]
    )


def test_us_matches_us_dash_state() -> None:
    """'US-CA-Menlo Park' format — dash separator, 'US' as the leading
    bounded token."""
    assert _location_passes(
        "US-CA-Menlo Park", exclude_terms=[], only_terms=["us"]
    )


# ---- Other short-code synonyms -------------------------------------


def test_uk_matches_united_kingdom() -> None:
    assert _location_passes(
        "London, United Kingdom", exclude_terms=[], only_terms=["uk"]
    )


def test_uk_does_not_match_truck() -> None:
    """'uk' substring matches in 'truck' — word-boundary catches this."""
    assert (
        _location_passes("Truckee, CA", exclude_terms=[], only_terms=["uk"])
        is False
    )


# ---- Longer terms (still substring) --------------------------------


def test_california_substring_matches_northern_california() -> None:
    """4+ char terms fall through to substring matching — forgiving for
    partial location names that don't have curated synonyms."""
    assert _location_passes(
        "Northern California",
        exclude_terms=[],
        only_terms=["california"],
    )


def test_brazil_substring_matches_sao_paulo_brazil() -> None:
    assert _location_passes(
        "São Paulo, Brazil", exclude_terms=[], only_terms=["brazil"]
    )


# ---- Exclude term semantics (mirror only_term checks) --------------


def test_exclude_us_drops_only_us_locations_not_austin() -> None:
    """Same boundary discipline on the exclude side: 'us' as an exclude
    term should NOT drop 'Austin' rows just because the substring
    appears inside the city name."""
    assert _location_passes("Austin", exclude_terms=["us"], only_terms=[])


def test_exclude_us_drops_remote_us() -> None:
    assert (
        _location_passes("Remote, US", exclude_terms=["us"], only_terms=[])
        is False
    )


# ---- Edge cases ----------------------------------------------------


def test_missing_location_drops_when_only_terms_set() -> None:
    """A job with no location string fails an "only_terms" filter — we
    can't confirm it matches. Same behaviour as before the fix.
    Future enhancement: revisit if users complain about jobs being
    hidden when Greenhouse omits location."""
    assert (
        _location_passes(None, exclude_terms=[], only_terms=["us"]) is False
    )


def test_empty_terms_pass_through() -> None:
    assert _location_passes("Anywhere", exclude_terms=[], only_terms=[])
