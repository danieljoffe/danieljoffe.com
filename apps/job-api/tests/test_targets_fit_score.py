"""Deterministic LLM tests for fit-score derivation (#553 P4 / audit F0-E).

Covers the orchestration layer of derive_fit_score: parsing scripted LLM
JSON, wiring the right model/purpose/cache flags, and rejecting both
malformed JSON and out-of-range scores.

FitScoreResult bounds are tested in test_targets_user_links.py — this
file targets the LLM orchestration, not the schema itself.
"""

import json
from datetime import UTC, datetime

import pytest

from app.models.experience import OptimizedPayload, Skill
from app.models.targets import JobTarget, ScoringProfile
from app.services.llm.mock import MockLLMClient
from app.services.targets.fit_score import (
    DEFAULT_MODEL,
    DEFAULT_PURPOSE,
    FitScoreResult,
    derive_fit_score,
)


def _target() -> JobTarget:
    now = datetime.now(UTC)
    return JobTarget(
        id="t1",
        label="Senior Frontend Engineer",
        description="Frontend-focused IC role.",
        normalized_label="senior frontend engineer",
        scoring_profile=ScoringProfile(),
        search_keywords=["frontend"],
        activation_status="idle",
        profile_version=1,
        is_active=False,
        created_at=now,
        updated_at=now,
    )


def _payload() -> OptimizedPayload:
    return OptimizedPayload(
        summary="Senior frontend engineer with React + TS expertise.",
        skills=[Skill(name="React", years=8.0)],
    )


def _scripted_response(score: int = 82, reasoning: str = "Strong match.") -> str:
    return json.dumps({"fit_score": score, "reasoning": reasoning})


@pytest.fixture
def llm() -> MockLLMClient:
    return MockLLMClient(scripted={DEFAULT_PURPOSE: _scripted_response()})


@pytest.mark.asyncio
async def test_derive_fit_score_returns_result(llm: MockLLMClient) -> None:
    result, _ = await derive_fit_score(llm, payload=_payload(), target=_target())
    assert isinstance(result, FitScoreResult)
    assert result.fit_score == 82
    assert result.reasoning == "Strong match."


@pytest.mark.asyncio
async def test_derive_fit_score_uses_default_model_and_purpose(
    llm: MockLLMClient,
) -> None:
    await derive_fit_score(llm, payload=_payload(), target=_target())
    assert llm.calls[0]["model"] == DEFAULT_MODEL
    assert llm.calls[0]["purpose"] == DEFAULT_PURPOSE
    assert llm.calls[0]["cache_system"] is True
    assert llm.calls[0]["max_tokens"] == 512


@pytest.mark.asyncio
async def test_derive_fit_score_returns_cost(llm: MockLLMClient) -> None:
    _, result = await derive_fit_score(llm, payload=_payload(), target=_target())
    assert result.cost_usd > 0
    assert result.latency_ms > 0


@pytest.mark.asyncio
async def test_derive_fit_score_invalid_json_raises() -> None:
    client = MockLLMClient(scripted={DEFAULT_PURPOSE: "{not json"})
    with pytest.raises(Exception):
        await derive_fit_score(client, payload=_payload(), target=_target())


@pytest.mark.asyncio
async def test_derive_fit_score_rejects_score_over_100() -> None:
    """Pydantic Field(ge=0, le=100) must reject hallucinated out-of-range scores."""
    client = MockLLMClient(scripted={DEFAULT_PURPOSE: _scripted_response(score=150)})
    with pytest.raises(Exception):
        await derive_fit_score(client, payload=_payload(), target=_target())


@pytest.mark.asyncio
async def test_derive_fit_score_rejects_negative_score() -> None:
    client = MockLLMClient(scripted={DEFAULT_PURPOSE: _scripted_response(score=-5)})
    with pytest.raises(Exception):
        await derive_fit_score(client, payload=_payload(), target=_target())
