"""LLM plumbing module.

The `LLMClient` Protocol has two implementations:

- `MockLLMClient` — deterministic fake for tests and local dev.
- `AnthropicLLMClient` — production, uses the official `anthropic` SDK.

`get_default_client()` picks based on `settings.llm_provider` (env var
`LLM_PROVIDER=mock|anthropic`). Mock is the default so nothing hits the
real API unless opted in.

Every consumer (derive, tailor, conversation) tags calls with a `purpose`
string so cost-log rows can be grouped by feature for spend analysis.
"""

from app.services.llm.anthropic_client import AnthropicLLMClient
from app.services.llm.client import LLMClient
from app.services.llm.mock import MockLLMClient

__all__ = [
    "AnthropicLLMClient",
    "LLMClient",
    "MockLLMClient",
    "get_default_client",
]


def get_default_client() -> LLMClient:
    """Return the configured LLM client.

    Reads `settings.llm_provider`. `"anthropic"` requires `ANTHROPIC_API_KEY`
    (via env or `anthropic_api_key` setting); anything else falls back to
    the mock.
    """
    from app.config import settings

    if settings.llm_provider == "anthropic":
        return AnthropicLLMClient(
            api_key=settings.anthropic_api_key or None,
            timeout=settings.anthropic_timeout_seconds,
            max_retries=settings.anthropic_max_retries,
        )
    return MockLLMClient()
