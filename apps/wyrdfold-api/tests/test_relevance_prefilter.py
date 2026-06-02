"""Tests for the ingestion-time embedding pre-filter helpers.

``prepare_prefilter`` is an integration-shaped function with Supabase
+ EmbeddingsClient + JobTarget dependencies, so it's covered via the
``MockEmbeddingsClient`` plus a small in-memory Supabase fake. The
pure helpers (``cosine_similarity``, ``title_passes_prefilter``) get
direct unit tests.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import pytest

from app.models.targets import (
    CategoryProfile,
    JobTarget,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.embeddings.mock import MockEmbeddingsClient
from app.services.relevance_prefilter import (
    PREFILTER_THRESHOLD,
    cosine_similarity,
    prepare_prefilter,
    title_passes_prefilter,
)

# ---- cosine_similarity ----------------------------------------------------


class TestCosineSimilarity:
    def test_identical_vectors_return_one(self) -> None:
        v = [0.1, 0.2, 0.3, 0.4]
        assert cosine_similarity(v, v) == pytest.approx(1.0)

    def test_orthogonal_vectors_return_zero(self) -> None:
        assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)

    def test_opposite_vectors_return_negative_one(self) -> None:
        assert cosine_similarity([1.0, 0.0], [-1.0, 0.0]) == pytest.approx(-1.0)

    def test_empty_vector_returns_zero(self) -> None:
        assert cosine_similarity([], [1.0, 2.0]) == 0.0
        assert cosine_similarity([1.0, 2.0], []) == 0.0

    def test_mismatched_dimensions_return_zero(self) -> None:
        # Defensive: we never want a misconfigured pair to silently
        # truncate-and-compare. Returning 0 (which fails the gate's
        # threshold check) makes the misconfiguration visible.
        assert cosine_similarity([1.0, 2.0], [1.0, 2.0, 3.0]) == 0.0

    def test_zero_norm_returns_zero(self) -> None:
        assert cosine_similarity([0.0, 0.0], [1.0, 2.0]) == 0.0


# ---- title_passes_prefilter ----------------------------------------------


class TestTitlePassesPrefilter:
    def test_admits_when_title_embedding_missing(self) -> None:
        # Couldn't embed → don't drop. Fail-open semantics.
        assert title_passes_prefilter(None, [[0.1] * 4]) is True

    def test_admits_when_no_targets_provided(self) -> None:
        assert title_passes_prefilter([0.1, 0.2, 0.3, 0.4], []) is True

    def test_admits_when_any_target_embedding_missing(self) -> None:
        # Fail-open per target — a target without an embedding hasn't
        # been processed yet by the lazy back-fill in the poller.
        title = [1.0, 0.0]
        targets = [None, [0.0, 1.0]]  # second is orthogonal
        assert title_passes_prefilter(title, targets) is True

    def test_admits_when_at_least_one_target_meets_threshold(self) -> None:
        title = [1.0, 0.0]
        # First target is identical (cosine 1.0), second is orthogonal.
        targets: list[list[float] | None] = [[1.0, 0.0], [0.0, 1.0]]
        assert title_passes_prefilter(title, targets, threshold=0.9) is True

    def test_rejects_when_all_targets_below_threshold(self) -> None:
        title = [1.0, 0.0]
        # Both orthogonal (cosine 0).
        targets: list[list[float] | None] = [[0.0, 1.0], [0.0, -1.0]]
        assert title_passes_prefilter(title, targets, threshold=0.5) is False

    def test_default_threshold_is_the_module_constant(self) -> None:
        # Sanity: a slightly-related title should pass at the module
        # default but fail at a higher threshold. Locks the calibration
        # we shipped with.
        title = [1.0, 0.5]
        target = [1.0, 0.6]
        passes_default = title_passes_prefilter(title, [target])
        passes_stricter = title_passes_prefilter(title, [target], threshold=0.999)
        assert passes_default is True
        assert passes_stricter is False
        assert PREFILTER_THRESHOLD < 1.0  # guard against degenerate retune


# ---- prepare_prefilter (mock client + fake supabase) ---------------------


def _target(label: str, embedding: list[float] | None = None) -> JobTarget:
    return JobTarget(
        id=f"t-{label[:6]}",
        label=label,
        scoring_profile=ScoringProfile(
            categories={"core_skills": CategoryProfile(keywords={"x": 1}, weight=2.0)},
            seniority=SeniorityProfile(signals=["director"]),
        ),
        search_keywords=[],
        is_active=True,
        label_embedding=embedding,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


class _FakeQuery:
    def __init__(self, log: list[dict[str, Any]], table: str) -> None:
        self._log = log
        self._table = table
        self._op: str | None = None
        self._payload: Any = None

    def select(self, *_a: Any, **_k: Any) -> _FakeQuery:
        self._op = "select"
        return self

    def insert(self, payload: Any) -> _FakeQuery:
        self._op = "insert"
        self._payload = payload
        return self

    def update(self, payload: Any) -> _FakeQuery:
        self._op = "update"
        self._payload = payload
        return self

    def eq(self, _c: str, _v: Any) -> _FakeQuery:
        return self

    def execute(self) -> Any:
        self._log.append(
            {"table": self._table, "op": self._op, "payload": self._payload}
        )
        return type("Resp", (), {"data": [], "count": 0})()


class _FakeSupabase:
    def __init__(self) -> None:
        self.log: list[dict[str, Any]] = []

    def table(self, name: str) -> _FakeQuery:
        return _FakeQuery(self.log, name)


@pytest.mark.asyncio
async def test_prepare_prefilter_backfills_missing_target_embedding() -> None:
    """Targets whose ``label_embedding`` is NULL get embedded + persisted
    on first poll. Mock client returns deterministic non-empty vectors,
    so we can assert the persist call fired with a list-of-floats."""
    fake = _FakeSupabase()
    client = MockEmbeddingsClient()

    t = _target("Director of CX Operations")
    assert t.label_embedding is None

    target_embeds, title_embeds = await prepare_prefilter(
        fake, client, [t], ["Director of Customer Success"]
    )

    # In-memory mutation so subsequent gate runs use the fresh embed.
    assert t.label_embedding is not None
    assert len(t.label_embedding) > 0
    assert len(target_embeds) == 1 and target_embeds[0] == t.label_embedding
    assert len(title_embeds) == 1 and title_embeds[0] is not None

    # Persisted to ``targets`` via an UPDATE.
    target_updates = [
        r for r in fake.log if r["table"] == "targets" and r["op"] == "update"
    ]
    assert target_updates, "expected an UPDATE on targets to persist label_embedding"
    payload = target_updates[0]["payload"]
    assert "label_embedding" in payload
    assert isinstance(payload["label_embedding"], list)


@pytest.mark.asyncio
async def test_prepare_prefilter_skips_backfill_when_embedding_present() -> None:
    """Targets that already have an embedding are not re-embedded — keeps
    the per-poll Voyage cost flat instead of growing with active targets."""
    fake = _FakeSupabase()
    client = MockEmbeddingsClient()

    cached = [0.1] * 8
    t = _target("Director of CX Operations", embedding=cached)

    await prepare_prefilter(fake, client, [t], ["Director of Customer Success"])

    target_updates = [
        r for r in fake.log if r["table"] == "targets" and r["op"] == "update"
    ]
    assert target_updates == []
    assert t.label_embedding == cached


@pytest.mark.asyncio
async def test_prepare_prefilter_handles_empty_title_strings() -> None:
    """An empty title gets a ``None`` slot in the output so the gate
    fails open for that position — Greenhouse occasionally returns
    null titles on contractor/recruiter postings."""
    fake = _FakeSupabase()
    client = MockEmbeddingsClient()

    t = _target("Director of CX Operations", embedding=[0.1] * 8)
    target_embeds, title_embeds = await prepare_prefilter(
        fake, client, [t], ["Director of Customer Success", "", "  "]
    )

    assert len(title_embeds) == 3
    assert title_embeds[0] is not None
    assert title_embeds[1] is None
    assert title_embeds[2] is None
