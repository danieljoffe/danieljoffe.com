"""Tests for the F3-H resume version history service."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

from app.services.tailor import versions


class _ExecuteStub:
    def __init__(self, data: list[dict[str, Any]] | None = None) -> None:
        self.data = data or []


class _RecordingChain:
    """Captures supabase chain ops without enforcing order."""

    def __init__(self, returns: _ExecuteStub) -> None:
        self.returns = returns
        self.inserts: list[dict[str, Any]] = []
        self.deletes_in_ids: list[list[str]] = []

    def select(self, *_: Any, **__: Any) -> _RecordingChain:
        return self

    def insert(self, row: dict[str, Any]) -> _RecordingChain:
        self.inserts.append(row)
        return self

    def delete(self) -> _RecordingChain:
        return self

    def in_(self, _col: str, ids: list[str]) -> _RecordingChain:
        self.deletes_in_ids.append(ids)
        return self

    def eq(self, *_: Any, **__: Any) -> _RecordingChain:
        return self

    def order(self, *_: Any, **__: Any) -> _RecordingChain:
        return self

    def limit(self, *_: Any, **__: Any) -> _RecordingChain:
        return self

    def execute(self) -> _ExecuteStub:
        return self.returns


def _supabase_with_existing_count(count: int) -> tuple[MagicMock, _RecordingChain]:
    """Mock that returns `count` existing version rows when `_prune` queries."""
    existing = [{"id": f"v{i}"} for i in range(count)]
    chain = _RecordingChain(_ExecuteStub(existing))

    supabase = MagicMock()
    supabase.table.return_value = chain
    return supabase, chain


def test_record_inserts_then_prunes_when_over_cap() -> None:
    # 6 existing versions; new insert pushes to 7 — but the prune query reads
    # them ordered desc, so the oldest (rows beyond index `keep`) gets cut.
    supabase, chain = _supabase_with_existing_count(7)

    versions.record(
        supabase,
        resume_id="resume-abc",
        payload={"summary": "v"},
        source="user_edit",
    )

    # One insert went out
    assert len(chain.inserts) == 1
    assert chain.inserts[0]["resume_id"] == "resume-abc"
    assert chain.inserts[0]["source"] == "user_edit"
    # And we deleted the rows past the 5-cap (rows[5:] = 2 ids: v5, v6)
    assert chain.deletes_in_ids == [["v5", "v6"]]


def test_record_skips_prune_when_under_cap() -> None:
    supabase, chain = _supabase_with_existing_count(3)

    versions.record(
        supabase,
        resume_id="resume-xyz",
        payload={"summary": "v"},
        source="initial",
    )

    assert len(chain.inserts) == 1
    assert chain.deletes_in_ids == []  # no delete happened


def test_cap_is_5() -> None:
    """Document the free-tier cap so a future change shows up in the diff."""
    assert versions.FREE_TIER_VERSION_CAP == 5


# ---------------------------------------------------------------------------
# checkpoint() — explicit version snapshots, deduped
# ---------------------------------------------------------------------------


def _checkpoint_supabase(
    *,
    current_md: str | None,
    last_versions: list[dict[str, Any]],
) -> tuple[MagicMock, list[dict[str, Any]]]:
    """Builds a supabase mock with separate chains for the two tables the
    checkpoint() flow touches.

    - documents select returns {payload, payload_md}.
    - document_versions: insert calls land in `inserts`; the
      last-version select (with `.limit(1)`) returns `last_versions`;
      the prune select (no `.limit`) also returns `last_versions` so
      prune behavior is deterministic.
    """
    inserts: list[dict[str, Any]] = []
    resume_row = {"payload": {"foo": "bar"}, "payload_md": current_md}

    def table_factory(name: str) -> MagicMock:
        chain = MagicMock()
        if name == "documents":
            chain.select.return_value.eq.return_value.single.return_value.execute.return_value.data = (
                resume_row
            )
            return chain
        assert name == "document_versions"

        def insert_capturing(row: dict[str, Any]) -> MagicMock:
            inserts.append(row)
            ret = MagicMock()
            ret.execute.return_value.data = []
            return ret

        chain.insert.side_effect = insert_capturing
        # Last-version select (terminates with `.limit(1).execute()`).
        chain.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = (
            last_versions
        )
        # Prune select (terminates with `.order().execute()` — no .limit).
        chain.select.return_value.eq.return_value.order.return_value.execute.return_value.data = (
            last_versions
        )
        chain.delete.return_value.in_.return_value.execute.return_value.data = []
        return chain

    supabase = MagicMock()
    supabase.table.side_effect = table_factory
    return supabase, inserts


def test_checkpoint_records_when_markdown_differs_from_last_version() -> None:
    supabase, inserts = _checkpoint_supabase(
        current_md="# Daniel\n\nNew content\n",
        last_versions=[{"payload_md": "# Daniel\n\nOld content\n"}],
    )

    wrote = versions.checkpoint(supabase, "rec-1")

    assert wrote is True
    assert len(inserts) == 1
    assert inserts[0]["payload_md"] == "# Daniel\n\nNew content\n"
    assert inserts[0]["source"] == "user_edit"


def test_checkpoint_dedups_when_markdown_matches_last_version() -> None:
    md = "# Daniel\n\nUnchanged\n"
    supabase, inserts = _checkpoint_supabase(
        current_md=md,
        last_versions=[{"payload_md": md}],
    )

    wrote = versions.checkpoint(supabase, "rec-1")

    assert wrote is False
    assert inserts == []


def test_checkpoint_records_when_no_prior_versions() -> None:
    supabase, inserts = _checkpoint_supabase(
        current_md="# Daniel\n\nFirst snapshot\n",
        last_versions=[],
    )

    wrote = versions.checkpoint(supabase, "rec-1")

    assert wrote is True
    assert len(inserts) == 1


def test_checkpoint_returns_false_when_resume_missing() -> None:
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = (
        None
    )

    wrote = versions.checkpoint(supabase, "missing")

    assert wrote is False
