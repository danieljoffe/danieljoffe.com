"""Tests for the lateral target discovery service (PR D)."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

from app.models.experience import OptimizedPayload
from app.models.targets import (
    JobTarget,
    ScoringProfile,
)
from app.services.targets.lateral_discovery import (
    LateralSuggestion,
    LateralSuggestions,
    _build_user_message,
    suggest_lateral_targets,
)


def _payload() -> OptimizedPayload:
    return OptimizedPayload(summary="...", roles=[], skills=[], outcomes=[])


def _target(label: str, *, seniority: str | None = None) -> JobTarget:
    return JobTarget(
        id=f"t-{label.lower().replace(' ', '-')}",
        label=label,
        scoring_profile=ScoringProfile(),
        is_active=True,
        seniority_hint=seniority,  # type: ignore[arg-type]
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


# ---- _build_user_message --------------------------------------------------


def test_user_message_includes_profile_summary() -> None:
    msg = _build_user_message(_payload(), [])
    assert "## User profile" in msg


def test_user_message_lists_current_targets_for_exclusion() -> None:
    msg = _build_user_message(
        _payload(),
        [
            _target("Director of CX Operations"),
            _target("Head of Customer Experience"),
        ],
    )
    assert "do NOT re-suggest" in msg
    assert "Director of CX Operations" in msg
    assert "Head of Customer Experience" in msg


def test_user_message_includes_seniority_hint_when_present() -> None:
    msg = _build_user_message(
        _payload(),
        [_target("Director of CX Operations", seniority="director")],
    )
    assert "(director)" in msg


def test_user_message_handles_no_current_targets_gracefully() -> None:
    msg = _build_user_message(_payload(), [])
    # Notes the empty state explicitly rather than rendering a bare
    # header. The LLM picks up the cue that this is a first-time call.
    assert "none" in msg.lower() or "first lateral pass" in msg.lower()


def test_user_message_states_task_with_cap() -> None:
    msg = _build_user_message(_payload(), [])
    assert "lateral targets" in msg
    # Should mention the cap so the LLM doesn't run away.
    assert "8" in msg  # _MAX_SUGGESTIONS


# ---- LateralSuggestion schema --------------------------------------------


def test_lateral_suggestion_requires_seniority_hint() -> None:
    """seniority_hint is REQUIRED — the activation flow needs it to map
    onto the slim target shape's seniority_hint column."""
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        LateralSuggestion(
            label="Director of CX Ops",
            one_line_reasoning="x",
            confidence=80,
            lateral_relationship="same altitude",
        )  # type: ignore[call-arg]


def test_lateral_suggestion_seniority_enum_enforced() -> None:
    """Only the canonical 7 seniority levels are accepted."""
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        LateralSuggestion(
            label="Director of CX Ops",
            one_line_reasoning="x",
            confidence=80,
            lateral_relationship="same altitude",
            seniority_hint="overlord",  # type: ignore[arg-type]
        )


def test_lateral_suggestion_confidence_bounds() -> None:
    from pydantic import ValidationError

    # In-bounds
    LateralSuggestion(
        label="VP of CX",
        one_line_reasoning="x",
        confidence=0,
        lateral_relationship="x",
        seniority_hint="director",
    )
    LateralSuggestion(
        label="VP of CX",
        one_line_reasoning="x",
        confidence=100,
        lateral_relationship="x",
        seniority_hint="director",
    )
    # Out of bounds rejected
    with pytest.raises(ValidationError):
        LateralSuggestion(
            label="VP of CX",
            one_line_reasoning="x",
            confidence=101,
            lateral_relationship="x",
            seniority_hint="director",
        )
    with pytest.raises(ValidationError):
        LateralSuggestion(
            label="VP of CX",
            one_line_reasoning="x",
            confidence=-1,
            lateral_relationship="x",
            seniority_hint="director",
        )


# ---- suggest_lateral_targets (mocked LLM) --------------------------------


@pytest.mark.asyncio
async def test_returns_suggestions_from_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    """Happy path: LLM returns 5 suggestions, all within the cap."""
    fixture = LateralSuggestions(
        suggestions=[
            LateralSuggestion(
                label="Director of Customer Success Operations",
                one_line_reasoning="Maps onto your Zendesk + BPO experience.",
                confidence=92,
                lateral_relationship="same altitude, CS vocab",
                primary_industry="B2B SaaS",
                seniority_hint="director",
            ),
            LateralSuggestion(
                label="Head of Member Experience",
                one_line_reasoning="Healthtech framing of your CX work.",
                confidence=78,
                lateral_relationship="same altitude, healthtech industry",
                primary_industry="healthtech",
                seniority_hint="director",
            ),
        ]
    )

    async def fake_complete_json(*args: object, **kwargs: object) -> object:
        return (fixture, MagicMock())

    monkeypatch.setattr(
        "app.services.targets.lateral_discovery.complete_json",
        fake_complete_json,
    )

    parsed, _ = await suggest_lateral_targets(MagicMock(), payload=_payload())
    assert len(parsed.suggestions) == 2
    assert parsed.suggestions[0].label == "Director of Customer Success Operations"


@pytest.mark.asyncio
async def test_trims_oversized_response_by_confidence(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """If the LLM ignores the 8-max instruction and returns 12, we keep
    the top 8 by confidence rather than rejecting the whole batch."""
    over = LateralSuggestions(
        suggestions=[
            LateralSuggestion(
                label=f"Target {i}",
                one_line_reasoning="x",
                confidence=i * 10 % 95,  # spread across 0-95
                lateral_relationship="x",
                seniority_hint="director",
            )
            for i in range(12)
        ]
    )

    async def fake_complete_json(*args: object, **kwargs: object) -> object:
        return (over, MagicMock())

    monkeypatch.setattr(
        "app.services.targets.lateral_discovery.complete_json",
        fake_complete_json,
    )

    parsed, _ = await suggest_lateral_targets(MagicMock(), payload=_payload())
    assert len(parsed.suggestions) == 8
    # Sorted highest-confidence first — the top 8 of the original 12 by score.
    confidences = [s.confidence for s in parsed.suggestions]
    assert confidences == sorted(confidences, reverse=True)


@pytest.mark.asyncio
async def test_passes_current_targets_to_prompt(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The current_targets list must reach the prompt or the LLM will
    happily re-suggest what the user already has."""
    seen_messages: list[str] = []

    async def fake_complete_json(*args: object, **kwargs: object) -> object:
        # The user message is in ``messages[0].content``.
        seen_messages.append(kwargs["messages"][0].content)
        return (LateralSuggestions(suggestions=[]), MagicMock())

    monkeypatch.setattr(
        "app.services.targets.lateral_discovery.complete_json",
        fake_complete_json,
    )

    await suggest_lateral_targets(
        MagicMock(),
        payload=_payload(),
        current_targets=[_target("Director of CX Operations")],
    )

    assert len(seen_messages) == 1
    assert "Director of CX Operations" in seen_messages[0]
    assert "do NOT re-suggest" in seen_messages[0]
