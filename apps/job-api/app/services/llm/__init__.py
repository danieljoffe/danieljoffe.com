"""LLM plumbing module.

Mock-only today. A real Anthropic-backed client is a later phase —
the Protocol interface makes that swap a single-file addition.

Every consumer (derive, tailor, conversation) tags calls with a `purpose`
string so cost-log rows can be grouped by feature for spend analysis.
"""

from app.services.llm.client import LLMClient
from app.services.llm.mock import MockLLMClient

__all__ = ["LLMClient", "MockLLMClient", "get_default_client"]


def get_default_client() -> LLMClient:
    """Default factory. Returns a MockLLMClient today; will read an
    LLM_PROVIDER env var when the real Anthropic client lands.
    """
    return MockLLMClient()
