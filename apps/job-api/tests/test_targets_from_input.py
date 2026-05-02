"""Orchestration tests for ``from_input.from_manual`` / ``from_input.from_url``.

These tests exercise the create-or-link routing layer: which helpers get
called, in what order, and what shape the orchestration returns. The LLM
and crud helpers are monkeypatched so the focus stays on orchestration —
the underlying pieces have their own dedicated tests.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.models.experience import OptimizedPayload
from app.models.llm import LLMResult, LLMUsage
from app.models.targets import (
    DerivedTarget,
    JobTarget,
    ScoringProfile,
    TargetCreate,
    TargetReferenceJD,
    TargetSuggestion,
    TargetUpdate,
    UserTarget,
)
from app.services.llm import cost_log
from app.services.targets import crud, from_input
from app.services.targets.fit_score import FitScoreResult

# ---- Helpers ----------------------------------------------------------------


def _llm_result() -> LLMResult:
    return LLMResult(
        content="{}",
        model="claude-sonnet-4-6",
        usage=LLMUsage(input_tokens=1, output_tokens=1),
        cost_usd=0.0001,
        latency_ms=10,
    )


def _target(
    *,
    id: str = "t-1",
    label: str = "Senior Frontend Engineer",
    profile_version: int = 1,
    description: str | None = None,
) -> JobTarget:
    now = datetime.now(UTC)
    return JobTarget(
        id=id,
        label=label,
        description=description,
        normalized_label=label.lower().strip(),
        scoring_profile=ScoringProfile(),
        search_keywords=["frontend"],
        activation_status="idle",
        profile_version=profile_version,
        is_active=False,
        created_at=now,
        updated_at=now,
    )


def _user_target(
    *,
    user_id: str = "user-1",
    target_id: str = "t-1",
    fit_score: int = 80,
) -> UserTarget:
    now = datetime.now(UTC)
    return UserTarget(
        id="ut-1",
        user_id=user_id,
        target_id=target_id,
        is_active=False,
        fit_score=fit_score,
        fit_score_reasoning="Strong fit.",
        created_at=now,
        updated_at=now,
    )


def _ref_jd(*, target_id: str = "t-1", jd_url: str | None = None) -> TargetReferenceJD:
    return TargetReferenceJD(
        id="ref-1",
        target_id=target_id,
        jd_url=jd_url,
        jd_text="x" * 100,
        extracted_profile=ScoringProfile(),
        created_at=datetime.now(UTC),
    )


class _Recorder:
    """Captures calls to monkeypatched async/sync helpers."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def record(self, name: str, **kwargs: Any) -> None:
        self.calls.append((name, kwargs))

    def names(self) -> list[str]:
        return [n for n, _ in self.calls]

    def by_name(self, name: str) -> list[dict[str, Any]]:
        return [kw for n, kw in self.calls if n == name]


@pytest.fixture
def recorder() -> _Recorder:
    return _Recorder()


@pytest.fixture
def stub_llm_helpers(
    monkeypatch: pytest.MonkeyPatch, recorder: _Recorder
) -> _Recorder:
    """Stub all LLM-driven helpers and cost_log so the orchestration runs offline."""

    async def fake_normalize(llm, *, label, description, payload):  # type: ignore[no-untyped-def]
        recorder.record(
            "normalize",
            label=label,
            description=description,
        )
        return (
            TargetSuggestion(
                label="Senior Frontend Engineer",
                description="Canonical description.",
                core_skills=["React"],
            ),
            _llm_result(),
        )

    async def fake_derive_label(llm, *, label, payload):  # type: ignore[no-untyped-def]
        recorder.record("derive_from_label", label=label)
        return (
            DerivedTarget(
                scoring_profile=ScoringProfile(),
                search_keywords=["frontend engineer"],
            ),
            _llm_result(),
        )

    async def fake_derive_jd(llm, *, jd_text):  # type: ignore[no-untyped-def]
        recorder.record("derive_from_jd", jd_len=len(jd_text))
        return (
            DerivedTarget(
                scoring_profile=ScoringProfile(),
                search_keywords=["frontend engineer", "ui engineer"],
            ),
            _llm_result(),
        )

    async def fake_fit_score(llm, *, payload, target):  # type: ignore[no-untyped-def]
        recorder.record("fit_score", target_id=target.id)
        return FitScoreResult(fit_score=82, reasoning="Strong fit."), _llm_result()

    def fake_cost_record(supabase, **kwargs):  # type: ignore[no-untyped-def]
        recorder.record("cost_log", **kwargs)

    monkeypatch.setattr(from_input, "normalize_manual_input", fake_normalize)
    monkeypatch.setattr(from_input, "derive_profile_from_label", fake_derive_label)
    monkeypatch.setattr(from_input, "derive_profile_from_jd", fake_derive_jd)
    monkeypatch.setattr(from_input, "derive_fit_score", fake_fit_score)
    monkeypatch.setattr(cost_log, "record", fake_cost_record)
    return recorder


@pytest.fixture
def stub_crud(
    monkeypatch: pytest.MonkeyPatch, recorder: _Recorder
) -> _Recorder:
    """Stub crud helpers; specific tests override defaults via monkeypatch."""

    def fake_link(supabase, **kwargs):  # type: ignore[no-untyped-def]
        recorder.record("link", **kwargs)
        return _user_target(
            user_id=kwargs["user_id"], target_id=kwargs["target_id"]
        )

    monkeypatch.setattr(crud, "link_user_to_target", fake_link)
    return recorder


# ---- from_manual: matched path ----------------------------------------------


@pytest.mark.asyncio
async def test_from_manual_matched_links_without_creating(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    """When normalize finds an existing target, no derive/create runs."""
    supabase = MagicMock()
    matched = _target(id="existing")
    monkeypatch.setattr(
        from_input, "find_matching_target", lambda _s, _l: matched
    )

    create_calls: list[TargetCreate] = []

    def fake_create(_s, *, payload):  # type: ignore[no-untyped-def]
        create_calls.append(payload)
        return matched

    monkeypatch.setattr(crud, "create", fake_create)

    result = await from_input.from_manual(
        supabase,
        MagicMock(),
        user_id="user-1",
        label="sr fe eng",
        description=None,
        payload=OptimizedPayload(),
    )

    assert result.was_matched is True
    assert result.target.id == "existing"
    assert "normalize" in stub_llm_helpers.names()
    assert "derive_from_label" not in stub_llm_helpers.names()
    assert create_calls == []
    # Always links inactive
    link_kwargs = stub_crud.by_name("link")[0]
    assert link_kwargs["is_active"] is False
    assert link_kwargs["target_id"] == "existing"
    assert link_kwargs["fit_score"] == 82


# ---- from_manual: new path --------------------------------------------------


@pytest.mark.asyncio
async def test_from_manual_new_creates_then_links(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    """No match → derive profile from label → create → link."""
    supabase = MagicMock()
    monkeypatch.setattr(from_input, "find_matching_target", lambda _s, _l: None)

    created = _target(id="new", label="Senior Frontend Engineer")
    create_calls: list[TargetCreate] = []

    def fake_create(_s, *, payload):  # type: ignore[no-untyped-def]
        create_calls.append(payload)
        return created

    monkeypatch.setattr(crud, "create", fake_create)

    result = await from_input.from_manual(
        supabase,
        MagicMock(),
        user_id="user-1",
        label="sr fe eng",
        description="frontend roles at growth-stage companies",
        payload=OptimizedPayload(),
    )

    assert result.was_matched is False
    assert result.target.id == "new"
    assert "derive_from_label" in stub_llm_helpers.names()
    assert len(create_calls) == 1
    assert create_calls[0].label == "Senior Frontend Engineer"
    # Description from canonicalized suggestion, not raw user input
    assert create_calls[0].description == "Canonical description."
    assert create_calls[0].search_keywords == ["frontend engineer"]
    link_kwargs = stub_crud.by_name("link")[0]
    assert link_kwargs["target_id"] == "new"
    assert link_kwargs["is_active"] is False


# ---- from_manual: cost logging ----------------------------------------------


@pytest.mark.asyncio
async def test_from_manual_logs_each_llm_call(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    supabase = MagicMock()
    monkeypatch.setattr(from_input, "find_matching_target", lambda _s, _l: None)
    monkeypatch.setattr(
        crud, "create", lambda _s, *, payload: _target(id="new")
    )

    await from_input.from_manual(
        supabase,
        MagicMock(),
        user_id="user-1",
        label="sr fe eng",
        description=None,
        payload=OptimizedPayload(),
    )

    purposes = [c["purpose"] for c in stub_llm_helpers.by_name("cost_log")]
    assert "target.normalize_manual" in purposes
    assert "target.derive_from_label" in purposes
    assert "target.fit_score" in purposes


# ---- from_url: matched path (corpus building) -------------------------------


@pytest.mark.asyncio
async def test_from_url_matched_appends_reference_and_bumps_version(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    """Match → add reference JD → re-merge → bump profile_version → link."""
    supabase = MagicMock()
    matched = _target(id="existing", profile_version=4)
    monkeypatch.setattr(
        from_input, "find_matching_target", lambda _s, _l: matched
    )

    add_ref_calls: list[dict[str, Any]] = []

    def fake_add_ref(_s, *, target_id, jd_text, jd_url, extracted_profile):  # type: ignore[no-untyped-def]
        add_ref_calls.append(
            {
                "target_id": target_id,
                "jd_url": jd_url,
                "jd_text_len": len(jd_text),
            }
        )
        return _ref_jd(target_id=target_id, jd_url=jd_url)

    monkeypatch.setattr(crud, "add_reference_jd", fake_add_ref)
    monkeypatch.setattr(
        crud,
        "list_reference_jds",
        lambda _s, _t: [_ref_jd(target_id="existing"), _ref_jd(target_id="existing")],
    )

    update_calls: list[TargetUpdate] = []

    def fake_update(_s, _id, body):  # type: ignore[no-untyped-def]
        update_calls.append(body)
        return _target(id="existing", profile_version=5)

    monkeypatch.setattr(crud, "update", fake_update)
    monkeypatch.setattr(
        from_input,
        "merge_profiles",
        lambda _profiles: ScoringProfile(),
    )

    result = await from_input.from_url(
        supabase,
        MagicMock(),
        user_id="user-1",
        final_url="https://example.com/jobs/123",
        extracted_title="Senior Frontend Engineer",
        jd_text="x" * 200,
        label_override=None,
        payload=OptimizedPayload(),
    )

    assert result.was_matched is True
    assert result.target.profile_version == 5
    assert add_ref_calls == [
        {
            "target_id": "existing",
            "jd_url": "https://example.com/jobs/123",
            "jd_text_len": 200,
        }
    ]
    assert len(update_calls) == 1
    assert update_calls[0].profile_version == 5  # bumped from 4
    link_kwargs = stub_crud.by_name("link")[0]
    assert link_kwargs["target_id"] == "existing"
    assert link_kwargs["is_active"] is False


# ---- from_url: new path -----------------------------------------------------


@pytest.mark.asyncio
async def test_from_url_new_creates_with_reference_jd(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    supabase = MagicMock()
    monkeypatch.setattr(from_input, "find_matching_target", lambda _s, _l: None)

    created = _target(id="new", label="Senior Frontend Engineer")
    create_calls: list[TargetCreate] = []

    def fake_create(_s, *, payload):  # type: ignore[no-untyped-def]
        create_calls.append(payload)
        return created

    monkeypatch.setattr(crud, "create", fake_create)

    add_ref_calls: list[dict[str, Any]] = []

    def fake_add_ref(_s, *, target_id, jd_text, jd_url, extracted_profile):  # type: ignore[no-untyped-def]
        add_ref_calls.append({"target_id": target_id, "jd_url": jd_url})
        return _ref_jd(target_id=target_id, jd_url=jd_url)

    monkeypatch.setattr(crud, "add_reference_jd", fake_add_ref)
    monkeypatch.setattr(crud, "get", lambda _s, _id: created)

    result = await from_input.from_url(
        supabase,
        MagicMock(),
        user_id="user-1",
        final_url="https://example.com/jobs/abc",
        extracted_title="Senior Frontend Engineer",
        jd_text="x" * 200,
        label_override=None,
        payload=OptimizedPayload(),
    )

    assert result.was_matched is False
    assert result.target.id == "new"
    assert len(create_calls) == 1
    assert create_calls[0].label == "Senior Frontend Engineer"
    assert add_ref_calls == [
        {"target_id": "new", "jd_url": "https://example.com/jobs/abc"}
    ]
    link_kwargs = stub_crud.by_name("link")[0]
    assert link_kwargs["target_id"] == "new"


# ---- from_url: label resolution ----------------------------------------------


@pytest.mark.asyncio
async def test_from_url_prefers_label_override_over_extracted(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    supabase = MagicMock()
    seen_labels: list[str] = []

    def fake_match(_s, label):  # type: ignore[no-untyped-def]
        seen_labels.append(label)
        return None

    monkeypatch.setattr(from_input, "find_matching_target", fake_match)

    created = _target(id="new", label="My Custom Label")
    monkeypatch.setattr(
        crud, "create", lambda _s, *, payload: created
    )
    monkeypatch.setattr(
        crud, "add_reference_jd", lambda _s, **kw: _ref_jd()
    )
    monkeypatch.setattr(crud, "get", lambda _s, _id: created)

    await from_input.from_url(
        supabase,
        MagicMock(),
        user_id="user-1",
        final_url="https://example.com/jobs/x",
        extracted_title="Different Extracted Title",
        jd_text="x" * 200,
        label_override="My Custom Label",
        payload=OptimizedPayload(),
    )

    assert seen_labels == ["My Custom Label"]


@pytest.mark.asyncio
async def test_from_url_falls_back_to_extracted_title(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    supabase = MagicMock()
    seen_labels: list[str] = []
    monkeypatch.setattr(
        from_input,
        "find_matching_target",
        lambda _s, label: seen_labels.append(label) or None,  # type: ignore[func-returns-value]
    )

    created = _target(id="new", label="Extracted Title")
    monkeypatch.setattr(
        crud, "create", lambda _s, *, payload: created
    )
    monkeypatch.setattr(
        crud, "add_reference_jd", lambda _s, **kw: _ref_jd()
    )
    monkeypatch.setattr(crud, "get", lambda _s, _id: created)

    await from_input.from_url(
        supabase,
        MagicMock(),
        user_id="user-1",
        final_url="https://example.com/jobs/y",
        extracted_title="Extracted Title",
        jd_text="x" * 200,
        label_override=None,
        payload=OptimizedPayload(),
    )

    assert seen_labels == ["Extracted Title"]


@pytest.mark.asyncio
async def test_from_url_uses_untitled_target_when_no_label_available(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    supabase = MagicMock()
    seen_labels: list[str] = []
    monkeypatch.setattr(
        from_input,
        "find_matching_target",
        lambda _s, label: seen_labels.append(label) or None,  # type: ignore[func-returns-value]
    )

    created = _target(id="new", label="Untitled Target")
    monkeypatch.setattr(
        crud, "create", lambda _s, *, payload: created
    )
    monkeypatch.setattr(
        crud, "add_reference_jd", lambda _s, **kw: _ref_jd()
    )
    monkeypatch.setattr(crud, "get", lambda _s, _id: created)

    await from_input.from_url(
        supabase,
        MagicMock(),
        user_id="user-1",
        final_url="https://example.com/jobs/z",
        extracted_title=None,
        jd_text="x" * 200,
        label_override=None,
        payload=OptimizedPayload(),
    )

    assert seen_labels == ["Untitled Target"]
