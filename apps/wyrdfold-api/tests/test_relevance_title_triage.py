"""Tests for the Phase 1 LLM title triage.

Mocks the LLM client and asserts:
- Empty title batches short-circuit (no LLM call).
- Oversize batches raise rather than silently truncate.
- Happy path returns a dict keyed by 1-based input index.
- LLM failures fail-open (empty dict, caller admits everything).
- The user message embeds the target label + both example pools so
  the prompt has the few-shot anchors Phase 1 needs to discriminate.
- Missing verdicts in the LLM response are tolerated (treated as
  fail-open by the caller's ``.get(i, True)`` pattern, which we
  don't re-prove here — the contract is "missing key means caller
  decides", and the caller's logic is tested in poller tests).
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.targets import (
    CategoryProfile,
    JobTarget,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.relevance.title_triage import (
    PHASE1_BATCH_SIZE,
    TitleTriageResponse,
    TitleVerdict,
    _build_user_message,
    triage_titles,
)


def _target(
    *,
    promising: list[str] | None = None,
    unpromising: list[str] | None = None,
) -> JobTarget:
    return JobTarget(
        id="t-1",
        label="Staff Frontend Engineer",
        scoring_profile=ScoringProfile(
            categories={"core_skills": CategoryProfile(keywords={"x": 1}, weight=2.0)},
            seniority=SeniorityProfile(signals=["staff"]),
        ),
        search_keywords=["frontend engineer"],
        is_active=True,
        example_promising_titles=promising or [],
        example_unpromising_titles=unpromising or [],
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


# ---- _build_user_message --------------------------------------------------


class TestBuildUserMessage:
    def test_includes_target_label(self) -> None:
        msg = _build_user_message(_target(), ["Senior Frontend Engineer"])
        assert "Staff Frontend Engineer" in msg

    def test_includes_promising_pool(self) -> None:
        target = _target(promising=["Senior FE Engineer", "Web Platform Engineer"])
        msg = _build_user_message(target, ["X"])
        assert "PROMISING" in msg
        assert "Senior FE Engineer" in msg
        assert "Web Platform Engineer" in msg

    def test_includes_unpromising_pool(self) -> None:
        target = _target(unpromising=["Sales Lead", "Product Designer"])
        msg = _build_user_message(target, ["X"])
        assert "UNPROMISING" in msg
        assert "Sales Lead" in msg

    def test_omits_pool_section_when_pool_is_empty(self) -> None:
        # Defensive: an empty pool should leave its header out, not
        # render "Examples of PROMISING titles for this target:\n\n".
        msg = _build_user_message(_target(), ["X"])
        # Header only appears when pool is non-empty.
        assert "Examples of PROMISING titles" not in msg
        assert "Examples of UNPROMISING titles" not in msg

    def test_numbers_titles_starting_at_1(self) -> None:
        msg = _build_user_message(_target(), ["A", "B", "C"])
        assert "1. A" in msg
        assert "2. B" in msg
        assert "3. C" in msg
        assert "0. A" not in msg  # no zero-indexed

    def test_includes_batch_size_in_instruction(self) -> None:
        msg = _build_user_message(_target(), ["A", "B", "C"])
        assert "3 candidate titles" in msg


# ---- triage_titles --------------------------------------------------------


class TestTriageTitles:
    @pytest.mark.asyncio
    async def test_empty_batch_short_circuits(self) -> None:
        llm = MagicMock()
        verdicts, result = await triage_titles(llm, target=_target(), titles=[])
        assert verdicts == {}
        assert result is None
        # No LLM call happened.
        llm.complete_tool_use.assert_not_called()

    @pytest.mark.asyncio
    async def test_oversize_batch_raises(self) -> None:
        llm = MagicMock()
        titles = [f"Title {i}" for i in range(PHASE1_BATCH_SIZE + 1)]
        with pytest.raises(ValueError, match="exceeds PHASE1_BATCH_SIZE"):
            await triage_titles(llm, target=_target(), titles=titles)
        llm.complete_tool_use.assert_not_called()

    @pytest.mark.asyncio
    async def test_happy_path_returns_dict_keyed_by_index(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """One verdict per input title, keyed by 1-based id."""
        llm = MagicMock()

        # ``complete_json`` does the schema validation; mock its return
        # rather than going through the tool-use plumbing.
        async def fake_complete_json(*args: object, **kwargs: object) -> object:
            return (
                TitleTriageResponse(
                    verdicts=[
                        TitleVerdict(id=1, promising=True),
                        TitleVerdict(id=2, promising=False),
                        TitleVerdict(id=3, promising=True),
                    ]
                ),
                MagicMock(),  # LLMResult — caller treats opaquely
            )

        monkeypatch.setattr(
            "app.services.relevance.title_triage.complete_json",
            fake_complete_json,
        )

        verdicts, result = await triage_titles(
            llm,
            target=_target(),
            titles=["Senior FE", "Sales Lead", "Web Engineer"],
        )

        # Now returns dict[int, TitleVerdict] (confidence field optional).
        assert set(verdicts.keys()) == {1, 2, 3}
        assert verdicts[1].promising is True
        assert verdicts[2].promising is False
        assert verdicts[3].promising is True
        assert result is not None  # MagicMock, but not None

    @pytest.mark.asyncio
    async def test_llm_failure_fails_open(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Network/parse/timeout errors return ({}, None) so the caller
        admits everything. A Phase 1 outage must not block ingestion."""
        llm = MagicMock()

        async def boom(*args: object, **kwargs: object) -> object:
            raise RuntimeError("anthropic-api 503")

        monkeypatch.setattr(
            "app.services.relevance.title_triage.complete_json", boom
        )

        verdicts, result = await triage_titles(
            llm, target=_target(), titles=["A"]
        )

        assert verdicts == {}
        assert result is None

    @pytest.mark.asyncio
    async def test_duplicate_verdict_last_wins(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """If the LLM hallucinates duplicates, the later one overwrites.
        Documents the contract — we don't error out on a model that
        slips up; we just take the last verdict per id."""
        async def fake_complete_json(*args: object, **kwargs: object) -> object:
            return (
                TitleTriageResponse(
                    verdicts=[
                        TitleVerdict(id=1, promising=True),
                        TitleVerdict(id=1, promising=False),  # duplicate
                    ]
                ),
                MagicMock(),
            )

        monkeypatch.setattr(
            "app.services.relevance.title_triage.complete_json",
            fake_complete_json,
        )

        llm = MagicMock()
        verdicts, _ = await triage_titles(llm, target=_target(), titles=["A"])
        assert set(verdicts.keys()) == {1}
        assert verdicts[1].promising is False

    @pytest.mark.asyncio
    async def test_missing_verdict_omitted_from_dict(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """When the LLM omits an id, we don't fabricate a value.
        Caller-side .get(i, True) handles the fail-open."""
        async def fake_complete_json(*args: object, **kwargs: object) -> object:
            return (
                TitleTriageResponse(
                    verdicts=[TitleVerdict(id=1, promising=True)]
                    # id=2 missing
                ),
                MagicMock(),
            )

        monkeypatch.setattr(
            "app.services.relevance.title_triage.complete_json",
            fake_complete_json,
        )

        llm = MagicMock()
        verdicts, _ = await triage_titles(
            llm, target=_target(), titles=["A", "B"]
        )

        # Only the present id is in the dict; caller treats missing as
        # admit (fail-open).
        assert set(verdicts.keys()) == {1}
        assert verdicts[1].promising is True
        assert 2 not in verdicts


# AsyncMock is imported for parity with similar tests in the suite; this
# pattern matters once we add an integration test that drives the real
# LLM client mock.
_ = AsyncMock  # keep the import live for follow-up
