"""LLM client Protocol.

The interface every consumer codes against. Real and mock implementations
both satisfy it. Keeping the surface small: a single `complete` method that
takes system + user messages and returns structured usage + content.

JSON-mode (structured output via Pydantic schema) is a thin helper layered
on top — see `complete_json` below. Consumers that need a typed object
use that; everyone else uses `complete`.
"""

from typing import Protocol, TypeVar

from pydantic import BaseModel

from app.models.llm import LLMResult, Message, ModelId

T = TypeVar("T", bound=BaseModel)


class LLMClient(Protocol):
    """Protocol satisfied by both MockLLMClient and (later) AnthropicLLMClient."""

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
        """Run a completion.

        Args:
            model: Which Claude model to use.
            system: System prompt. If `cache_system=True`, the real client
                will set `cache_control` on this block.
            messages: User/assistant history. At least one user message required.
            purpose: Short label for cost-log grouping (e.g. "derive", "tailor",
                "conversation.onboarding", "conversation.update", "gap_probe").
            max_tokens: Hard cap on output.
            cache_system: Hint to the real client to apply prompt caching on
                the system block. Ignored by the mock.
        """
        ...


async def complete_json(
    client: LLMClient,
    *,
    model: ModelId,
    system: str,
    messages: list[Message],
    schema: type[T],
    purpose: str,
    max_tokens: int = 4096,
    cache_system: bool = False,
) -> tuple[T, LLMResult]:
    """Call `complete` and validate the response against `schema`.

    Returns both the parsed object and the underlying LLMResult so callers
    can log cost. The real implementation may use tool_use / structured_output
    primitives; this helper just parses the content string as JSON. That's
    fine for the mock (which returns JSON) and will be upgraded in the real
    client without changing the consumer API.
    """
    result = await client.complete(
        model=model,
        system=system,
        messages=messages,
        purpose=purpose,
        max_tokens=max_tokens,
        cache_system=cache_system,
    )
    parsed = schema.model_validate_json(result.content)
    return parsed, result
