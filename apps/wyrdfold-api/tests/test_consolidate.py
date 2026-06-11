"""Tests for prose consolidation service + endpoint."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.models.experience import ProseDoc
from app.services.experience import consolidate
from app.services.experience.consolidate import (
    DEFAULT_PURPOSE,
    MIN_CONSOLIDATE_CHARS,
    consolidate_prose,
    is_no_op,
)
from app.services.llm.mock import MockLLMClient

# ---------------------------------------------------------------------------
# Service: consolidate_prose
# ---------------------------------------------------------------------------


class TestConsolidateProse:
    async def test_short_content_skips_llm(self) -> None:
        content = "Just a short bio paragraph."
        llm = MockLLMClient()
        consolidated, result, fallback_reason = await consolidate_prose(
            llm, content=content
        )
        assert consolidated == content
        assert result is None
        assert fallback_reason is None
        assert llm.calls == []

    async def test_calls_llm_for_long_content(self) -> None:
        # Bloated doc: same role mentioned 3 times.
        bloated = (
            "Senior Frontend Engineer at Acme. Built React apps.\n"
            "--- [Uploaded Resume: a.pdf]\n"
            "Senior Frontend Engineer, Acme — built apps in React.\n"
            "--- [Uploaded Resume: b.pdf]\n"
            "Senior Frontend Engineer (Acme): React app development.\n"
        ) * 50  # cross MIN_CONSOLIDATE_CHARS

        # Scripted "consolidated" output: shorter than input (consolidation
        # happened) but above the MIN_OUTPUT_RATIO floor so the safety
        # fallback doesn't trigger.
        clean_unit = "Senior Frontend Engineer at Acme. Built React apps.\n"
        from app.services.experience.consolidate import MIN_OUTPUT_RATIO

        target_chars = int(len(bloated) * (MIN_OUTPUT_RATIO + 0.30))
        clean = clean_unit * (target_chars // len(clean_unit) + 1)
        llm = MockLLMClient(scripted={DEFAULT_PURPOSE: clean})

        consolidated, result, fallback_reason = await consolidate_prose(
            llm, content=bloated
        )
        assert consolidated == clean.strip()
        assert len(consolidated) < len(bloated)
        assert result is not None
        assert fallback_reason is None
        assert llm.calls and llm.calls[0]["purpose"] == DEFAULT_PURPOSE

    async def test_short_llm_output_falls_back_to_input(self) -> None:
        # Long doc; LLM returns a one-word "summary" (clearly paraphrased).
        long_doc = "real career detail. " * 500
        too_short = "Engineer."
        llm = MockLLMClient(scripted={DEFAULT_PURPOSE: too_short})

        consolidated, result, fallback_reason = await consolidate_prose(
            llm, content=long_doc
        )
        assert consolidated == long_doc  # safety fallback
        assert result is not None  # but LLM call still made (for cost log)
        assert fallback_reason == "output_too_short"

    async def test_heavy_dedup_clears_floor(self) -> None:
        # Eight near-identical resume copies — legitimately consolidates to
        # ~12% of input length. Floor was 0.20 (broken: tripped the safety
        # net on real workloads); now 0.05, which lets this through.
        resume_unit = (
            "Daniel Joffe — Senior Engineer\n"
            "FightCamp: cut FCP from 10s to 2s. Internet Brands: built React "
            "library adopted by 80% of apps. Winc: shipped self-serve CMS.\n"
            "Skills: React, TypeScript, Next.js, Supabase.\n"
        ) * 3  # make each copy big enough that 8 copies clear MIN_CONSOLIDATE_CHARS
        bloated = (resume_unit + "--- [Uploaded Resume: r.pdf]\n") * 8
        consolidated_one_copy = resume_unit  # ~1/8 of input
        llm = MockLLMClient(scripted={DEFAULT_PURPOSE: consolidated_one_copy})

        # Sanity: the test only exercises the LLM path if input clears the
        # short-circuit threshold.
        assert len(bloated) >= MIN_CONSOLIDATE_CHARS

        consolidated, result, fallback_reason = await consolidate_prose(
            llm, content=bloated
        )

        # The 12%-ish output must NOT trip the floor.
        assert consolidated == consolidated_one_copy.strip()
        assert fallback_reason is None
        assert result is not None
        ratio = len(consolidated) / len(bloated)
        assert ratio < 0.20, "test setup invalid: dedup too small to be meaningful"


# ---------------------------------------------------------------------------
# Helper: is_no_op
# ---------------------------------------------------------------------------


class TestIsNoOp:
    def test_empty_before_is_no_op(self) -> None:
        assert is_no_op(before="", after="anything") is True

    def test_same_length_is_no_op(self) -> None:
        s = "x" * 1000
        assert is_no_op(before=s, after=s) is True

    def test_substantially_shorter_is_not_no_op(self) -> None:
        before = "x" * 1000
        after = "x" * 500
        assert is_no_op(before=before, after=after) is False


# ---------------------------------------------------------------------------
# Endpoint: POST /experience/prose/consolidate
# ---------------------------------------------------------------------------


class TestConsolidateEndpoint:
    @pytest.mark.asyncio
    async def test_404_when_no_prose(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from fastapi import HTTPException

        from app.routers import experience as exp_router

        monkeypatch.setattr(
            "app.services.experience.prose.get_latest", lambda *a, **kw: None
        )

        with pytest.raises(HTTPException) as exc_info:
            await exp_router.consolidate_prose(
                request=MagicMock(), supabase=MagicMock(), llm=MagicMock()
            )
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_no_op_when_doc_too_short(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        from app.routers import experience as exp_router

        existing = ProseDoc(
            id="prose-1",
            user_id=None,
            version=2,
            content="Short bio.",
            created_at=datetime.now(UTC),
        )
        monkeypatch.setattr(
            "app.services.experience.prose.get_latest", lambda *a, **kw: existing
        )

        # Should never be called when doc is short — but guard if it is.
        create_called = {"count": 0}

        def fake_create(*a: Any, **kw: Any) -> ProseDoc:
            create_called["count"] += 1
            return existing

        monkeypatch.setattr(
            "app.services.experience.prose.create_version", fake_create
        )

        result = await exp_router.consolidate_prose(
            request=MagicMock(), supabase=MagicMock(), llm=MockLLMClient()
        )
        assert result.no_op is True
        assert result.chars_before == result.chars_after
        assert create_called["count"] == 0

    @pytest.mark.asyncio
    async def test_persists_consolidated_version(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        from app.routers import experience as exp_router

        bloated = "Senior FE Engineer at Acme. Built React apps. " * 200
        existing = ProseDoc(
            id="prose-1",
            user_id=None,
            version=2,
            content=bloated,
            created_at=datetime.now(UTC),
        )
        clean = "Senior FE Engineer at Acme. Built React apps."

        monkeypatch.setattr(
            "app.services.experience.prose.get_latest", lambda *a, **kw: existing
        )

        new_doc = ProseDoc(
            id="prose-2",
            user_id=None,
            version=3,
            content=clean,
            created_at=datetime.now(UTC),
        )
        monkeypatch.setattr(
            "app.services.experience.prose.create_version",
            lambda *a, **kw: new_doc,
        )
        monkeypatch.setattr(
            "app.services.llm.cost_log.record", MagicMock()
        )

        # Set scripted output well above the MIN_OUTPUT_RATIO floor (0.05);
        # 25% of bloated length keeps a wide safety margin.
        scripted_clean = clean + " More detail. " * (
            (len(bloated) // 4) // len(" More detail. ")
        )
        llm = MockLLMClient(scripted={DEFAULT_PURPOSE: scripted_clean})

        # Sanity: input must clear MIN_CONSOLIDATE_CHARS for the LLM to run.
        assert len(bloated) >= MIN_CONSOLIDATE_CHARS

        result = await exp_router.consolidate_prose(
            request=MagicMock(), supabase=MagicMock(), llm=llm
        )

        assert result.prose.version == 3
        assert result.chars_before == len(bloated)
        assert result.chars_after < result.chars_before
        assert result.no_op is False
        assert llm.calls and llm.calls[0]["purpose"] == DEFAULT_PURPOSE


# ---------------------------------------------------------------------------
# Constants sanity
# ---------------------------------------------------------------------------


def test_module_exports() -> None:
    assert consolidate.DEFAULT_PURPOSE == "experience.prose_consolidate"
    assert consolidate.DEFAULT_MODEL == "claude-sonnet-4-6"
    assert consolidate.MIN_CONSOLIDATE_CHARS > 0
