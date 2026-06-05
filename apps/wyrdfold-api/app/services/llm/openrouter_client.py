"""OpenRouter-backed LLMClient.

PR A of plan-wyrdfold-openrouter-migration.md. The OpenRouter API at
https://openrouter.ai/api/v1/messages exposes a fully Anthropic-compatible
/messages endpoint — including prompt caching (cache_control:
ephemeral), tool-use forced calls, and streaming — using the same
shape the Anthropic SDK speaks natively.

So this client is a thin subclass of AnthropicLLMClient that:
- points AsyncAnthropic at OpenRouter's base URL via the new
  ``base_url`` constructor knob,
- translates our internal ModelId values into OpenRouter's namespaced
  slugs via the ``_resolve_model`` hook.

Everything else — caching, retries, usage parsing, cost calculation —
flows through the parent class unchanged. Behaviorally identical for
Anthropic models; the gateway just bills differently.

ZDR (Zero Data Retention) is enabled account-wide via the OpenRouter
dashboard, not per-request — that's the operator action documented
in PR A.

Non-Anthropic models (GPT-5.1, Gemini, DeepSeek) need OpenRouter's
OpenAI-compatible endpoint, not the Anthropic-compatible one this
client uses. Routing across providers is the job of PR B; this PR is
strictly the Anthropic-shaped path.
"""

from __future__ import annotations

from app.models.llm import ModelId
from app.services.llm.anthropic_client import AnthropicLLMClient

# Anthropic SDK appends "/v1/messages" to base_url internally. Omit the
# /v1 here or we'd hit /api/v1/v1/messages (404). OpenRouter's docs show
# the full path with /v1 because they're documenting the raw HTTP path,
# not the SDK's base_url field.
_OPENROUTER_BASE_URL = "https://openrouter.ai/api"

# Map our internal ModelId to OpenRouter's namespaced slugs. OR uses
# dotted version numbers (4.6 not 4-6); the upstream API call passes
# the string through unchanged, so OR is the one that matters for
# matching. Extend this dict when ModelId gains new entries.
_MODEL_SLUG_MAP: dict[str, str] = {
    "claude-opus-4-7": "anthropic/claude-opus-4.7",
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
    "claude-haiku-4-5": "anthropic/claude-haiku-4.5",
}


class OpenRouterLLMClient(AnthropicLLMClient):
    """Implements LLMClient via OpenRouter's Anthropic-compatible API.

    Behaviorally identical to AnthropicLLMClient — same caching, same
    tool-use, same streaming — but routed through OpenRouter so we get
    one billing relationship + cross-provider fallback as a later
    capability (PR B).
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        timeout: float = 600.0,
        max_retries: int = 3,
    ) -> None:
        super().__init__(
            api_key=api_key,
            timeout=timeout,
            max_retries=max_retries,
            base_url=_OPENROUTER_BASE_URL,
        )

    def _resolve_model(self, model: ModelId) -> str:
        slug = _MODEL_SLUG_MAP.get(model)
        if slug is None:
            raise ValueError(
                f"No OpenRouter slug mapped for ModelId={model!r}. "
                f"Add it to _MODEL_SLUG_MAP in openrouter_client.py."
            )
        return slug
