"""Tests for the deterministic v1 feedback learner.

These cover the pure token-extraction + frequency-analysis layer
(``_extract_tokens``, ``_frequent_tokens``) plus a smoke test of
``maybe_run_learner`` against an in-memory Supabase fake. The fake
keeps the test independent of network + Postgres at the cost of
mirroring the chain-API shape — when supabase-py changes its query
chain we'll need to update one place here.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import pytest

from app.models.feedback import FeedbackRow
from app.services.feedback import (
    _extract_tokens,
    _frequent_tokens,
    maybe_run_learner,
)


def _row(reason: str | None, signal: str = "irrelevant") -> FeedbackRow:
    now = datetime.now(UTC)
    return FeedbackRow(
        id="fb-" + (reason or "none")[:8],
        user_id="u",
        job_posting_id="j",
        target_id="t",
        signal=signal,  # type: ignore[arg-type]
        reason=reason,
        applied_at=None,
        applied_run_id=None,
        created_at=now,
        updated_at=now,
    )


# ---- Token extraction -----------------------------------------------------


class TestExtractTokens:
    def test_returns_empty_for_none(self) -> None:
        assert _extract_tokens(None) == []

    def test_returns_empty_for_empty_string(self) -> None:
        assert _extract_tokens("") == []

    def test_lowercases_and_drops_stopwords(self) -> None:
        tokens = _extract_tokens("This is a Sales role")
        # "this", "is", "a", "role" are all stopwords (incl. domain-generic)
        assert tokens == ["sales"]

    def test_drops_tokens_shorter_than_three_chars(self) -> None:
        # The token regex requires >=3 alpha chars to avoid noise from
        # initials and short markers.
        tokens = _extract_tokens("AI is good")
        assert "ai" not in tokens
        assert "good" in tokens

    def test_keeps_hyphenated_compound(self) -> None:
        tokens = _extract_tokens("entry-level coordinator")
        assert "entry-level" in tokens
        assert "coordinator" in tokens

    def test_strips_punctuation_only_runs(self) -> None:
        tokens = _extract_tokens("!!! wrong --- role ===")
        assert tokens == ["wrong"]


# ---- Frequency analysis ---------------------------------------------------


class TestFrequentTokens:
    def test_returns_empty_below_threshold(self) -> None:
        rows = [_row("sales rep"), _row("sales rep")]
        # Only 2 rows; threshold is 3.
        assert _frequent_tokens(rows, threshold=3) == []

    def test_picks_token_present_in_threshold_rows(self) -> None:
        rows = [
            _row("sales rep"),
            _row("sales role"),
            _row("sales position is wrong"),
        ]
        # "sales" in all 3 rows. "rep"/"role" only in 1 each. "wrong" in 1.
        tokens = _frequent_tokens(rows, threshold=3)
        assert tokens == ["sales"]

    def test_counts_distinct_rows_not_occurrences(self) -> None:
        # "sales sales sales" in one row only counts once.
        rows = [
            _row("sales sales sales"),
            _row("marketing"),
            _row("recruiting"),
        ]
        assert _frequent_tokens(rows, threshold=3) == []

    def test_returns_most_frequent_first(self) -> None:
        rows = [
            _row("sales recruiting"),
            _row("sales recruiting"),
            _row("sales recruiting"),
            _row("sales"),  # +1 for sales only
        ]
        tokens = _frequent_tokens(rows, threshold=3)
        # both appear in 3 rows, but sales is in 4 → first.
        assert tokens[0] == "sales"
        assert "recruiting" in tokens


# ---- maybe_run_learner with an in-memory fake -----------------------------


class _FakeQuery:
    """Records the query and returns a stub response on .execute().

    Implements the subset of the supabase-py query-builder chain that
    ``app.services.feedback`` actually uses. Reaching for anything new
    will surface as an AttributeError, which is the loud failure mode
    we want from a test fake.
    """

    def __init__(self, fake: "_FakeSupabase", table: str) -> None:
        self._fake = fake
        self._table = table
        self._op: str | None = None
        self._payload: Any = None
        self._filters: list[tuple[str, str, Any]] = []
        self._range: tuple[int, int] | None = None
        self._single = False

    def select(self, *_args: Any, **_kwargs: Any) -> "_FakeQuery":
        self._op = "select"
        return self

    def insert(self, payload: Any) -> "_FakeQuery":
        self._op = "insert"
        self._payload = payload
        return self

    def upsert(self, payload: Any, **_kwargs: Any) -> "_FakeQuery":
        self._op = "upsert"
        self._payload = payload
        return self

    def update(self, payload: Any) -> "_FakeQuery":
        self._op = "update"
        self._payload = payload
        return self

    def delete(self) -> "_FakeQuery":
        self._op = "delete"
        return self

    def eq(self, col: str, val: Any) -> "_FakeQuery":
        self._filters.append(("eq", col, val))
        return self

    def is_(self, col: str, val: Any) -> "_FakeQuery":
        self._filters.append(("is", col, val))
        return self

    def in_(self, col: str, val: Any) -> "_FakeQuery":
        self._filters.append(("in", col, val))
        return self

    def order(self, *_args: Any, **_kwargs: Any) -> "_FakeQuery":
        return self

    def limit(self, _n: int) -> "_FakeQuery":
        return self

    def range(self, start: int, end: int) -> "_FakeQuery":
        self._range = (start, end)
        return self

    def single(self) -> "_FakeQuery":
        self._single = True
        return self

    def execute(self) -> Any:
        self._fake.log.append(
            {
                "table": self._table,
                "op": self._op,
                "payload": self._payload,
                "filters": list(self._filters),
            }
        )
        data = self._fake.next_response(self._table, self._op, self._filters)
        if self._single:
            data = data[0] if data else None
        return type("Resp", (), {"data": data, "count": len(data or [])})()


class _FakeSupabase:
    """Programmable Supabase double. Push canned responses with
    ``push_response``; each ``.execute()`` consumes the next response
    matching (table, op).
    """

    def __init__(self) -> None:
        self.log: list[dict[str, Any]] = []
        self._responses: list[tuple[str, str | None, Any]] = []

    def push_response(self, table: str, op: str | None, data: Any) -> None:
        self._responses.append((table, op, data))

    def next_response(
        self, table: str, op: str | None, _filters: Any
    ) -> Any:
        for i, (t, o, d) in enumerate(self._responses):
            if t == table and o == op:
                self._responses.pop(i)
                return d
        return []

    def table(self, name: str) -> _FakeQuery:
        return _FakeQuery(self, name)


@pytest.fixture()
def fake() -> _FakeSupabase:
    return _FakeSupabase()


class TestMaybeRunLearner:
    def test_no_op_below_threshold(self, fake: _FakeSupabase) -> None:
        # 2 unapplied rows < threshold (3).
        fake.push_response(
            "job_feedback",
            "select",
            [_row("sales rep").model_dump(mode="json") for _ in range(2)],
        )
        result = maybe_run_learner(fake, user_id="u", target_id="t")  # type: ignore[arg-type]
        assert result is None

    def test_no_op_when_no_token_repeats(self, fake: _FakeSupabase) -> None:
        # 3 rows but no shared token after stopword filtering.
        fake.push_response(
            "job_feedback",
            "select",
            [
                _row("marketing").model_dump(mode="json"),
                _row("recruiting").model_dump(mode="json"),
                _row("consulting").model_dump(mode="json"),
            ],
        )
        assert maybe_run_learner(fake, user_id="u", target_id="t") is None  # type: ignore[arg-type]

    def test_skips_token_already_in_negative_list(
        self, fake: _FakeSupabase
    ) -> None:
        # Reasons where only "sales" passes both the token + frequency
        # filters — picking a single-word reason avoids accidentally
        # promoting a stopword-adjacent helper into the negative list.
        fake.push_response(
            "job_feedback",
            "select",
            [_row("sales").model_dump(mode="json") for _ in range(3)],
        )
        fake.push_response(
            "targets",
            "select",
            [
                {
                    "id": "t",
                    "scoring_profile": {
                        "negative": {"keywords": ["sales"], "weight": -10.0},
                    },
                    "profile_version": 1,
                }
            ],
        )
        result = maybe_run_learner(fake, user_id="u", target_id="t")  # type: ignore[arg-type]
        # "sales" is already a negative — nothing new to apply.
        assert result is None

    def test_applies_new_negative_and_bumps_version(
        self, fake: _FakeSupabase
    ) -> None:
        # 3 unapplied rows, all share "sales".
        fake.push_response(
            "job_feedback",
            "select",
            [_row("sales rep wrong").model_dump(mode="json") for _ in range(3)],
        )
        fake.push_response(
            "targets",
            "select",
            [
                {
                    "id": "t",
                    "scoring_profile": {
                        "negative": {"keywords": ["junior"], "weight": -10.0},
                    },
                    "profile_version": 1,
                }
            ],
        )
        # Update calls for targets + job_feedback. Push empty responses so
        # the fake doesn't raise.
        fake.push_response("targets", "update", [{"id": "t"}])
        fake.push_response("job_feedback", "update", [])

        result = maybe_run_learner(fake, user_id="u", target_id="t")  # type: ignore[arg-type]
        assert result is not None
        assert "sales" in result.added_negative_keywords
        # The "wrong" token shows up in all 3 rows too — also frequent.
        assert "wrong" in result.added_negative_keywords
        # "rep" is in 3 rows.
        assert "rep" in result.added_negative_keywords
        assert result.signals_consumed == 3
        assert result.profile_version_after == 2
        # An update on targets was logged.
        target_updates = [
            r for r in fake.log if r["table"] == "targets" and r["op"] == "update"
        ]
        assert target_updates, "expected a targets update"
        payload = target_updates[0]["payload"]
        assert payload["profile_version"] == 2
        # New negatives appended; existing "junior" preserved.
        new_negatives = payload["scoring_profile"]["negative"]["keywords"]
        assert "junior" in new_negatives
        assert "sales" in new_negatives
