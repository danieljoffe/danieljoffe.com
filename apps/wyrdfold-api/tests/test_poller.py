from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

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
from app.services.standard_job import StandardJob


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


# ---- AND-semantics ingestion gate ------------------------------------------
#
# The gate used to admit on (matched_keywords or excluded). When a target
# has search_keywords set, admission now also requires a search-keyword
# token-overlap with the title — so incidental keyword hits don't ingest
# off-topic postings into the user's list.


def _target_with_keywords(
    core_keywords: dict[str, int],
    search_keywords: list[str],
) -> JobTarget:
    return JobTarget(
        id="t-with-kw",
        label="Director CX",
        scoring_profile=ScoringProfile(
            categories={
                "core_skills": CategoryProfile(
                    keywords=core_keywords, weight=2.0
                ),
            },
            seniority=SeniorityProfile(signals=["director", "head of"]),
        ),
        search_keywords=search_keywords,
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def test_and_semantics_admits_when_search_keyword_overlaps():
    target = _target_with_keywords(
        {"Zendesk": 3},
        ["director of customer experience", "head of cx"],
    )
    # Title has a search-keyword overlap AND a seniority signal hit
    # ("director"), so it passes both halves of the AND.
    assert _title_matches_any_target("Director of Customer Experience", [target]) is True


def test_and_semantics_rejects_keyword_match_without_search_overlap():
    """Regression: a job whose title only matches a generic profile signal
    ('director') but has no search-keyword overlap should NOT be ingested."""
    target = _target_with_keywords(
        {"Zendesk": 3},
        ["director of customer experience"],
    )
    # "Director of Engineering" hits the "director" seniority signal but
    # is not a customer-experience role — rejected at the door.
    assert _title_matches_any_target("Director of Engineering", [target]) is False


def test_and_semantics_falls_back_when_search_keywords_empty():
    """Targets with empty search_keywords (legacy/draft profiles) keep
    the old OR semantics so they don't accidentally ingestion-block."""
    legacy_target = _make_target({"react": 3})  # search_keywords=[]
    assert _title_matches_any_target("Senior React Engineer", [legacy_target]) is True


def test_and_semantics_admits_excluded_for_audit():
    """Hard-exclude (negative keyword) still admits so the scorer can
    record excluded=True — preserves the audit trail."""
    target = _target_with_keywords(
        {"Zendesk": 3},
        ["director of cx"],
    )
    target.scoring_profile.negative.keywords = ["junior"]
    # The title hits 'junior' (negative) but no search-keyword overlap.
    # Excluded path admits regardless.
    assert _title_matches_any_target("Junior Random Role", [target]) is True


# ---- poll_sources_for_target: inactive-target guard -----------------------


def _full_target(*, is_active: bool, search_keywords: list[str]) -> JobTarget:
    """Build a target with a real search_keywords list so the inactive
    guard is exercised in isolation from the 'empty keywords' guard.
    """
    return JobTarget(
        id="t-1",
        label="Staff Frontend Engineer",
        scoring_profile=ScoringProfile(
            categories={
                "core_skills": CategoryProfile(keywords={"react": 3}, weight=2.0),
            },
            seniority=SeniorityProfile(signals=["staff"]),
        ),
        search_keywords=search_keywords,
        is_active=is_active,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def test_poll_sources_for_target_skips_inactive_target() -> None:
    """Inactive targets short-circuit before any sources query.

    ``targets.is_active=False`` means no user currently has the target
    enabled (trigger OR across user_targets). Fanning out a per-target
    poll across every ATS source for a target nobody will see is pure
    waste — return an empty PollResult immediately.
    """
    import asyncio
    from unittest.mock import MagicMock

    from app.services.poller import poll_sources_for_target

    supabase = MagicMock()
    target = _full_target(is_active=False, search_keywords=["frontend engineer"])

    result = asyncio.run(poll_sources_for_target(supabase, target))

    assert result.sources_polled == 0
    assert result.new_jobs == 0
    assert result.updated_jobs == 0
    assert result.archived_jobs == 0
    assert result.errors == []
    # Critically: no DB traffic.
    supabase.table.assert_not_called()


# ---- mass-archive guard -----------------------------------------------------


def _make_poll_supabase(existing_rows: list[dict]) -> tuple[MagicMock, MagicMock, MagicMock]:
    """Mock Supabase for a ``_poll_one_source`` run with no upserts.

    Returns ``(supabase, jobs_table, sources_table)`` so tests can assert
    on the archive UPDATE (jobs table) separately from the
    ``last_polled_at`` stamp (sources table).
    """
    jobs_table = MagicMock()
    existing_query = jobs_table.select.return_value.eq.return_value.not_.in_.return_value
    existing_query.execute.return_value.data = existing_rows

    sources_table = MagicMock()
    supabase = MagicMock()
    supabase.table.side_effect = lambda name: {
        "jobs": jobs_table,
        "sources": sources_table,
    }[name]
    return supabase, jobs_table, sources_table


_GUARD_SOURCE = {
    "id": "src-1",
    "board_token": "acme",
    "provider": "greenhouse",
    "company_name": "Acme",
}


@pytest.mark.asyncio
async def test_zero_job_fetch_with_existing_rows_skips_archiving(monkeypatch):
    """Regression: fetchers like workday return [] on API errors. A
    zero-job fetch must NOT archive the source's existing jobs — that
    turns a transient upstream hiccup into a wiped source."""
    from app.services import poller as poller_mod

    existing = [
        {"id": "job-1", "external_id": "e-1", "title": "T1", "company_name": "Acme"},
        {"id": "job-2", "external_id": "e-2", "title": "T2", "company_name": "Acme"},
    ]
    supabase, jobs_table, sources_table = _make_poll_supabase(existing)

    async def empty_fetch(_token: str) -> list[StandardJob]:
        return []

    monkeypatch.setitem(poller_mod.FETCHERS, "greenhouse", empty_fetch)
    monkeypatch.setattr(poller_mod, "get_active_target", lambda _sb: [])

    summary = await poller_mod._poll_one_source(dict(_GUARD_SOURCE), supabase)

    assert summary["polled"] is True
    assert summary["archived"] == 0
    # No jobs-table UPDATE at all — the only UPDATE this cycle is the
    # sources-table last_polled_at stamp.
    jobs_table.update.assert_not_called()
    sources_table.update.assert_called_once()


@pytest.mark.asyncio
async def test_nonzero_fetch_still_archives_stale_rows(monkeypatch):
    """The guard must not break normal stale-archiving: a fetch that
    returns jobs archives existing rows missing from the board."""
    from app.services import poller as poller_mod

    existing = [
        {"id": "job-1", "external_id": "gone-1", "title": "T1", "company_name": "Acme"},
    ]
    supabase, jobs_table, _sources_table = _make_poll_supabase(existing)

    async def one_job_fetch(_token: str) -> list[StandardJob]:
        # Non-US location so the job is dropped pre-upsert — keeps the
        # test on the no-upsert path while the fetch itself is non-empty.
        return [
            StandardJob(
                external_id="live-1",
                title="Director of CX",
                location_name="London, United Kingdom",
                department=None,
                content="",
                updated_at="2026-01-01",
                absolute_url="https://example.com/j/1",
            )
        ]

    monkeypatch.setitem(poller_mod.FETCHERS, "greenhouse", one_job_fetch)
    monkeypatch.setattr(poller_mod, "get_active_target", lambda _sb: [])

    summary = await poller_mod._poll_one_source(dict(_GUARD_SOURCE), supabase)

    assert summary["archived"] == 1
    update_payload = jobs_table.update.call_args.args[0]
    assert update_payload["status"] == "archived"
    jobs_table.update.return_value.in_.assert_called_once_with("id", ["job-1"])


# ---- Phase 1 triage: known jobs are not re-triaged --------------------------


@pytest.mark.asyncio
async def test_phase1_triage_skips_known_external_ids(monkeypatch):
    """Jobs already in the DB must not be re-sent to the Phase 1 LLM on
    every cycle — only new external_ids are triaged, and verdict indices
    map back to the jobs' global positions."""
    from unittest.mock import AsyncMock

    from app.config import settings as live_settings
    from app.services import poller as poller_mod
    from app.services.relevance.title_triage import TitleVerdict

    monkeypatch.setattr(live_settings, "phase1_triage_enabled", True)

    existing = [
        {"id": "job-1", "external_id": "known-1", "title": "Old Role", "company_name": "Acme"},
    ]
    supabase, _jobs_table, _sources_table = _make_poll_supabase(existing)

    async def two_job_fetch(_token: str) -> list[StandardJob]:
        return [
            StandardJob(
                external_id="known-1",
                title="Old Role",
                location_name="Remote",
                department=None,
                content="",
                updated_at="2026-01-01",
                absolute_url="https://example.com/j/1",
            ),
            StandardJob(
                external_id="new-1",
                title="Brand New Role",
                location_name="Remote",
                department=None,
                content="",
                updated_at="2026-01-01",
                absolute_url="https://example.com/j/2",
            ),
        ]

    target = _target_with_keywords({"react": 3}, ["totally unrelated keyword"])
    # Triage rejects the (only) submitted title. Id 1 = first title in the
    # submitted subset, which must be the NEW job.
    fake_triage = AsyncMock(
        return_value=({1: TitleVerdict(id=1, promising=False)}, None)
    )

    monkeypatch.setitem(poller_mod.FETCHERS, "greenhouse", two_job_fetch)
    monkeypatch.setattr(poller_mod, "get_active_target", lambda _sb: [target])
    monkeypatch.setattr(poller_mod, "get_default_llm_client", lambda: MagicMock())
    monkeypatch.setattr(poller_mod, "triage_titles", fake_triage)

    summary = await poller_mod._poll_one_source(dict(_GUARD_SOURCE), supabase)

    assert summary["polled"] is True
    assert summary["error"] is None
    # Exactly one triage call, carrying ONLY the new job's title.
    assert fake_triage.await_count == 1
    assert fake_triage.await_args.kwargs["titles"] == ["Brand New Role"]
    # Neither job reaches the upsert (new one rejected by Phase 1, known
    # one fails the title prematch), so nothing was scored this cycle.
    assert summary["new"] == 0
    assert summary["updated"] == 0
