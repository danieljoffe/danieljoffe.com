"""Orchestrator behavior tests with patched service dependencies.

The orchestrator touches 5 service modules + Supabase. We patch the
service module functions (the natural seam) rather than building a full
fake Supabase. LLM interactions use the real MockLLMClient with scripted
responses so the JSON contract is exercised end-to-end.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.models.conversation import LLMTurnResponse
from app.models.experience import (
    ConversationTurn,
    OptimizedDoc,
    OptimizedPayload,
    ProseDoc,
    Role,
)
from app.services.conversation import orchestrator
from app.services.experience import optimized as optimized_mod
from app.services.experience import prose as prose_mod
from app.services.experience import turns as turns_mod
from app.services.llm import cost_log as cost_log_mod
from app.services.llm.mock import MockLLMClient


def _prose(content: str, version: int = 1) -> ProseDoc:
    return ProseDoc(
        id=f"prose-{version}",
        user_id=None,
        version=version,
        content=content,
        created_at=datetime.now(UTC),
    )


def _turn(role: str, content: str, skipped: bool = False, idx: int = 1) -> ConversationTurn:
    return ConversationTurn(
        id=f"turn-{idx}",
        user_id=None,
        conversation_type="onboarding",
        turn_index=idx,
        role=role,  # type: ignore[arg-type]
        content=content,
        skipped=skipped,
        prose_doc_id=None,
        metadata={},
        created_at=datetime.now(UTC),
    )


def _llm_response(
    assistant_message: str = "Next question?",
    prose_append: str | None = None,
    done: bool = False,
) -> str:
    return LLMTurnResponse(
        assistant_message=assistant_message,
        prose_append=prose_append,
        done=done,
    ).model_dump_json()


@pytest.fixture
def mock_service_layer(monkeypatch: pytest.MonkeyPatch) -> dict[str, MagicMock]:
    """Patch the service-module attributes the orchestrator imports.

    Return a dict of mocks so each test can tune return values and assert
    on call args.
    """
    appended: list[dict[str, Any]] = []

    def fake_append(*_args: Any, **kwargs: Any) -> ConversationTurn:
        appended.append(kwargs)
        return _turn(kwargs["role"], kwargs["content"], kwargs.get("skipped", False))

    mocks: dict[str, MagicMock] = {
        "turns_list": MagicMock(return_value=[]),
        "turns_append": MagicMock(side_effect=fake_append),
        "prose_get_latest": MagicMock(return_value=None),
        "prose_create_version": MagicMock(
            side_effect=lambda _s, user_id, content: _prose(content, version=2)
        ),
        "cost_log_record": MagicMock(return_value=None),
        "_appended_turns": appended,  # type: ignore[dict-item]
    }

    monkeypatch.setattr(turns_mod, "list_turns", mocks["turns_list"])
    monkeypatch.setattr(turns_mod, "append", mocks["turns_append"])
    monkeypatch.setattr(prose_mod, "get_latest", mocks["prose_get_latest"])
    monkeypatch.setattr(prose_mod, "create_version", mocks["prose_create_version"])
    monkeypatch.setattr(cost_log_mod, "record", mocks["cost_log_record"])
    return mocks


async def test_handle_turn_persists_user_then_assistant(
    mock_service_layer: dict[str, Any],
) -> None:
    llm = MockLLMClient(
        scripted={orchestrator.PURPOSE_TURN_ONBOARDING: _llm_response()}
    )
    await orchestrator.handle_turn(
        MagicMock(),
        llm,
        user_id=None,
        conversation_type="onboarding",
        user_content="I worked at FightCamp",
        skipped=False,
    )
    appended = mock_service_layer["_appended_turns"]
    assert len(appended) == 2
    assert appended[0]["role"] == "user"
    assert appended[0]["content"] == "I worked at FightCamp"
    assert appended[1]["role"] == "assistant"


async def test_handle_turn_appends_prose_when_llm_requests(
    mock_service_layer: dict[str, Any],
) -> None:
    llm = MockLLMClient(
        scripted={
            orchestrator.PURPOSE_TURN_ONBOARDING: _llm_response(
                prose_append="Worked at FightCamp 2021-11 to 2024-04."
            )
        }
    )
    mock_service_layer["prose_get_latest"].return_value = _prose("existing prose.")

    result = await orchestrator.handle_turn(
        MagicMock(),
        llm,
        user_id=None,
        conversation_type="onboarding",
        user_content="...",
        skipped=False,
    )

    assert result.prose_updated is True
    assert result.prose_version == 2
    create_call = mock_service_layer["prose_create_version"].call_args
    assert "existing prose." in create_call.kwargs["content"]
    assert "FightCamp" in create_call.kwargs["content"]


async def test_handle_turn_does_not_append_when_no_prose_content(
    mock_service_layer: dict[str, Any],
) -> None:
    llm = MockLLMClient(
        scripted={
            orchestrator.PURPOSE_TURN_ONBOARDING: _llm_response(prose_append=None)
        }
    )
    result = await orchestrator.handle_turn(
        MagicMock(),
        llm,
        user_id=None,
        conversation_type="onboarding",
        user_content="skip",
        skipped=False,
    )
    assert result.prose_updated is False
    mock_service_layer["prose_create_version"].assert_not_called()


async def test_handle_turn_cost_logs_with_correct_purpose_for_update_mode(
    mock_service_layer: dict[str, Any],
) -> None:
    llm = MockLLMClient(
        scripted={orchestrator.PURPOSE_TURN_UPDATE: _llm_response()}
    )
    await orchestrator.handle_turn(
        MagicMock(),
        llm,
        user_id=None,
        conversation_type="update",
        user_content="shipped the audit tool",
        skipped=False,
    )
    call = mock_service_layer["cost_log_record"].call_args
    assert call.kwargs["purpose"] == orchestrator.PURPOSE_TURN_UPDATE


async def test_handle_turn_annotates_skipped_history(
    mock_service_layer: dict[str, Any],
) -> None:
    mock_service_layer["turns_list"].return_value = [
        _turn("assistant", "what was the team size?"),
        _turn("user", "should-not-appear", skipped=True, idx=2),
    ]

    seen: dict[str, list[Any]] = {}

    def responder(_latest: str, messages: list[Any]) -> str:
        seen["messages"] = messages
        return _llm_response()

    llm = MockLLMClient(
        scripted={orchestrator.PURPOSE_TURN_ONBOARDING: responder}
    )
    await orchestrator.handle_turn(
        MagicMock(),
        llm,
        user_id=None,
        conversation_type="onboarding",
        user_content="next",
        skipped=False,
    )
    contents = [m.content for m in seen["messages"]]
    assert "[skipped question]" in contents
    assert "should-not-appear" not in contents


async def test_next_probe_returns_default_when_no_optimized_doc(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(optimized_mod, "get_latest", lambda _s, user_id: None)
    result = await orchestrator.next_probe(
        MagicMock(), MockLLMClient(), user_id=None
    )
    assert result.gap is None
    assert "most recent role" in result.question.lower()


async def test_next_probe_phrases_gap_via_llm(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = OptimizedPayload(
        roles=[
            Role(
                id="fc",
                company="FC",
                title="E",
                start="2020-01",
                end="2024-01",
                summary=None,
                skills=[],
                outcome_refs=[],
            )
        ],
    )
    opt_doc = OptimizedDoc(
        id="o-1",
        user_id=None,
        prose_doc_id=None,
        version=1,
        payload=payload,
        markdown_view=None,
        source="llm",
        created_at=datetime.now(UTC),
    )
    monkeypatch.setattr(optimized_mod, "get_latest", lambda _s, user_id: opt_doc)
    monkeypatch.setattr(cost_log_mod, "record", MagicMock())

    llm = MockLLMClient(
        scripted={
            orchestrator.PURPOSE_PROBE: "What number would you lead with from FC?"
        }
    )
    result = await orchestrator.next_probe(MagicMock(), llm, user_id=None)
    assert result.gap is not None
    assert result.gap.kind == "role.missing_outcomes"
    assert result.question.startswith("What")


def test_reset_content_deletes_three_tables() -> None:
    supabase = MagicMock()
    delete_chain = supabase.table.return_value.delete.return_value
    delete_chain.is_.return_value.execute.return_value.data = []

    result = orchestrator.reset_content(supabase, user_id=None)

    tables_deleted = [c.args[0] for c in supabase.table.call_args_list]
    assert "experience_prose_docs" in tables_deleted
    assert "experience_optimized_docs" in tables_deleted
    assert "experience_conversation_turns" in tables_deleted
    assert result.prose_versions_deleted == 0


def test_llm_turn_response_contract_is_parseable() -> None:
    """Sanity check: the JSON shape we ask the LLM for round-trips."""
    raw = _llm_response(
        assistant_message="Team size?",
        prose_append="Worked at Acme.",
        done=False,
    )
    parsed = LLMTurnResponse.model_validate_json(raw)
    assert parsed.assistant_message == "Team size?"
    assert parsed.prose_append == "Worked at Acme."
    assert parsed.done is False
    assert json.loads(raw)["done"] is False
