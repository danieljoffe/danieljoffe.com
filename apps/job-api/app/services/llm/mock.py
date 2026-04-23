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
from collections.abc import Callable

from app.models.llm import LLMResult, LLMUsage, Message, ModelId
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

    def _render_response(
        self, purpose: str, latest_user: str, messages: list[Message]
    ) -> str:
        source = self._scripted.get(purpose)
        if source is None:
            return json.dumps({"mock": True, "purpose": purpose, "echo": latest_user})
        if callable(source):
            return source(latest_user, messages)
        return source
