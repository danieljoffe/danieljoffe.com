"""Deterministic LLM tests for target suggestion (#495 / audit F0-E).

Asserts that suggest_targets correctly parses scripted LLM JSON, wires the
right model/purpose/cache flags, and surfaces parse errors instead of
silently corrupting downstream callers.
"""

import json

import pytest

from app.models.experience import OptimizedPayload, Role, Skill
from app.models.targets import TargetSuggestions
from app.services.llm.mock import MockLLMClient
from app.services.targets.suggest import (
    DEFAULT_MODEL,
    DEFAULT_PURPOSE,
    suggest_targets,
)


def _payload() -> OptimizedPayload:
    return OptimizedPayload(
        summary="Senior frontend engineer with 8 years building React apps.",
        roles=[
            Role(
                id="r1",
                company="Acme",
                title="Senior Frontend Engineer",
                start="2020",
                end="present",
                skills=["React", "TypeScript"],
            ),
        ],
        skills=[
            Skill(name="React", years=8.0),
            Skill(name="TypeScript", years=6.0),
        ],
    )


def _scripted_response() -> str:
    return json.dumps(
        {
            "suggestions": [
                {
                    "label": "Staff Frontend Engineer",
                    "description": "Senior IC roles emphasizing systems and DX.",
                    "core_skills": ["React", "TypeScript", "Testing"],
                },
                {
                    "label": "Engineering Manager",
                    "description": "Player-coach roles leveraging your IC depth.",
                    "core_skills": ["React", "Mentorship", "Architecture"],
                },
            ]
        }
    )


@pytest.fixture
def llm() -> MockLLMClient:
    return MockLLMClient(scripted={DEFAULT_PURPOSE: _scripted_response()})


@pytest.mark.asyncio
async def test_suggest_returns_target_suggestions(llm: MockLLMClient) -> None:
    suggestions, _ = await suggest_targets(llm, payload=_payload())
    assert isinstance(suggestions, TargetSuggestions)
    assert len(suggestions.suggestions) == 2
    assert suggestions.suggestions[0].label == "Staff Frontend Engineer"
    assert "React" in suggestions.suggestions[0].core_skills


@pytest.mark.asyncio
async def test_suggest_uses_default_model_and_purpose(llm: MockLLMClient) -> None:
    await suggest_targets(llm, payload=_payload())
    assert llm.calls[0]["model"] == DEFAULT_MODEL
    assert llm.calls[0]["purpose"] == DEFAULT_PURPOSE


@pytest.mark.asyncio
async def test_suggest_caches_system_prompt(llm: MockLLMClient) -> None:
    await suggest_targets(llm, payload=_payload())
    assert llm.calls[0]["cache_system"] is True


@pytest.mark.asyncio
async def test_suggest_handles_empty_payload(llm: MockLLMClient) -> None:
    suggestions, _ = await suggest_targets(llm, payload=OptimizedPayload())
    assert isinstance(suggestions, TargetSuggestions)


@pytest.mark.asyncio
async def test_suggest_invalid_json_raises() -> None:
    client = MockLLMClient(scripted={DEFAULT_PURPOSE: "not json at all"})
    with pytest.raises(Exception):
        await suggest_targets(client, payload=_payload())
