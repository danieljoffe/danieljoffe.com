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
