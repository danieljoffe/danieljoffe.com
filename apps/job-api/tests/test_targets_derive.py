"""Tests for LLM-powered profile derivation (#495)."""

import json

import pytest

from app.models.targets import DerivedTarget
from app.services.llm.mock import MockLLMClient
from app.services.targets.derive_profile import (
    DEFAULT_MODEL,
    DEFAULT_PURPOSE,
    derive_profile_from_jd,
)


def _sample_derived_json() -> str:
    return json.dumps(
        {
            "scoring_profile": {
                "categories": {
                    "core_skills": {
                        "keywords": {"React": 3, "TypeScript": 3},
                        "weight": 2.0,
                    },
                    "secondary_skills": {
                        "keywords": {"Node.js": 2, "GraphQL": 2},
                        "weight": 1.0,
                    },
                    "nice_to_have": {
                        "keywords": {"Kubernetes": 1},
                        "weight": 0.5,
                    },
                },
                "seniority": {
                    "level": "senior",
                    "signals": ["5+ years", "lead"],
                },
                "domain": {
                    "signals": ["fintech"],
                    "weight": 0.5,
                },
                "negative": {
                    "keywords": ["junior", "intern"],
                    "weight": -10,
                },
            },
            "search_keywords": [
                "frontend engineer",
                "front-end engineer",
                "ui engineer",
            ],
        }
    )


@pytest.fixture
def llm() -> MockLLMClient:
    return MockLLMClient(scripted={DEFAULT_PURPOSE: _sample_derived_json()})


@pytest.mark.asyncio
async def test_derive_returns_derived_target(llm: MockLLMClient):
    derived, result = await derive_profile_from_jd(
        llm, jd_text="Senior Frontend Engineer at Acme Corp..."
    )
    assert isinstance(derived, DerivedTarget)
    assert derived.scoring_profile.categories["core_skills"].keywords["React"] == 3
    assert derived.scoring_profile.seniority.level == "senior"
    assert "fintech" in derived.scoring_profile.domain.signals
    assert "junior" in derived.scoring_profile.negative.keywords
    assert "frontend engineer" in derived.search_keywords


@pytest.mark.asyncio
async def test_derive_uses_default_model_and_purpose(llm: MockLLMClient):
    await derive_profile_from_jd(llm, jd_text="Some JD text here...")
    assert len(llm.calls) == 1
    assert llm.calls[0]["model"] == DEFAULT_MODEL
    assert llm.calls[0]["purpose"] == DEFAULT_PURPOSE


@pytest.mark.asyncio
async def test_derive_enables_system_cache(llm: MockLLMClient):
    await derive_profile_from_jd(llm, jd_text="Some JD text here...")
    assert llm.calls[0]["cache_system"] is True


@pytest.mark.asyncio
async def test_derive_sends_jd_as_user_message(llm: MockLLMClient):
    jd = "We are looking for a Staff Frontend Engineer..."
    await derive_profile_from_jd(llm, jd_text=jd)
    assert llm.calls[0]["messages_count"] == 1


@pytest.mark.asyncio
async def test_derive_returns_result_with_cost(llm: MockLLMClient):
    _, result = await derive_profile_from_jd(llm, jd_text="Some JD...")
    assert result.cost_usd > 0
    assert result.latency_ms > 0


@pytest.mark.asyncio
async def test_derive_model_override():
    client = MockLLMClient(
        scripted={"custom.purpose": _sample_derived_json()}
    )
    derived, _ = await derive_profile_from_jd(
        client,
        jd_text="Some JD text...",
        model="claude-haiku-4-5",
        purpose="custom.purpose",
    )
    assert isinstance(derived, DerivedTarget)
    assert client.calls[0]["model"] == "claude-haiku-4-5"


@pytest.mark.asyncio
async def test_derive_invalid_json_raises():
    client = MockLLMClient(scripted={DEFAULT_PURPOSE: "not valid json"})
    with pytest.raises(Exception):
        await derive_profile_from_jd(client, jd_text="Some JD...")
