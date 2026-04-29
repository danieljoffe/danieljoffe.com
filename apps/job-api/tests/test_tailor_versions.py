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

    def select(self, *_: Any, **__: Any) -> "_RecordingChain":
        return self

    def insert(self, row: dict[str, Any]) -> "_RecordingChain":
        self.inserts.append(row)
        return self

    def delete(self) -> "_RecordingChain":
        return self

    def in_(self, _col: str, ids: list[str]) -> "_RecordingChain":
        self.deletes_in_ids.append(ids)
        return self

    def eq(self, *_: Any, **__: Any) -> "_RecordingChain":
        return self

    def order(self, *_: Any, **__: Any) -> "_RecordingChain":
        return self

    def limit(self, *_: Any, **__: Any) -> "_RecordingChain":
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
