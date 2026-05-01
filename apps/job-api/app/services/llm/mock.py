"""MockLLMClient — deterministic fake for tests and local dev.

Two modes:
1. Scripted responses: register `(purpose, response_text)` pairs; calls with
   a matching purpose return that text. Good for unit tests where the exact
   response matters.
2. Echo mode (default): the client synthesizes a predictable response from
   the latest user message. Useful for integration tests where we care about
   the pipeline, not the content.

Both modes compute realistic-ish token counts (roughly 4 chars/token) and
apply real pricing so cost-log rows look sensible when inspected.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator, Callable
from typing import Any

from app.models.llm import (
    LLMResult,
    LLMStreamDelta,
    LLMStreamEvent,
    LLMStreamFinal,
    LLMUsage,
    Message,
    ModelId,
)
from app.services.llm.pricing import calculate_cost


def _approx_tokens(text: str) -> int:
    """Rough char-to-token heuristic. Good enough for a mock."""
    return max(1, len(text) // 4)


ResponseSource = str | Callable[[str, list[Message]], str]


class MockLLMClient:
    """Implements the LLMClient Protocol. Not used in production."""

    def __init__(
        self,
        *,
        scripted: dict[str, ResponseSource] | None = None,
        default_latency_ms: int = 50,
    ) -> None:
        self._scripted: dict[str, ResponseSource] = scripted or {}
        self._default_latency_ms = default_latency_ms
        self.calls: list[dict[str, object]] = []

    def register(self, purpose: str, response: ResponseSource) -> None:
        """Register a scripted response for a given purpose label."""
        self._scripted[purpose] = response

    async def complete(
        self,
        *,
        model: ModelId,
        system: str,
        messages: list[Message],
        purpose: str,
        max_tokens: int = 4096,
        cache_system: bool = False,
    ) -> LLMResult:
        if not messages:
            raise ValueError("MockLLMClient.complete requires at least one message")

        latest_user = next(
            (m.content for m in reversed(messages) if m.role == "user"),
            messages[-1].content,
        )

        response_text = self._render_response(purpose, latest_user, messages)

        usage = LLMUsage(
            input_tokens=_approx_tokens(system) + sum(_approx_tokens(m.content) for m in messages),
            output_tokens=_approx_tokens(response_text),
            cache_read_input_tokens=0,
            cache_creation_input_tokens=_approx_tokens(system) if cache_system else 0,
        )

        cost = calculate_cost(model, usage)

        self.calls.append(
            {
                "model": model,
                "purpose": purpose,
                "system_len": len(system),
                "messages_count": len(messages),
                "cache_system": cache_system,
                "max_tokens": max_tokens,
            }
        )

        return LLMResult(
            content=response_text,
            model=model,
            usage=usage,
            cost_usd=cost,
            latency_ms=self._default_latency_ms,
        )

    async def complete_tool_use(
        self,
        *,
        model: ModelId,
        system: str,
        messages: list[Message],
        tool_name: str,
        tool_description: str,
        tool_input_schema: dict[str, Any],
        purpose: str,
        max_tokens: int = 4096,
        cache_system: bool = False,
    ) -> tuple[dict[str, Any], LLMResult]:
        """Mock structured-output. Scripted responses are parsed as JSON
        and returned as the tool input dict; echo mode returns a small
        echo dict. Tests that script invalid JSON exercise the error path
        the real client would also raise on (server-side schema rejection
        or tool_use absence).
        """
        if not messages:
            raise ValueError(
                "MockLLMClient.complete_tool_use requires at least one message"
            )

        latest_user = next(
            (m.content for m in reversed(messages) if m.role == "user"),
            messages[-1].content,
        )
        response_text = self._render_response(purpose, latest_user, messages)
        # Will raise json.JSONDecodeError if scripted text is not valid JSON
        # — mirrors the real client failing when the model emits no tool_use.
        tool_input = json.loads(response_text)
        if not isinstance(tool_input, dict):
            raise ValueError(
                f"Scripted response for {purpose!r} must decode to a JSON object, "
                f"got {type(tool_input).__name__}"
            )

        usage = LLMUsage(
            input_tokens=_approx_tokens(system)
            + sum(_approx_tokens(m.content) for m in messages),
            output_tokens=_approx_tokens(response_text),
            cache_read_input_tokens=0,
            cache_creation_input_tokens=_approx_tokens(system) if cache_system else 0,
        )
        cost = calculate_cost(model, usage)

        self.calls.append(
            {
                "model": model,
                "purpose": purpose,
                "system_len": len(system),
                "messages_count": len(messages),
                "cache_system": cache_system,
                "max_tokens": max_tokens,
                "tool_name": tool_name,
            }
        )

        return tool_input, LLMResult(
            content=response_text,
            model=model,
            usage=usage,
            cost_usd=cost,
            latency_ms=self._default_latency_ms,
        )

    async def stream(
        self,
        *,
        model: ModelId,
        system: str,
        messages: list[Message],
        purpose: str,
        max_tokens: int = 4096,
        cache_system: bool = False,
    ) -> AsyncIterator[LLMStreamEvent]:
        """Mock streaming: yields the scripted response in fixed-size chunks
        and finishes with a single final event. Mirrors the cost/usage shape
        of `complete` so consumers can use either interchangeably.
        """
        if not messages:
            raise ValueError("MockLLMClient.stream requires at least one message")

        latest_user = next(
            (m.content for m in reversed(messages) if m.role == "user"),
            messages[-1].content,
        )

        response_text = self._render_response(purpose, latest_user, messages)

        chunk_size = 32
        for i in range(0, len(response_text), chunk_size):
            yield LLMStreamDelta(text=response_text[i : i + chunk_size])

        usage = LLMUsage(
            input_tokens=_approx_tokens(system) + sum(_approx_tokens(m.content) for m in messages),
            output_tokens=_approx_tokens(response_text),
            cache_read_input_tokens=0,
            cache_creation_input_tokens=_approx_tokens(system) if cache_system else 0,
        )
        cost = calculate_cost(model, usage)

        self.calls.append(
            {
                "model": model,
                "purpose": purpose,
                "system_len": len(system),
                "messages_count": len(messages),
                "cache_system": cache_system,
                "max_tokens": max_tokens,
                "streamed": True,
            }
        )

        yield LLMStreamFinal(
            result=LLMResult(
                content=response_text,
                model=model,
                usage=usage,
                cost_usd=cost,
                latency_ms=self._default_latency_ms,
            )
        )

    def _render_response(
        self, purpose: str, latest_user: str, messages: list[Message]
    ) -> str:
        source = self._scripted.get(purpose)
        if source is None:
            return json.dumps({"mock": True, "purpose": purpose, "echo": latest_user})
        if callable(source):
            return source(latest_user, messages)
        return source
