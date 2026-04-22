"""LLM plumbing module (#185 P2a).

Mock-only for now. A real Anthropic-backed client is a later phase —
the Protocol interface makes that swap a constructor change.

Every consumer (derive, tailor, conversation) tags calls with a `purpose`
string so cost-log rows can be grouped by feature for spend analysis.
"""

from app.services.llm.client import LLMClient
from app.services.llm.mock import MockLLMClient

__all__ = ["LLMClient", "MockLLMClient"]
