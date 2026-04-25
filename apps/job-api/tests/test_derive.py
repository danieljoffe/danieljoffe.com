"""Derivation of OptimizedPayload from prose via a mocked LLM."""

import json

import pytest

from app.models.experience import OptimizedPayload
from app.services.experience.derive import (
    DEFAULT_MODEL,
    DEFAULT_PURPOSE,
    SYSTEM_PROMPT,
    derive_from_prose,
)
from app.services.llm.mock import MockLLMClient


def _sample_payload_json() -> str:
    return json.dumps(
        {
            "summary": "Senior frontend with a decade of shipped work.",
            "roles": [
                {
                    "id": "fightcamp-senior-fe",
                    "company": "FightCamp",
                    "title": "Senior Frontend Engineer",
                    "start": "2021-11",
                    "end": "2024-04",
                    "summary": "Cut mobile load times and drove the PDP rebuild.",
                    "skills": ["React", "Next.js", "TypeScript"],
                    "outcome_refs": ["Cut mobile load times from 10s to 2s"],
                }
            ],
            "skills": [
                {"name": "React", "evidence_refs": [], "years": 8.0},
                {"name": "Next.js", "evidence_refs": [], "years": 5.0},
            ],
            "outcomes": [
                {
                    "description": "Cut mobile load times from 10s to 2s",
                    "metric": "LCP",
                    "value": "2s",
                    "role_ref": "fightcamp-senior-fe",
                }
            ],
        }
    )


async def test_returns_parsed_optimized_payload() -> None:
    client = MockLLMClient(scripted={DEFAULT_PURPOSE: _sample_payload_json()})
    payload, _ = await derive_from_prose(client, prose_text="some prose")
    assert isinstance(payload, OptimizedPayload)
    assert payload.summary is not None
    assert len(payload.roles) == 1
    assert payload.roles[0].company == "FightCamp"
    assert len(payload.skills) == 2
    assert len(payload.outcomes) == 1


async def test_passes_default_model_and_purpose() -> None:
    client = MockLLMClient(scripted={DEFAULT_PURPOSE: _sample_payload_json()})
    await derive_from_prose(client, prose_text="prose")
    assert len(client.calls) == 1
    call = client.calls[0]
    assert call["model"] == DEFAULT_MODEL
    assert call["purpose"] == DEFAULT_PURPOSE


async def test_enables_system_cache() -> None:
    client = MockLLMClient(scripted={DEFAULT_PURPOSE: _sample_payload_json()})
    await derive_from_prose(client, prose_text="prose")
    assert client.calls[0]["cache_system"] is True


async def test_returns_result_with_positive_cost() -> None:
    client = MockLLMClient(scripted={DEFAULT_PURPOSE: _sample_payload_json()})
    _, result = await derive_from_prose(
        client, prose_text="some reasonably long narrative " * 50
    )
    assert result.cost_usd > 0
    assert result.usage.input_tokens > 0
    assert result.usage.output_tokens > 0


async def test_sends_prose_as_user_message() -> None:
    seen: dict[str, str] = {}

    def responder(latest_user: str, _messages: object) -> str:
        seen["latest"] = latest_user
        return _sample_payload_json()

    client = MockLLMClient(scripted={DEFAULT_PURPOSE: responder})
    await derive_from_prose(client, prose_text="the prose goes here")
    assert seen["latest"] == "the prose goes here"


async def test_model_override_is_respected() -> None:
    client = MockLLMClient(scripted={DEFAULT_PURPOSE: _sample_payload_json()})
    await derive_from_prose(
        client, prose_text="prose", model="claude-haiku-4-5"
    )
    assert client.calls[0]["model"] == "claude-haiku-4-5"


async def test_invalid_json_response_raises() -> None:
    client = MockLLMClient(scripted={DEFAULT_PURPOSE: "not valid json"})
    with pytest.raises(Exception):
        await derive_from_prose(client, prose_text="prose")


def test_system_prompt_mentions_schema_rules() -> None:
    assert "null" in SYSTEM_PROMPT
    assert "Do not invent" in SYSTEM_PROMPT
    assert "Return ONLY the JSON" in SYSTEM_PROMPT
