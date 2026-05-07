"""MockLLMClient behavior."""

import json

import pytest

from app.models.llm import Message
from app.services.llm.client import complete_json
from app.services.llm.mock import MockLLMClient


async def test_echo_mode_returns_json_with_latest_user_content() -> None:
    client = MockLLMClient()
    result = await client.complete(
        model="claude-haiku-4-5",
        system="sys",
        messages=[Message(role="user", content="hello world")],
        purpose="test.echo",
    )
    parsed = json.loads(result.content)
    assert parsed["echo"] == "hello world"
    assert parsed["purpose"] == "test.echo"
    assert result.model == "claude-haiku-4-5"


async def test_scripted_string_response() -> None:
    client = MockLLMClient(scripted={"derive": '{"ok": true}'})
    result = await client.complete(
        model="claude-sonnet-4-6",
        system="",
        messages=[Message(role="user", content="irrelevant")],
        purpose="derive",
    )
    assert result.content == '{"ok": true}'


async def test_scripted_callable_sees_latest_user_content() -> None:
    seen: dict[str, str] = {}

    def responder(latest_user: str, _messages: list[Message]) -> str:
        seen["latest"] = latest_user
        return f"got:{latest_user}"

    client = MockLLMClient(scripted={"p": responder})
    result = await client.complete(
        model="claude-haiku-4-5",
        system="",
        messages=[
            Message(role="user", content="first"),
            Message(role="assistant", content="mid"),
            Message(role="user", content="second"),
        ],
        purpose="p",
    )
    assert seen["latest"] == "second"
    assert result.content == "got:second"


async def test_register_adds_scripted_response() -> None:
    client = MockLLMClient()
    client.register("late", "OK")
    result = await client.complete(
        model="claude-haiku-4-5",
        system="",
        messages=[Message(role="user", content="anything")],
        purpose="late",
    )
    assert result.content == "OK"


async def test_call_is_tracked() -> None:
    client = MockLLMClient()
    await client.complete(
        model="claude-haiku-4-5",
        system="sys",
        messages=[Message(role="user", content="hi")],
        purpose="tracked",
    )
    assert len(client.calls) == 1
    assert client.calls[0]["purpose"] == "tracked"
    assert client.calls[0]["model"] == "claude-haiku-4-5"


async def test_usage_and_cost_are_nonzero() -> None:
    client = MockLLMClient()
    result = await client.complete(
        model="claude-sonnet-4-6",
        system="some system prompt",
        messages=[Message(role="user", content="some reasonably long input string")],
        purpose="u",
    )
    assert result.usage.input_tokens > 0
    assert result.usage.output_tokens > 0
    assert result.cost_usd > 0


async def test_cache_system_hint_bumps_cache_creation_tokens() -> None:
    client = MockLLMClient()
    without = await client.complete(
        model="claude-sonnet-4-6",
        system="cached",
        messages=[Message(role="user", content="x")],
        purpose="nocache",
        cache_system=False,
    )
    with_cache = await client.complete(
        model="claude-sonnet-4-6",
        system="cached",
        messages=[Message(role="user", content="x")],
        purpose="cache",
        cache_system=True,
    )
    assert without.usage.cache_creation_input_tokens == 0
    assert with_cache.usage.cache_creation_input_tokens > 0


async def test_empty_messages_raises() -> None:
    client = MockLLMClient()
    with pytest.raises(ValueError):
        await client.complete(
            model="claude-haiku-4-5",
            system="",
            messages=[],
            purpose="empty",
        )


async def test_complete_json_parses_against_schema() -> None:
    from pydantic import BaseModel

    class Shape(BaseModel):
        name: str
        value: int

    client = MockLLMClient(scripted={"parsed": '{"name": "x", "value": 42}'})
    parsed, result = await complete_json(
        client,
        model="claude-sonnet-4-6",
        system="",
        messages=[Message(role="user", content="go")],
        schema=Shape,
        purpose="parsed",
    )
    assert parsed.name == "x"
    assert parsed.value == 42
    assert result.cost_usd > 0


async def test_complete_tool_use_returns_dict_from_scripted_json() -> None:
    client = MockLLMClient(scripted={"tool": '{"a": 1, "b": "two"}'})
    tool_input, result = await client.complete_tool_use(
        model="claude-haiku-4-5",
        system="",
        messages=[Message(role="user", content="x")],
        tool_name="return_X",
        tool_description="d",
        tool_input_schema={"type": "object"},
        purpose="tool",
    )
    assert tool_input == {"a": 1, "b": "two"}
    assert result.content == '{"a": 1, "b": "two"}'


async def test_complete_tool_use_records_tool_name_in_call_log() -> None:
    client = MockLLMClient(scripted={"tool": "{}"})
    await client.complete_tool_use(
        model="claude-haiku-4-5",
        system="",
        messages=[Message(role="user", content="x")],
        tool_name="return_Foo",
        tool_description="d",
        tool_input_schema={"type": "object"},
        purpose="tool",
    )
    assert client.calls[0]["tool_name"] == "return_Foo"
