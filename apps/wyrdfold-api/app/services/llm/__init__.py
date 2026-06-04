"""LLM plumbing module.

The `LLMClient` Protocol has three implementations:

- `MockLLMClient` — deterministic fake for tests and local dev.
- `AnthropicLLMClient` — production, uses the official `anthropic` SDK
  pointed at api.anthropic.com.
- `OpenRouterLLMClient` — same code path as Anthropic but routed
  through openrouter.ai for unified billing + cross-provider fallback
  (see plan-wyrdfold-openrouter-migration.md).

`get_default_client()` picks based on `settings.llm_provider` (env var
`LLM_PROVIDER=mock|anthropic|openrouter`). Mock is the default so
nothing hits a real API unless opted in.

Every consumer (derive, tailor, conversation) tags calls with a `purpose`
string so cost-log rows can be grouped by feature for spend analysis.
"""

from app.services.llm.anthropic_client import AnthropicLLMClient
from app.services.llm.client import LLMClient
from app.services.llm.mock import MockLLMClient
from app.services.llm.openrouter_client import OpenRouterLLMClient

__all__ = [
    "AnthropicLLMClient",
    "LLMClient",
    "MockLLMClient",
    "OpenRouterLLMClient",
    "get_default_client",
]


def get_default_client() -> LLMClient:
    """Return the configured LLM client.

    Reads `settings.llm_provider`. `"anthropic"` and `"openrouter"`
    require their respective API keys to be set (`anthropic_api_key`
    / `openrouter_api_key`); anything else falls back to the mock.
    """
    from app.config import settings

    if settings.llm_provider == "anthropic":
        return AnthropicLLMClient(
            api_key=settings.anthropic_api_key or None,
            timeout=settings.anthropic_timeout_seconds,
            max_retries=settings.anthropic_max_retries,
        )
    if settings.llm_provider == "openrouter":
        return OpenRouterLLMClient(
            api_key=settings.openrouter_api_key or None,
            timeout=settings.openrouter_timeout_seconds,
            max_retries=settings.openrouter_max_retries,
        )
    return MockLLMClient()
