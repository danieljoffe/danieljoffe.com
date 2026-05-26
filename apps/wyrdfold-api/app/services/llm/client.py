"""LLM client Protocol.

The interface every consumer codes against. Real and mock implementations
both satisfy it. Surface:

- ``complete``: raw text completion (system + user → text + usage).
- ``complete_tool_use``: forced single-tool completion. The model is required
  to call exactly one tool whose ``input_schema`` we supply; we get back the
  validated input dict the API decoded for us. This is how we get reliable
  structured output without hoping the LLM guesses the right field names from
  prose instructions.
- ``stream``: incremental text completion.

``complete_json`` is a thin helper layered on ``complete_tool_use`` — it
builds a tool from a Pydantic schema, calls the model, then validates the
returned dict against the schema. Callers that want a typed object use it.
"""

import re
from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Any, Protocol, TypeVar

from pydantic import BaseModel

from app.models.llm import LLMResult, LLMStreamEvent, Message, ModelId

T = TypeVar("T", bound=BaseModel)

_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*\n(.*?)\n```\s*$", re.DOTALL | re.IGNORECASE)


def strip_markdown_fence(content: str) -> str:
    """Strip a leading ```json ... ``` (or plain ```) wrapper if present.

    Haiku occasionally wraps JSON output in a markdown code fence despite
    being told not to. Stripping defensively keeps schema validation happy.
    Used by streaming paths that don't go through ``complete_tool_use``.
    """
    match = _FENCE_RE.match(content)
    return match.group(1) if match else content


class LLMClient(Protocol):
    """Protocol satisfied by both MockLLMClient and AnthropicLLMClient."""

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
        """Run a completion that's forced to call a single tool.

        The API enforces ``input_schema`` server-side and returns the tool's
        input as a typed dict. This is the reliable path for structured
        output — far safer than asking the LLM to "return JSON" in prose.

        Returns the tool input dict and the LLMResult (for cost-logging).
        Callers that want a Pydantic object should use ``complete_json``.
        """
        ...

    def stream(
        self,
        *,
        model: ModelId,
        system: str,
        messages: list[Message],
        purpose: str,
        max_tokens: int = 4096,
        cache_system: bool = False,
    ) -> AsyncIterator[LLMStreamEvent]:
        """Stream a completion.

        Yields ``LLMStreamDelta`` for each text chunk, then a single
        ``LLMStreamFinal`` containing the full ``LLMResult`` (content, usage,
        cost, latency). Same args as :meth:`complete` — implementations are
        free to share the underlying API call.
        """
        ...


_INVALID_TOOL_NAME_CHARS = re.compile(r"[^a-zA-Z0-9_-]")


@lru_cache(maxsize=128)
def _tool_name_for(schema: type[BaseModel]) -> str:
    """Anthropic tool names allow [a-zA-Z0-9_-]{1,64}. Sanitize the
    schema's class name so generic types or odd characters don't break
    the call."""
    sanitized = _INVALID_TOOL_NAME_CHARS.sub("_", schema.__name__)
    return f"return_{sanitized}"[:64]


@lru_cache(maxsize=128)
def _tool_input_schema_for(schema: type[BaseModel]) -> dict[str, Any]:
    """Cache `model_json_schema()` per Pydantic class.

    The JSON schema is fully determined by the class — generating it on every
    call walks every field, every annotation, every nested model. For hot
    paths (probe, conversation turn) the same schema is rebuilt on each
    request. Caching by class identity is safe because Pydantic models are
    immutable once defined.
    """
    return schema.model_json_schema()


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
    """Call the model with a single forced tool whose ``input_schema`` is
    derived from ``schema``. The API parses + validates the tool input
    against the schema before returning, eliminating field-name drift and
    JSON-shape errors from prose-only instructions.

    Returns ``(parsed_schema, llm_result)``. Callers log cost via the
    result; the parsed object is the typed payload.
    """
    raw_input, result = await client.complete_tool_use(
        model=model,
        system=system,
        messages=messages,
        tool_name=_tool_name_for(schema),
        tool_description=f"Record the response as a populated {schema.__name__} object.",
        tool_input_schema=_tool_input_schema_for(schema),
        purpose=purpose,
        max_tokens=max_tokens,
        cache_system=cache_system,
    )
    parsed = schema.model_validate(raw_input)
    return parsed, result
