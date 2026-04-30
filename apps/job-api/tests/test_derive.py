"""Derivation of OptimizedPayload from prose via a mocked LLM."""

import json
from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

from app.models.experience import OptimizedDoc, OptimizedPayload, ProseDoc
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


# ---------------------------------------------------------------------------
# Endpoint: POST /experience/derive
# ---------------------------------------------------------------------------


class TestDeriveEndpoint:
    @pytest.mark.asyncio
    async def test_skips_llm_when_prose_unchanged(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Repeat derives on the same prose return the cached doc — no LLM call."""
        from app.routers import experience as exp_router

        prose_doc = ProseDoc(
            id="prose-1",
            user_id=None,
            version=3,
            content="some prose",
            created_at=datetime.now(UTC),
        )
        cached = OptimizedDoc(
            id="opt-1",
            user_id=None,
            prose_doc_id="prose-1",  # matches prose_doc.id
            version=5,
            payload=OptimizedPayload(),
            markdown_view=None,
            source="llm",
            created_at=datetime.now(UTC),
        )

        monkeypatch.setattr(
            "app.services.experience.prose.get_latest", lambda *a, **kw: prose_doc
        )
        monkeypatch.setattr(
            "app.services.experience.optimized.get_latest", lambda *a, **kw: cached
        )

        llm = MockLLMClient(scripted={DEFAULT_PURPOSE: _sample_payload_json()})
        result = await exp_router.derive_optimized(
            supabase=MagicMock(), llm=llm, embeddings=MagicMock()
        )

        assert result is cached
        assert llm.calls == []  # LLM never invoked

    @pytest.mark.asyncio
    async def test_does_not_skip_when_previous_is_user_edit(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """User-edited optimized docs always trigger a fresh LLM derive."""
        from app.routers import experience as exp_router

        prose_doc = ProseDoc(
            id="prose-1",
            user_id=None,
            version=3,
            content="some prose",
            created_at=datetime.now(UTC),
        )
        previous_user_edit = OptimizedDoc(
            id="opt-1",
            user_id=None,
            prose_doc_id="prose-1",
            version=5,
            payload=OptimizedPayload(),
            markdown_view=None,
            source="user_edit",
            created_at=datetime.now(UTC),
        )
        new_doc = OptimizedDoc(
            id="opt-2",
            user_id=None,
            prose_doc_id="prose-1",
            version=6,
            payload=OptimizedPayload(),
            markdown_view=None,
            source="llm",
            created_at=datetime.now(UTC),
        )

        monkeypatch.setattr(
            "app.services.experience.prose.get_latest", lambda *a, **kw: prose_doc
        )
        monkeypatch.setattr(
            "app.services.experience.optimized.get_latest",
            lambda *a, **kw: previous_user_edit,
        )
        monkeypatch.setattr(
            "app.services.experience.optimized.create_version",
            lambda *a, **kw: new_doc,
        )

        async def fake_upsert(*a: object, **kw: object) -> None:
            return None

        monkeypatch.setattr(
            "app.services.experience.chunks.upsert_for_optimized", fake_upsert
        )
        monkeypatch.setattr("app.services.llm.cost_log.record", MagicMock())

        llm = MockLLMClient(scripted={DEFAULT_PURPOSE: _sample_payload_json()})
        result = await exp_router.derive_optimized(
            supabase=MagicMock(), llm=llm, embeddings=MagicMock()
        )

        assert result is new_doc
        assert len(llm.calls) == 1  # LLM was called
        assert llm.calls[0]["purpose"] == DEFAULT_PURPOSE
