"""AnthropicLLMClient tests.

Mock the SDK's `messages.create` at the instance level. Verifies the
client builds the request correctly (cache_control shape, messages
passthrough), parses responses into LLMResult (text extraction, usage
fields including cache tokens), and handles edge cases (empty messages,
thinking blocks mixed with text).
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.llm import Message
from app.services.llm.anthropic_client import AnthropicLLMClient


def _fake_response(
    *,
    text: str = "hello",
    input_tokens: int = 100,
    output_tokens: int = 50,
    cache_read: int = 0,
    cache_creation: int = 0,
    extra_blocks: list[Any] | None = None,
) -> Any:
    """Build a mock response object shaped like Anthropic's SDK returns."""
    text_block = MagicMock()
    text_block.type = "text"
    text_block.text = text

    blocks = [text_block] + (extra_blocks or [])

    response = MagicMock()
    response.content = blocks
    response.usage.input_tokens = input_tokens
    response.usage.output_tokens = output_tokens
    response.usage.cache_read_input_tokens = cache_read
    response.usage.cache_creation_input_tokens = cache_creation
    return response


def _client_with_mocked_sdk(response: Any) -> tuple[AnthropicLLMClient, AsyncMock]:
    client = AnthropicLLMClient(api_key="test-key")
    create_mock = AsyncMock(return_value=response)
    client._client.messages.create = create_mock  # type: ignore[method-assign]
    return client, create_mock


async def test_complete_returns_parsed_result() -> None:
    client, _ = _client_with_mocked_sdk(
        _fake_response(text="response text", input_tokens=120, output_tokens=30)
    )
    result = await client.complete(
        model="claude-haiku-4-5",
        system="system prompt",
        messages=[Message(role="user", content="hi")],
        purpose="test",
    )
    assert result.content == "response text"
    assert result.model == "claude-haiku-4-5"
    assert result.usage.input_tokens == 120
    assert result.usage.output_tokens == 30


async def test_complete_passes_messages_to_sdk() -> None:
    client, create_mock = _client_with_mocked_sdk(_fake_response())
    await client.complete(
        model="claude-sonnet-4-6",
        system="sys",
        messages=[
            Message(role="user", content="hi"),
            Message(role="assistant", content="there"),
            Message(role="user", content="bye"),
        ],
        purpose="test",
    )
    kwargs = create_mock.call_args.kwargs
    assert kwargs["model"] == "claude-sonnet-4-6"
    assert kwargs["messages"] == [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "there"},
        {"role": "user", "content": "bye"},
    ]


async def test_cache_system_true_uses_list_form_with_cache_control() -> None:
    client, create_mock = _client_with_mocked_sdk(_fake_response())
    await client.complete(
        model="claude-sonnet-4-6",
        system="cached system",
        messages=[Message(role="user", content="x")],
        purpose="test",
        cache_system=True,
    )
    system = create_mock.call_args.kwargs["system"]
    assert isinstance(system, list)
    assert len(system) == 1
    assert system[0]["type"] == "text"
    assert system[0]["text"] == "cached system"
    assert system[0]["cache_control"] == {"type": "ephemeral"}


async def test_cache_system_false_uses_plain_string() -> None:
    client, create_mock = _client_with_mocked_sdk(_fake_response())
    await client.complete(
        model="claude-sonnet-4-6",
        system="plain system",
        messages=[Message(role="user", content="x")],
        purpose="test",
        cache_system=False,
    )
    assert create_mock.call_args.kwargs["system"] == "plain system"


async def test_cache_system_true_but_empty_system_stays_empty_string() -> None:
    """Don't send an empty list — the SDK accepts "" for no-system."""
    client, create_mock = _client_with_mocked_sdk(_fake_response())
    await client.complete(
        model="claude-haiku-4-5",
        system="",
        messages=[Message(role="user", content="x")],
        purpose="test",
        cache_system=True,
    )
    assert create_mock.call_args.kwargs["system"] == ""


async def test_cache_tokens_flow_through() -> None:
    client, _ = _client_with_mocked_sdk(
        _fake_response(cache_read=500, cache_creation=1200)
    )
    result = await client.complete(
        model="claude-sonnet-4-6",
        system="sys",
        messages=[Message(role="user", content="x")],
        purpose="test",
    )
    assert result.usage.cache_read_input_tokens == 500
    assert result.usage.cache_creation_input_tokens == 1200


async def test_max_tokens_passed_to_sdk() -> None:
    client, create_mock = _client_with_mocked_sdk(_fake_response())
    await client.complete(
        model="claude-sonnet-4-6",
        system="sys",
        messages=[Message(role="user", content="x")],
        purpose="test",
        max_tokens=8192,
    )
    assert create_mock.call_args.kwargs["max_tokens"] == 8192


async def test_cost_calculated_from_usage() -> None:
    client, _ = _client_with_mocked_sdk(
        _fake_response(input_tokens=1_000_000, output_tokens=0)
    )
    result = await client.complete(
        model="claude-sonnet-4-6",
        system="sys",
        messages=[Message(role="user", content="x")],
        purpose="test",
    )
    # Sonnet 4.6 = $3/MTok input, so 1M input tokens = $3.00
    assert result.cost_usd == pytest.approx(3.0, rel=1e-6)


async def test_latency_is_measured() -> None:
    client, _ = _client_with_mocked_sdk(_fake_response())
    result = await client.complete(
        model="claude-haiku-4-5",
        system="sys",
        messages=[Message(role="user", content="x")],
        purpose="test",
    )
    assert result.latency_ms >= 0


async def test_empty_messages_raises() -> None:
    client = AnthropicLLMClient(api_key="test-key")
    with pytest.raises(ValueError, match="at least one message"):
        await client.complete(
            model="claude-haiku-4-5",
            system="sys",
            messages=[],
            purpose="test",
        )


async def test_non_text_blocks_are_skipped_in_content() -> None:
    """Thinking / tool_use blocks shouldn't leak into LLMResult.content."""
    thinking_block = MagicMock()
    thinking_block.type = "thinking"
    thinking_block.thinking = "internal reasoning"

    client, _ = _client_with_mocked_sdk(
        _fake_response(text="visible text", extra_blocks=[thinking_block])
    )
    result = await client.complete(
        model="claude-opus-4-7",
        system="sys",
        messages=[Message(role="user", content="x")],
        purpose="test",
    )
    assert result.content == "visible text"
    assert "internal reasoning" not in result.content


def _fake_tool_use_response(
    *,
    tool_name: str,
    tool_input: dict[str, Any],
    input_tokens: int = 100,
    output_tokens: int = 50,
) -> Any:
    """Build a mock response with a tool_use block matching the Anthropic SDK's shape."""
    tool_block = MagicMock()
    tool_block.type = "tool_use"
    tool_block.name = tool_name
    tool_block.input = tool_input

    response = MagicMock()
    response.content = [tool_block]
    response.usage.input_tokens = input_tokens
    response.usage.output_tokens = output_tokens
    response.usage.cache_read_input_tokens = 0
    response.usage.cache_creation_input_tokens = 0
    response.stop_reason = "tool_use"
    return response


async def test_complete_tool_use_returns_input_dict() -> None:
    payload = {"name": "Daniel", "value": 42}
    client, create_mock = _client_with_mocked_sdk(
        _fake_tool_use_response(tool_name="return_Thing", tool_input=payload)
    )
    tool_input, result = await client.complete_tool_use(
        model="claude-sonnet-4-6",
        system="sys",
        messages=[Message(role="user", content="x")],
        tool_name="return_Thing",
        tool_description="Return a Thing.",
        tool_input_schema={"type": "object"},
        purpose="test",
    )
    assert tool_input == payload
    # Cost-log inspection should still see the structured payload as content.
    assert result.content == '{"name": "Daniel", "value": 42}'


async def test_complete_tool_use_forces_tool_choice() -> None:
    client, create_mock = _client_with_mocked_sdk(
        _fake_tool_use_response(tool_name="return_X", tool_input={})
    )
    await client.complete_tool_use(
        model="claude-sonnet-4-6",
        system="sys",
        messages=[Message(role="user", content="x")],
        tool_name="return_X",
        tool_description="d",
        tool_input_schema={"type": "object", "properties": {}},
        purpose="test",
    )
    kwargs = create_mock.call_args.kwargs
    assert kwargs["tool_choice"] == {"type": "tool", "name": "return_X"}
    assert kwargs["tools"] == [
        {
            "name": "return_X",
            "description": "d",
            "input_schema": {"type": "object", "properties": {}},
        }
    ]


async def test_complete_tool_use_raises_when_no_tool_block() -> None:
    """If the API returns text instead of tool_use (refusal, abort), fail loud."""
    text_block = MagicMock()
    text_block.type = "text"
    text_block.text = "I cannot answer that."
    response = MagicMock()
    response.content = [text_block]
    response.usage.input_tokens = 10
    response.usage.output_tokens = 5
    response.usage.cache_read_input_tokens = 0
    response.usage.cache_creation_input_tokens = 0
    response.stop_reason = "end_turn"

    client, _ = _client_with_mocked_sdk(response)
    with pytest.raises(ValueError, match="Expected tool_use block"):
        await client.complete_tool_use(
            model="claude-haiku-4-5",
            system="sys",
            messages=[Message(role="user", content="x")],
            tool_name="return_X",
            tool_description="d",
            tool_input_schema={"type": "object"},
            purpose="test",
        )


async def test_complete_json_uses_pydantic_schema_and_returns_typed_object() -> None:
    """End-to-end: pydantic schema → tool spec → API call → parsed object."""
    from pydantic import BaseModel

    from app.services.llm.client import complete_json

    class Contact(BaseModel):
        name: str
        email: str

    payload = {"name": "Daniel", "email": "a@b.com"}
    client, create_mock = _client_with_mocked_sdk(
        _fake_tool_use_response(tool_name="return_Contact", tool_input=payload)
    )
    parsed, _result = await complete_json(
        client,
        model="claude-sonnet-4-6",
        system="sys",
        messages=[Message(role="user", content="x")],
        schema=Contact,
        purpose="test",
    )
    assert isinstance(parsed, Contact)
    assert parsed.name == "Daniel"
    assert parsed.email == "a@b.com"
    # The tool sent to the API should carry the schema's JSON schema.
    sent_tool = create_mock.call_args.kwargs["tools"][0]
    assert sent_tool["name"] == "return_Contact"
    assert sent_tool["input_schema"]["properties"]["name"]["type"] == "string"


async def test_usage_without_cache_fields_defaults_to_zero() -> None:
    """Older responses might lack cache fields — don't crash."""
    response = MagicMock()
    text_block = MagicMock()
    text_block.type = "text"
    text_block.text = "ok"
    response.content = [text_block]
    response.usage.input_tokens = 10
    response.usage.output_tokens = 5
    response.usage.cache_read_input_tokens = None
    response.usage.cache_creation_input_tokens = None

    client = AnthropicLLMClient(api_key="test-key")
    client._client.messages.create = AsyncMock(return_value=response)  # type: ignore[method-assign]

    result = await client.complete(
        model="claude-haiku-4-5",
        system="sys",
        messages=[Message(role="user", content="x")],
        purpose="test",
    )
    assert result.usage.cache_read_input_tokens == 0
    assert result.usage.cache_creation_input_tokens == 0


# ---- message-level cache markers (cache_prefix_chars) -----------------------


async def test_cache_prefix_chars_splits_message_into_two_blocks() -> None:
    """The marker splits content at exactly the byte boundary: block 0
    carries cache_control, block 1 is the remainder, and concatenation
    is identical to the original content (marker, not a prompt change)."""
    client, create_mock = _client_with_mocked_sdk(_fake_response())
    content = "STATIC target context\nDYNAMIC batch of titles"
    prefix_len = len("STATIC target context")
    await client.complete(
        model="claude-haiku-4-5",
        system="sys",
        messages=[
            Message(role="user", content=content, cache_prefix_chars=prefix_len)
        ],
        purpose="test",
    )
    (msg,) = create_mock.call_args.kwargs["messages"]
    blocks = msg["content"]
    assert isinstance(blocks, list)
    assert len(blocks) == 2
    assert blocks[0] == {
        "type": "text",
        "text": "STATIC target context",
        "cache_control": {"type": "ephemeral"},
    }
    assert blocks[1] == {"type": "text", "text": "\nDYNAMIC batch of titles"}
    assert blocks[0]["text"] + blocks[1]["text"] == content


async def test_no_cache_prefix_keeps_plain_string_content() -> None:
    client, create_mock = _client_with_mocked_sdk(_fake_response())
    await client.complete(
        model="claude-haiku-4-5",
        system="sys",
        messages=[Message(role="user", content="plain")],
        purpose="test",
    )
    (msg,) = create_mock.call_args.kwargs["messages"]
    assert msg["content"] == "plain"


async def test_cache_prefix_covering_whole_message_uses_single_block() -> None:
    client, create_mock = _client_with_mocked_sdk(_fake_response())
    await client.complete(
        model="claude-haiku-4-5",
        system="sys",
        messages=[Message(role="user", content="all static", cache_prefix_chars=999)],
        purpose="test",
    )
    (msg,) = create_mock.call_args.kwargs["messages"]
    assert msg["content"] == [
        {
            "type": "text",
            "text": "all static",
            "cache_control": {"type": "ephemeral"},
        }
    ]


async def test_cache_prefix_chars_applies_to_tool_use_path() -> None:
    client = AnthropicLLMClient(api_key="test-key")
    create_mock = AsyncMock(
        return_value=_fake_tool_use_response(
            tool_name="grade", tool_input={"ok": True}
        )
    )
    client._client.messages.create = create_mock  # type: ignore[method-assign]
    await client.complete_tool_use(
        model="claude-sonnet-4-6",
        system="sys",
        messages=[Message(role="user", content="AB", cache_prefix_chars=1)],
        tool_name="grade",
        tool_description="d",
        tool_input_schema={"type": "object"},
        purpose="test",
    )
    (msg,) = create_mock.call_args.kwargs["messages"]
    assert msg["content"][0]["cache_control"] == {"type": "ephemeral"}
    assert msg["content"][0]["text"] + msg["content"][1]["text"] == "AB"
