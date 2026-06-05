"""Tests for OpenRouterLLMClient (PR A of OpenRouter migration).

Covers the model-slug remap + base_url routing. We don't mock the
actual HTTP call here — the parent class already exercises the
AsyncAnthropic happy path. What we verify is the *only* thing this
subclass changes: model translation and SDK construction.
"""

from __future__ import annotations

import pytest

from app.services.llm.openrouter_client import (
    _MODEL_SLUG_MAP,
    _OPENROUTER_BASE_URL,
    OpenRouterLLMClient,
)


def test_resolves_known_models_to_openrouter_slugs() -> None:
    """All three ModelId values in the workspace today must have a
    mapping. New ModelIds need their slug added to the map at the same
    time as the ModelId Literal — this test surfaces forgotten ones."""
    client = OpenRouterLLMClient(api_key="sk-or-fake")
    assert client._resolve_model("claude-sonnet-4-6") == "anthropic/claude-sonnet-4.6"
    assert client._resolve_model("claude-haiku-4-5") == "anthropic/claude-haiku-4.5"
    assert client._resolve_model("claude-opus-4-7") == "anthropic/claude-opus-4.7"


def test_unknown_model_raises_with_actionable_message() -> None:
    """If someone adds a new ModelId to the Literal without updating
    the slug map, the failure must surface immediately at first use —
    not silently route to a wrong model. The exception text names the
    file to edit."""
    client = OpenRouterLLMClient(api_key="sk-or-fake")
    with pytest.raises(ValueError, match=r"openrouter_client\.py"):
        client._resolve_model("claude-imaginary-9-0")  # type: ignore[arg-type]


def test_constructor_points_sdk_at_openrouter_base_url() -> None:
    """The whole point of this client is routing to a non-default host.
    Verify the AsyncAnthropic instance carries the OR base URL."""
    client = OpenRouterLLMClient(api_key="sk-or-fake")
    # AsyncAnthropic stores base_url on the sync inner client; assert by
    # string contains since the SDK may normalize trailing slashes.
    base = str(client._client.base_url)
    assert _OPENROUTER_BASE_URL in base


def test_base_url_does_not_include_v1_segment() -> None:
    """The Anthropic SDK appends '/v1/messages' to base_url internally.
    Reason: setting base_url='https://openrouter.ai/api/v1' produced
    requests to '/api/v1/v1/messages' (404) in production. The base
    must stop at '/api' so the SDK's append yields '/api/v1/messages'.
    """
    assert not _OPENROUTER_BASE_URL.rstrip("/").endswith("/v1"), (
        "OpenRouter base_url must NOT include '/v1' — the Anthropic SDK "
        "appends '/v1/messages' itself. Double-/v1 causes a silent 404."
    )


def test_anthropic_client_default_base_url_is_unaffected() -> None:
    """Regression: the new base_url constructor knob has a None default
    so non-OR callers still hit the Anthropic endpoint."""
    from app.services.llm.anthropic_client import AnthropicLLMClient

    plain = AnthropicLLMClient(api_key="sk-ant-fake")
    # When base_url isn't passed, the AsyncAnthropic SDK defaults to
    # https://api.anthropic.com — assert OR is *not* in there.
    assert _OPENROUTER_BASE_URL not in str(plain._client.base_url)


def test_slug_map_covers_every_model_id() -> None:
    """Belt-and-suspenders against the same drift as
    test_unknown_model_raises: iterate the ModelId Literal at runtime
    via typing.get_args and require a mapping for each."""
    from typing import get_args

    from app.models.llm import ModelId

    for model in get_args(ModelId):
        assert model in _MODEL_SLUG_MAP, (
            f"{model!r} is a ModelId but has no OpenRouter slug. "
            f"Add it to _MODEL_SLUG_MAP."
        )


def test_get_default_client_returns_openrouter_when_provider_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """End-to-end of the LLM_PROVIDER=openrouter env flow."""
    from app import config as config_mod
    from app.services.llm import get_default_client

    monkeypatch.setattr(config_mod.settings, "llm_provider", "openrouter")
    monkeypatch.setattr(config_mod.settings, "openrouter_api_key", "sk-or-fake")

    client = get_default_client()
    assert isinstance(client, OpenRouterLLMClient)
