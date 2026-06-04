"""Tests for the poller's (company, title) content dedupe.

Greenhouse posts the same role under multiple office locations as
separate listings with distinct external_ids. The upsert's
on_conflict key (source_id, external_id) doesn't catch this, so
duplicates leaked into the UI. ``_dedupe_by_content`` is the fix.
"""

from __future__ import annotations

from app.services.poller import _content_dedupe_key, _dedupe_by_content


def _row(*, ext_id: str, company: str, title: str) -> dict[str, object]:
    """Minimal row shape the dedupe path inspects."""
    return {
        "external_id": ext_id,
        "company_name": company,
        "title": title,
    }


# ---- _content_dedupe_key normalization --------------------------------


def test_key_is_lowercased() -> None:
    assert _content_dedupe_key("Smartsheet", "Director, X") == (
        "smartsheet",
        "director, x",
    )


def test_key_collapses_whitespace() -> None:
    assert _content_dedupe_key(
        "Smartsheet",
        "Director,   Customer  Ops",
    ) == ("smartsheet", "director, customer ops")


def test_key_trims_edges() -> None:
    assert _content_dedupe_key("  Smartsheet ", "Director  ") == (
        "smartsheet",
        "director",
    )


def test_key_handles_none() -> None:
    assert _content_dedupe_key(None, None) == ("", "")


def test_key_keeps_punctuation_distinct() -> None:
    """Comma + non-comma versions of a title are kept distinct on
    purpose — the comma might delimit a different role."""
    assert _content_dedupe_key("X", "Director, Customer Ops") != _content_dedupe_key(
        "X", "Director Customer Ops"
    )


# ---- Within-batch dedupe ---------------------------------------------


def test_within_batch_dedupe_keeps_first() -> None:
    """The Smartsheet case: same role, two external_ids, both arriving
    in the same poll cycle. Keep the first; drop the second."""
    rows = [
        _row(ext_id="ext-1", company="Smartsheet", title="PS BDD Director"),
        _row(ext_id="ext-2", company="Smartsheet", title="PS BDD Director"),
    ]
    deduped = _dedupe_by_content(rows, existing=[], source="Smartsheet")
    assert len(deduped) == 1
    assert deduped[0]["external_id"] == "ext-1"


def test_within_batch_dedupe_keeps_distinct_titles() -> None:
    """Distinct titles for the same company are NOT deduped."""
    rows = [
        _row(ext_id="ext-1", company="Acme", title="Senior Engineer"),
        _row(ext_id="ext-2", company="Acme", title="Staff Engineer"),
    ]
    deduped = _dedupe_by_content(rows, existing=[], source="Acme")
    assert len(deduped) == 2


def test_within_batch_dedupe_whitespace_normalized() -> None:
    """A trailing space in title shouldn't make two listings look
    distinct — the dedupe normalizes."""
    rows = [
        _row(ext_id="ext-1", company="Acme", title="Director"),
        _row(ext_id="ext-2", company="Acme", title="Director "),
        _row(ext_id="ext-3", company="Acme", title="DIRECTOR"),
    ]
    deduped = _dedupe_by_content(rows, existing=[], source="Acme")
    assert len(deduped) == 1


# ---- Cross-batch dedupe ----------------------------------------------


def test_cross_batch_dedupe_skips_when_existing_has_different_ext_id() -> None:
    """Cross-cycle case: the duplicate landed in a previous poll. The
    new poll cycle should drop the new candidate since the same role
    is already in the DB under a different external_id."""
    existing = [
        _row(ext_id="ext-from-prev-cycle", company="Smartsheet", title="PS BDD Director")
    ]
    rows = [
        _row(ext_id="ext-new", company="Smartsheet", title="PS BDD Director")
    ]
    deduped = _dedupe_by_content(rows, existing=existing, source="Smartsheet")
    assert deduped == []


def test_cross_batch_dedupe_allows_same_external_id_update() -> None:
    """The legitimate update path: an existing row + an incoming row
    with the SAME external_id is an UPDATE, not a duplicate. Must
    not be skipped."""
    existing = [_row(ext_id="ext-1", company="Acme", title="Senior FE")]
    rows = [_row(ext_id="ext-1", company="Acme", title="Senior FE")]
    deduped = _dedupe_by_content(rows, existing=existing, source="Acme")
    assert len(deduped) == 1
    assert deduped[0]["external_id"] == "ext-1"


def test_cross_batch_dedupe_allows_new_titles_for_same_company() -> None:
    """A genuinely new role at an existing-pollled company isn't a
    duplicate of any prior row."""
    existing = [_row(ext_id="ext-1", company="Acme", title="Senior FE")]
    rows = [_row(ext_id="ext-2", company="Acme", title="Staff FE")]
    deduped = _dedupe_by_content(rows, existing=existing, source="Acme")
    assert len(deduped) == 1


# ---- Combined within + cross -----------------------------------------


def test_both_within_and_cross_apply() -> None:
    """A poll cycle with: (a) one row that duplicates an existing-DB
    row, (b) two rows that duplicate each other in-batch.
    The deduper drops both; only the unique row survives."""
    existing = [
        _row(ext_id="ext-old", company="Acme", title="Senior FE"),
    ]
    rows = [
        _row(ext_id="ext-1", company="Acme", title="Senior FE"),    # cross dup
        _row(ext_id="ext-2", company="Acme", title="Staff FE"),     # unique
        _row(ext_id="ext-3", company="Acme", title="Staff FE"),     # within dup
    ]
    deduped = _dedupe_by_content(rows, existing=existing, source="Acme")
    assert len(deduped) == 1
    assert deduped[0]["external_id"] == "ext-2"


# ---- Edge cases ------------------------------------------------------


def test_empty_input_returns_empty() -> None:
    assert _dedupe_by_content([], existing=[], source="anywhere") == []


def test_missing_company_field_still_dedups() -> None:
    """A row missing company_name shouldn't crash. Two rows missing
    company_name + same title still dedupe to one."""
    rows = [
        {"external_id": "ext-1", "title": "Director"},
        {"external_id": "ext-2", "title": "Director"},
    ]
    deduped = _dedupe_by_content(rows, existing=[], source="?")
    assert len(deduped) == 1
