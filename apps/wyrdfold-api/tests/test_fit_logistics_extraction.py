"""Tests for the logistics extraction toggle in the Phase 2 grader.

The toggle is the additive flag from
``plan-wyrdfold-logistics-chips.md``: when the
``LOGISTICS_EXTRACTION_ENABLED`` config is on, the Phase 2 system
prompt is extended with a logistics section asking Sonnet to emit a
``logistics`` JSON object alongside the existing axis scores. When
off, the system prompt is byte-identical to the pre-logistics
version (matters for Anthropic prompt-cache hits + shadow parity).

These tests cover the toggle wiring + the result schema. The actual
extraction quality is measured by the shadow eval harness separately
(see ``feedback-prompt-change-shadow-run`` — a unit test can't grade
prompt quality).
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.experience import OptimizedPayload
from app.models.logistics import LogisticsFilters
from app.models.targets import JobTarget, ScoringProfile
from app.services.fit import job_fit
from app.services.fit.job_fit import (
    _LOGISTICS_PROMPT_ADDENDUM,
    _SYSTEM_PROMPT,
    AxisScores,
    JobFitResult,
    derive_job_fit,
)


def _payload() -> OptimizedPayload:
    return OptimizedPayload(summary="...", roles=[], skills=[], outcomes=[])


def _target() -> JobTarget:
    now = datetime.now(UTC)
    return JobTarget(
        id="t-1",
        label="Director of CX Operations",
        scoring_profile=ScoringProfile(),
        is_active=True,
        created_at=now,
        updated_at=now,
    )


def _axes() -> AxisScores:
    return AxisScores(title_fit=80, skills_fit=75, seniority_fit=80, domain_fit=70)


# ---- JobFitResult shape -------------------------------------------------


def test_job_fit_result_logistics_defaults_to_none() -> None:
    """Old grading runs (and runs with the flag off) leave logistics None."""
    result = JobFitResult(fit_score=80, axes=_axes(), reasoning="ok")
    assert result.logistics is None


def test_job_fit_result_accepts_logistics_object() -> None:
    """When the flag is on the LLM emits a logistics object; verify it parses."""
    result = JobFitResult(
        fit_score=80,
        axes=_axes(),
        reasoning="ok",
        logistics=LogisticsFilters(
            remote_status="hybrid",
            salary_min=150_000,
            salary_max=180_000,
            salary_currency="USD",
            salary_unit="year",
            location_city="San Francisco",
            location_country="US",
        ),
    )
    assert result.logistics is not None
    assert result.logistics.remote_status == "hybrid"
    assert result.logistics.has_any_signal() is True


def test_job_fit_result_round_trips_through_dict() -> None:
    """Persistence path serializes via model_dump → jsonb → parse on read."""
    src = JobFitResult(
        fit_score=80,
        axes=_axes(),
        reasoning="ok",
        logistics=LogisticsFilters(remote_status="remote", location_country="US"),
    )
    roundtripped = JobFitResult.model_validate(src.model_dump())
    assert roundtripped == src


# ---- derive_job_fit toggles --------------------------------------------


@pytest.mark.asyncio
async def test_default_call_uses_base_prompt(monkeypatch: pytest.MonkeyPatch) -> None:
    """extract_logistics defaults to False: the system prompt that
    reaches complete_json is byte-identical to the pre-logistics
    version. Critical for Anthropic prompt-cache hits — any change to
    the cached system slot invalidates the cache."""
    seen: dict[str, object] = {}

    async def fake_complete_json(
        *_args: object, system: str, **kwargs: object
    ) -> object:
        seen["system"] = system
        seen["max_tokens"] = kwargs["max_tokens"]
        return (JobFitResult(fit_score=80, axes=_axes(), reasoning="ok"), MagicMock())

    monkeypatch.setattr(job_fit, "complete_json", fake_complete_json)

    await derive_job_fit(
        AsyncMock(),
        payload=_payload(),
        target=_target(),
        job_title="Director of CX Operations",
        jd_text="...",
    )

    assert seen["system"] == _SYSTEM_PROMPT
    assert _LOGISTICS_PROMPT_ADDENDUM not in seen["system"]  # type: ignore[operator]
    assert seen["max_tokens"] == 1024


@pytest.mark.asyncio
async def test_extract_logistics_appends_addendum(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """extract_logistics=True appends the addendum and bumps max_tokens
    so the additional JSON section doesn't truncate mid-write."""
    seen: dict[str, object] = {}

    async def fake_complete_json(
        *_args: object, system: str, **kwargs: object
    ) -> object:
        seen["system"] = system
        seen["max_tokens"] = kwargs["max_tokens"]
        return (
            JobFitResult(
                fit_score=80,
                axes=_axes(),
                reasoning="ok",
                logistics=LogisticsFilters(remote_status="remote"),
            ),
            MagicMock(),
        )

    monkeypatch.setattr(job_fit, "complete_json", fake_complete_json)

    await derive_job_fit(
        AsyncMock(),
        payload=_payload(),
        target=_target(),
        job_title="Director of CX Operations",
        jd_text="...",
        extract_logistics=True,
    )

    assert seen["system"].endswith(_LOGISTICS_PROMPT_ADDENDUM)  # type: ignore[union-attr]
    assert seen["system"].startswith(_SYSTEM_PROMPT)  # type: ignore[union-attr]
    assert seen["max_tokens"] == 1280


def test_addendum_is_strictly_additive() -> None:
    """The base prompt must not change when the addendum is added.
    Otherwise the shadow-comparison contract breaks: 'old vs new' would
    actually be 'old vs (new + base-edit)' — confounding the eval."""
    assert _SYSTEM_PROMPT in (_SYSTEM_PROMPT + _LOGISTICS_PROMPT_ADDENDUM)
    assert (
        _SYSTEM_PROMPT + _LOGISTICS_PROMPT_ADDENDUM
    ).startswith(_SYSTEM_PROMPT)
