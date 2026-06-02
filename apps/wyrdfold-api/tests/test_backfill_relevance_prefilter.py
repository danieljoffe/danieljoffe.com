"""Tests for the relevance-prefilter backfill script.

The two ``backfill_*_embeddings`` functions are integration-heavy
(real Voyage + Supabase), so they're covered by the script's
``--dry-run`` flag in operator workflow rather than unit tests. The
logic that needs guarding is:

- ``_parse_pgvector`` — both PostgREST encodings must round-trip
  cleanly, otherwise the cosine step silently no-ops.
- ``exclude_cosine_failures`` — this is the one piece that mutates
  many rows. The threshold, fail-open semantics, target-id filter,
  and dry-run guard all have to behave.
"""

from __future__ import annotations

from typing import Any

from scripts.backfill_relevance_prefilter import (
    _parse_pgvector,
    exclude_cosine_failures,
)

# ---- _parse_pgvector -----------------------------------------------------


class TestParsePgvector:
    def test_none_returns_none(self) -> None:
        assert _parse_pgvector(None) is None

    def test_list_returns_floats(self) -> None:
        assert _parse_pgvector([1, 2, 3]) == [1.0, 2.0, 3.0]

    def test_pgvector_string_returns_floats(self) -> None:
        assert _parse_pgvector("[0.1,0.2,0.3]") == [0.1, 0.2, 0.3]

    def test_empty_bracket_string_returns_none(self) -> None:
        # PostgREST sometimes emits "[]" for a NULL-ish vector; treat
        # it as missing so the gate's fail-open path kicks in instead
        # of comparing against a zero-length vector.
        assert _parse_pgvector("[]") is None

    def test_unknown_type_returns_none(self) -> None:
        assert _parse_pgvector(42) is None


# ---- in-memory Supabase fake --------------------------------------------


class _FakeQuery:
    def __init__(
        self,
        store: dict[str, list[dict[str, Any]]],
        log: list[dict[str, Any]],
        table: str,
    ) -> None:
        self._store = store
        self._log = log
        self._table = table
        self._filters: list[tuple[str, str, Any]] = []
        self._op: str | None = None
        self._payload: Any = None
        self._range: tuple[int, int] | None = None

    # ---- builder methods ----
    def select(self, *_a: Any, **_k: Any) -> _FakeQuery:
        self._op = "select"
        return self

    def update(self, payload: Any) -> _FakeQuery:
        self._op = "update"
        self._payload = payload
        return self

    def eq(self, col: str, val: Any) -> _FakeQuery:
        self._filters.append(("eq", col, val))
        return self

    def in_(self, col: str, vals: list[Any]) -> _FakeQuery:
        self._filters.append(("in", col, vals))
        return self

    def range(self, lo: int, hi: int) -> _FakeQuery:
        self._range = (lo, hi)
        return self

    def is_(self, col: str, val: Any) -> _FakeQuery:
        # Only used by jobs.title_embedding NULL filter — not exercised by
        # the tests in this module but kept here to match the script's
        # builder usage so a Read-against-jobs call wouldn't NPE.
        self._filters.append(("is", col, val))
        return self

    # ---- execution ----
    def _matches(self, row: dict[str, Any]) -> bool:
        for op, col, val in self._filters:
            if op == "eq" and row.get(col) != val:
                return False
            if op == "in" and row.get(col) not in val:
                return False
            if op == "is" and val == "null" and row.get(col) is not None:
                return False
        return True

    def execute(self) -> Any:
        rows = self._store.get(self._table, [])
        matched = [r for r in rows if self._matches(r)]
        if self._op == "select":
            data = matched
            if self._range is not None:
                lo, hi = self._range
                data = data[lo : hi + 1]
            self._log.append(
                {"table": self._table, "op": "select", "n": len(data)}
            )
            return type("Resp", (), {"data": data, "count": len(matched)})()
        if self._op == "update":
            updated_ids = []
            for r in matched:
                r.update(self._payload)
                updated_ids.append(r.get("id"))
            self._log.append(
                {
                    "table": self._table,
                    "op": "update",
                    "payload": self._payload,
                    "ids": updated_ids,
                }
            )
            return type("Resp", (), {"data": matched, "count": len(matched)})()
        return type("Resp", (), {"data": [], "count": 0})()


class _FakeSupabase:
    def __init__(self, store: dict[str, list[dict[str, Any]]]) -> None:
        self.store = store
        self.log: list[dict[str, Any]] = []

    def table(self, name: str) -> _FakeQuery:
        return _FakeQuery(self.store, self.log, name)


# ---- exclude_cosine_failures --------------------------------------------


def _make_store() -> dict[str, list[dict[str, Any]]]:
    """Two targets, three jobs, six scores rows.

    target T1 (engineering) ~= job J1 (engineering); orthogonal to J2,J3.
    target T2 (CX)          ~= job J2 (CX);          orthogonal to J1,J3.
    job J3 has no embedding (e.g. embed failed on empty title).
    """
    return {
        "scores": [
            {"id": "s1", "job_posting_id": "J1", "target_id": "T1", "excluded": False},
            {"id": "s2", "job_posting_id": "J2", "target_id": "T1", "excluded": False},
            {"id": "s3", "job_posting_id": "J3", "target_id": "T1", "excluded": False},
            {"id": "s4", "job_posting_id": "J1", "target_id": "T2", "excluded": False},
            {"id": "s5", "job_posting_id": "J2", "target_id": "T2", "excluded": False},
            # already excluded — must not be touched.
            {"id": "s6", "job_posting_id": "J1", "target_id": "T2", "excluded": True},
        ],
    }


class TestExcludeCosineFailures:
    def test_excludes_rows_below_threshold(self) -> None:
        supabase = _FakeSupabase(_make_store())
        target_embeds = {"T1": [1.0, 0.0], "T2": [0.0, 1.0]}
        job_embeds = {"J1": [1.0, 0.0], "J2": [0.0, 1.0]}

        summary = exclude_cosine_failures(
            supabase,  # type: ignore[arg-type]
            target_embeds=target_embeds,
            job_embeds=job_embeds,
            threshold=0.5,
            target_id_filter=None,
            dry_run=False,
        )

        # s1 (T1/J1): cosine=1.0 keep
        # s2 (T1/J2): cosine=0.0 EXCLUDE
        # s3 (T1/J3): no job embed, skipped
        # s4 (T2/J1): cosine=0.0 EXCLUDE
        # s5 (T2/J2): cosine=1.0 keep
        # s6 (T2/J1): already excluded, not in base query
        assert summary["evaluated"] == 5
        assert summary["to_exclude"] == 2
        assert summary["no_job_embed"] == 1

        # Inspect the persisted state in the fake store.
        scores = {r["id"]: r["excluded"] for r in supabase.store["scores"]}
        assert scores == {
            "s1": False,
            "s2": True,
            "s3": False,
            "s4": True,
            "s5": False,
            "s6": True,
        }

    def test_dry_run_does_not_write(self) -> None:
        supabase = _FakeSupabase(_make_store())
        summary = exclude_cosine_failures(
            supabase,  # type: ignore[arg-type]
            target_embeds={"T1": [1.0, 0.0]},
            job_embeds={"J2": [0.0, 1.0]},
            threshold=0.5,
            target_id_filter=None,
            dry_run=True,
        )

        # s2 (T1/J2) is the only row with both embeds where cosine<0.5.
        # Everything else either has no target embed (T2) or no job embed
        # (J1, J3 in the lookup we passed).
        assert summary["to_exclude"] == 1

        # The store must be untouched apart from existing s6 exclusion.
        scores = {r["id"]: r["excluded"] for r in supabase.store["scores"]}
        assert scores == {
            "s1": False, "s2": False, "s3": False,
            "s4": False, "s5": False, "s6": True,
        }
        # And no UPDATE call should appear in the log.
        assert not [r for r in supabase.log if r["op"] == "update"]

    def test_target_id_filter_narrows_evaluation_scope(self) -> None:
        supabase = _FakeSupabase(_make_store())
        target_embeds = {"T1": [1.0, 0.0], "T2": [0.0, 1.0]}
        job_embeds = {"J1": [1.0, 0.0], "J2": [0.0, 1.0]}

        summary = exclude_cosine_failures(
            supabase,  # type: ignore[arg-type]
            target_embeds=target_embeds,
            job_embeds=job_embeds,
            threshold=0.5,
            target_id_filter="T2",
            dry_run=False,
        )

        # Only s4 and s5 belong to T2 (s6 is already excluded). Of those,
        # s4 (T2/J1) has cosine 0.0 → exclude; s5 (T2/J2) cosine 1.0 keep.
        assert summary["evaluated"] == 2
        assert summary["to_exclude"] == 1
        # s1 must NOT be touched even though it would also fail cosine vs T2.
        assert supabase.store["scores"][0]["excluded"] is False  # s1 untouched

    def test_skips_when_target_embedding_missing(self) -> None:
        """Fail-open: target without an embedding does NOT cause exclusions."""
        supabase = _FakeSupabase(_make_store())
        summary = exclude_cosine_failures(
            supabase,  # type: ignore[arg-type]
            target_embeds={},  # no target embeddings at all
            job_embeds={"J1": [1.0, 0.0], "J2": [0.0, 1.0]},
            threshold=0.5,
            target_id_filter=None,
            dry_run=False,
        )
        assert summary["to_exclude"] == 0
        assert summary["no_target_embed"] == 5
        scores = {r["id"]: r["excluded"] for r in supabase.store["scores"]}
        assert all(v is False for k, v in scores.items() if k != "s6")
