"""Real Anthropic LLM client.

Production implementation of the LLMClient Protocol. Uses the official
`anthropic` SDK. Swap in via `LLM_PROVIDER=anthropic` env var; mock is
the default until you explicitly opt in.

Prompt caching note
-------------------
`cache_system=True` passes the system prompt as a list with
`cache_control: {"type": "ephemeral"}`. Anthropic requires a minimum
cacheable prefix of **4096 tokens for Opus 4.7 / 4.6 / Haiku 4.5** and
**2048 tokens for Sonnet 4.6**. Below that threshold caching silently
no-ops (no error, just `cache_creation_input_tokens: 0`). Our current
system prompts land below 4096 tokens, so caching will activate once
prompts grow — this is intentional plumbing, not an immediate cost win.
"""

from __future__ import annotations

import time
from collections.abc import AsyncIterator
from typing import Any, cast

from anthropic import AsyncAnthropic

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


class AnthropicLLMClient:
    """Implements the LLMClient Protocol. Production-ready."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        timeout: float = 600.0,
        max_retries: int = 2,
    ) -> None:
        self._client = AsyncAnthropic(
            api_key=api_key,
            timeout=timeout,
            max_retries=max_retries,
        )

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
            raise ValueError(
                "AnthropicLLMClient.complete requires at least one message"
            )

        # System parameter: list form with cache_control when caching is requested;
        # plain string otherwise. Empty strings become "" (SDK accepts that).
        system_param: Any
        if cache_system and system:
            system_param = [
                {
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }
            ]
        else:
            system_param = system or ""

        api_messages = [
            {"role": m.role, "content": m.content} for m in messages
        ]

        start = time.perf_counter()
        response = await self._client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_param,
            messages=cast(Any, api_messages),
        )
        latency_ms = int((time.perf_counter() - start) * 1000)

        # Join every text block. Thinking / tool-use blocks are not expected
        # on this call site (we don't enable thinking, we don't declare tools),
        # but we defensively filter to type=="text" rather than assuming
        # response.content[0].
        text_parts = [b.text for b in response.content if b.type == "text"]
        content = "".join(text_parts)

        usage = LLMUsage(
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            cache_read_input_tokens=(
                getattr(response.usage, "cache_read_input_tokens", 0) or 0
            ),
            cache_creation_input_tokens=(
                getattr(response.usage, "cache_creation_input_tokens", 0) or 0
            ),
        )
        cost = calculate_cost(model, usage)

        return LLMResult(
            content=content,
            model=model,
            usage=usage,
            cost_usd=cost,
            latency_ms=latency_ms,
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
        if not messages:
            raise ValueError(
                "AnthropicLLMClient.stream requires at least one message"
            )

        system_param: Any
        if cache_system and system:
            system_param = [
                {
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }
            ]
        else:
            system_param = system or ""

        api_messages = [
            {"role": m.role, "content": m.content} for m in messages
        ]

        start = time.perf_counter()
        async with self._client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            system=system_param,
            messages=cast(Any, api_messages),
        ) as stream:
            async for text in stream.text_stream:
                if text:
                    yield LLMStreamDelta(text=text)

            final_message = await stream.get_final_message()

        latency_ms = int((time.perf_counter() - start) * 1000)

        text_parts = [b.text for b in final_message.content if b.type == "text"]
        content = "".join(text_parts)

        usage = LLMUsage(
            input_tokens=final_message.usage.input_tokens,
            output_tokens=final_message.usage.output_tokens,
            cache_read_input_tokens=(
                getattr(final_message.usage, "cache_read_input_tokens", 0) or 0
            ),
            cache_creation_input_tokens=(
                getattr(final_message.usage, "cache_creation_input_tokens", 0) or 0
            ),
        )
        cost = calculate_cost(model, usage)

        yield LLMStreamFinal(
            result=LLMResult(
                content=content,
                model=model,
                usage=usage,
                cost_usd=cost,
                latency_ms=latency_ms,
            )
        )
