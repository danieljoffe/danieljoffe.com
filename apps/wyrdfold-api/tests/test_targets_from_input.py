"""Orchestration tests for ``from_input`` (create-or-link + deferred derive).

The inline path (``from_manual`` / ``from_url``) only runs the normalize
LLM call (manual) or no LLM call (URL) before linking the user and
returning. The expensive ``derive_profile_*`` + ``derive_fit_score`` work
is scheduled onto a ``BackgroundTask`` — these tests assert both halves:

* the inline path links + schedules the right background function without
  touching derive/fit, and
* the background functions (``derive_manual_target_bg`` /
  ``derive_url_target_bg``) derive the profile, flip the activation status,
  and upsert the fit score — marking the target ``error`` on failure.

The LLM and crud helpers are monkeypatched so the focus stays on
orchestration — the underlying pieces have their own dedicated tests.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi import BackgroundTasks

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
    activation_status: str = "idle",
) -> JobTarget:
    now = datetime.now(UTC)
    return JobTarget(
        id=id,
        label=label,
        description=description,
        normalized_label=label.lower().strip(),
        scoring_profile=ScoringProfile(),
        search_keywords=["frontend"],
        activation_status=activation_status,
        profile_version=profile_version,
        is_active=False,
        created_at=now,
        updated_at=now,
    )


def _user_target(
    *,
    user_id: str = "user-1",
    target_id: str = "t-1",
    fit_score: int | None = None,
) -> UserTarget:
    now = datetime.now(UTC)
    return UserTarget(
        id="ut-1",
        user_id=user_id,
        target_id=target_id,
        is_active=False,
        fit_score=fit_score,
        fit_score_reasoning="Strong fit." if fit_score is not None else None,
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
def stub_llm_helpers(monkeypatch: pytest.MonkeyPatch, recorder: _Recorder) -> _Recorder:
    """Stub all LLM-driven helpers and cost_log so the orchestration runs offline."""

    async def fake_normalize(llm, *, label, description, payload):  # type: ignore[no-untyped-def]
        recorder.record("normalize", label=label, description=description)
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
def stub_crud(monkeypatch: pytest.MonkeyPatch, recorder: _Recorder) -> _Recorder:
    """Stub crud link/update; specific tests override create/get as needed."""

    def fake_link(supabase, **kwargs):  # type: ignore[no-untyped-def]
        recorder.record("link", **kwargs)
        return _user_target(
            user_id=kwargs["user_id"],
            target_id=kwargs["target_id"],
            fit_score=kwargs.get("fit_score"),
        )

    def fake_update(supabase, target_id, body):  # type: ignore[no-untyped-def]
        recorder.record("update", target_id=target_id, body=body)
        return _target(
            id=target_id,
            activation_status=body.activation_status or "idle",
            profile_version=body.profile_version or 1,
        )

    monkeypatch.setattr(crud, "link_user_to_target", fake_link)
    monkeypatch.setattr(crud, "update", fake_update)
    return recorder


def _scheduled(bg: BackgroundTasks) -> list[tuple[Any, dict[str, Any]]]:
    """(func, kwargs) for each task queued on a BackgroundTasks instance."""
    return [(t.func, t.kwargs) for t in bg.tasks]


# ---- from_manual: inline path -----------------------------------------------


@pytest.mark.asyncio
async def test_from_manual_matched_links_inline_defers_fit_score(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    """Matched → link inline (no fit yet), schedule the fit-score task only."""
    supabase = MagicMock()
    matched = _target(id="existing")
    monkeypatch.setattr(from_input, "find_matching_target", lambda _s, _l: matched)

    create_calls: list[TargetCreate] = []
    monkeypatch.setattr(
        crud,
        "create",
        lambda _s, *, payload: create_calls.append(payload) or matched,  # type: ignore[func-returns-value]
    )

    bg = BackgroundTasks()
    result = await from_input.from_manual(
        supabase,
        MagicMock(),
        bg,
        user_id="user-1",
        label="sr fe eng",
        description=None,
        payload=OptimizedPayload(),
    )

    assert result.was_matched is True
    assert result.target.id == "existing"
    # Inline: normalize only — no derive/fit/create.
    assert "normalize" in stub_llm_helpers.names()
    assert "derive_from_label" not in stub_llm_helpers.names()
    assert "fit_score" not in stub_llm_helpers.names()
    assert create_calls == []
    # Linked inactive with no fit score yet.
    link_kwargs = stub_crud.by_name("link")[0]
    assert link_kwargs["is_active"] is False
    assert link_kwargs["target_id"] == "existing"
    assert link_kwargs.get("fit_score") is None
    # Deferred: fit-score task only.
    scheduled = _scheduled(bg)
    assert len(scheduled) == 1
    func, kwargs = scheduled[0]
    assert func is from_input._apply_fit_score
    assert kwargs["target"].id == "existing"
    assert kwargs["user_id"] == "user-1"


@pytest.mark.asyncio
async def test_from_manual_new_creates_deriving_and_schedules_derivation(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    """New → create in 'deriving', link inline, schedule full derivation."""
    supabase = MagicMock()
    monkeypatch.setattr(from_input, "find_matching_target", lambda _s, _l: None)

    created = _target(id="new", label="Senior Frontend Engineer")
    create_calls: list[TargetCreate] = []
    monkeypatch.setattr(
        crud,
        "create",
        lambda _s, *, payload: create_calls.append(payload) or created,  # type: ignore[func-returns-value]
    )

    bg = BackgroundTasks()
    result = await from_input.from_manual(
        supabase,
        MagicMock(),
        bg,
        user_id="user-1",
        label="sr fe eng",
        description="frontend roles at growth-stage companies",
        payload=OptimizedPayload(),
    )

    assert result.was_matched is False
    assert result.target.id == "new"
    # Returned target carries the deriving status for the FE pending UI.
    assert result.target.activation_status == "deriving"
    # Inline: normalize only, no derive/fit.
    assert stub_llm_helpers.names().count("normalize") == 1
    assert "derive_from_label" not in stub_llm_helpers.names()
    assert "fit_score" not in stub_llm_helpers.names()
    # Created from the canonical suggestion (label + description), empty profile.
    assert len(create_calls) == 1
    assert create_calls[0].label == "Senior Frontend Engineer"
    assert create_calls[0].description == "Canonical description."
    assert create_calls[0].search_keywords == []
    # Status flipped to 'deriving' inline.
    update_call = stub_crud.by_name("update")[0]
    assert update_call["body"].activation_status == "deriving"
    # Linked inactive, no fit score yet.
    link_kwargs = stub_crud.by_name("link")[0]
    assert link_kwargs["target_id"] == "new"
    assert link_kwargs["is_active"] is False
    assert link_kwargs.get("fit_score") is None
    # Deferred: the manual derivation task.
    scheduled = _scheduled(bg)
    assert len(scheduled) == 1
    func, kwargs = scheduled[0]
    assert func is from_input.derive_manual_target_bg
    assert kwargs["target_id"] == "new"
    assert kwargs["label"] == "Senior Frontend Engineer"


# ---- derive_manual_target_bg: background path -------------------------------


@pytest.mark.asyncio
async def test_derive_manual_target_bg_derives_profile_and_fit(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    """Background: derive profile → status idle → fit score upserted."""
    supabase = MagicMock()

    await from_input.derive_manual_target_bg(
        supabase,
        MagicMock(),
        user_id="user-1",
        target_id="new",
        label="Senior Frontend Engineer",
        payload=OptimizedPayload(),
    )

    names = stub_llm_helpers.names()
    assert "derive_from_label" in names
    assert "fit_score" in names
    # Profile update sets keywords and flips status to idle.
    update_body: TargetUpdate = stub_crud.by_name("update")[0]["body"]
    assert update_body.search_keywords == ["frontend engineer"]
    assert update_body.activation_status == "idle"
    # Fit score upserted onto the link.
    link_kwargs = stub_crud.by_name("link")[0]
    assert link_kwargs["fit_score"] == 82
    assert link_kwargs["is_active"] is False
    # Cost logged for both deferred calls.
    purposes = [c["purpose"] for c in stub_llm_helpers.by_name("cost_log")]
    assert "target.derive_from_label" in purposes
    assert "target.fit_score" in purposes


@pytest.mark.asyncio
async def test_derive_manual_target_bg_marks_error_on_failure(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    """A failing derive flips the target to 'error' and never links a fit."""
    supabase = MagicMock()

    async def boom(llm, *, label, payload):  # type: ignore[no-untyped-def]
        raise RuntimeError("LLM down")

    monkeypatch.setattr(from_input, "derive_profile_from_label", boom)

    await from_input.derive_manual_target_bg(
        supabase,
        MagicMock(),
        user_id="user-1",
        target_id="new",
        label="Senior Frontend Engineer",
        payload=OptimizedPayload(),
    )

    update_bodies = [c["body"] for c in stub_crud.by_name("update")]
    assert any(b.activation_status == "error" for b in update_bodies)
    assert "fit_score" not in stub_llm_helpers.names()
    assert stub_crud.by_name("link") == []


# ---- from_url: inline path --------------------------------------------------


@pytest.mark.asyncio
async def test_from_url_matched_links_inline_defers_derivation(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    """Matched URL → link inline, schedule corpus-building derivation (is_new=False)."""
    supabase = MagicMock()
    matched = _target(id="existing", profile_version=4)
    monkeypatch.setattr(from_input, "find_matching_target", lambda _s, _l: matched)

    bg = BackgroundTasks()
    result = await from_input.from_url(
        supabase,
        MagicMock(),
        bg,
        user_id="user-1",
        final_url="https://example.com/jobs/123",
        extracted_title="Senior Frontend Engineer",
        jd_text="x" * 200,
        label_override=None,
        payload=OptimizedPayload(),
    )

    assert result.was_matched is True
    assert result.target.id == "existing"
    # No LLM call inline for the URL flow — neither derive nor fit.
    assert "derive_from_jd" not in stub_llm_helpers.names()
    assert "fit_score" not in stub_llm_helpers.names()
    link_kwargs = stub_crud.by_name("link")[0]
    assert link_kwargs["target_id"] == "existing"
    assert link_kwargs["is_active"] is False
    scheduled = _scheduled(bg)
    assert len(scheduled) == 1
    func, kwargs = scheduled[0]
    assert func is from_input.derive_url_target_bg
    assert kwargs["is_new"] is False
    assert kwargs["target_id"] == "existing"
    assert kwargs["jd_text"] == "x" * 200


@pytest.mark.asyncio
async def test_from_url_new_creates_deriving_and_schedules(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    """New URL → create in 'deriving', link, schedule derivation (is_new=True)."""
    supabase = MagicMock()
    monkeypatch.setattr(from_input, "find_matching_target", lambda _s, _l: None)

    created = _target(id="new", label="Senior Frontend Engineer")
    create_calls: list[TargetCreate] = []
    monkeypatch.setattr(
        crud,
        "create",
        lambda _s, *, payload: create_calls.append(payload) or created,  # type: ignore[func-returns-value]
    )

    bg = BackgroundTasks()
    result = await from_input.from_url(
        supabase,
        MagicMock(),
        bg,
        user_id="user-1",
        final_url="https://example.com/jobs/abc",
        extracted_title="Senior Frontend Engineer",
        jd_text="x" * 200,
        label_override=None,
        payload=OptimizedPayload(),
    )

    assert result.was_matched is False
    assert result.target.id == "new"
    assert result.target.activation_status == "deriving"
    assert "derive_from_jd" not in stub_llm_helpers.names()
    assert len(create_calls) == 1
    assert create_calls[0].label == "Senior Frontend Engineer"
    scheduled = _scheduled(bg)
    assert len(scheduled) == 1
    func, kwargs = scheduled[0]
    assert func is from_input.derive_url_target_bg
    assert kwargs["is_new"] is True
    assert kwargs["target_id"] == "new"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("label_override", "extracted_title", "expected"),
    [
        ("My Custom Label", "Different Extracted Title", "My Custom Label"),
        (None, "Extracted Title", "Extracted Title"),
        (None, None, "Untitled Target"),
    ],
)
async def test_from_url_label_resolution(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
    label_override: str | None,
    extracted_title: str | None,
    expected: str,
) -> None:
    """Label precedence: override > extracted title > 'Untitled Target'."""
    supabase = MagicMock()
    seen_labels: list[str] = []
    monkeypatch.setattr(
        from_input,
        "find_matching_target",
        lambda _s, label: seen_labels.append(label) or None,  # type: ignore[func-returns-value]
    )
    monkeypatch.setattr(crud, "create", lambda _s, *, payload: _target(id="new", label=expected))

    bg = BackgroundTasks()
    await from_input.from_url(
        supabase,
        MagicMock(),
        bg,
        user_id="user-1",
        final_url="https://example.com/jobs/x",
        extracted_title=extracted_title,
        jd_text="x" * 200,
        label_override=label_override,
        payload=OptimizedPayload(),
    )

    assert seen_labels == [expected]


# ---- derive_url_target_bg: background path -----------------------------------


@pytest.mark.asyncio
async def test_derive_url_target_bg_new_does_not_bump_version(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    """New URL target: derive JD → add ref → merge → status idle, version untouched."""
    supabase = MagicMock()

    add_ref_calls: list[dict[str, Any]] = []
    monkeypatch.setattr(
        crud,
        "add_reference_jd",
        lambda _s, **kw: (
            add_ref_calls.append(kw)
            or _ref_jd(**{"target_id": kw["target_id"], "jd_url": kw["jd_url"]})
        ),  # type: ignore[func-returns-value]
    )
    monkeypatch.setattr(crud, "list_reference_jds", lambda _s, _t: [_ref_jd(target_id="new")])
    monkeypatch.setattr(crud, "get", lambda _s, _id: _target(id="new"))
    monkeypatch.setattr(from_input, "merge_profiles", lambda _p: ScoringProfile())

    await from_input.derive_url_target_bg(
        supabase,
        MagicMock(),
        user_id="user-1",
        target_id="new",
        jd_text="x" * 200,
        final_url="https://example.com/jobs/abc",
        payload=OptimizedPayload(),
        is_new=True,
    )

    assert "derive_from_jd" in stub_llm_helpers.names()
    assert add_ref_calls and add_ref_calls[0]["target_id"] == "new"
    update_body: TargetUpdate = stub_crud.by_name("update")[0]["body"]
    assert update_body.activation_status == "idle"
    assert update_body.profile_version is None  # new → no bump
    # Fit score follows.
    assert stub_crud.by_name("link")[0]["fit_score"] == 82


@pytest.mark.asyncio
async def test_derive_url_target_bg_matched_bumps_version(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    """Matched URL target: profile_version bumps from the current value."""
    supabase = MagicMock()

    monkeypatch.setattr(crud, "add_reference_jd", lambda _s, **kw: _ref_jd())
    monkeypatch.setattr(
        crud,
        "list_reference_jds",
        lambda _s, _t: [_ref_jd(target_id="existing"), _ref_jd(target_id="existing")],
    )
    monkeypatch.setattr(crud, "get", lambda _s, _id: _target(id="existing", profile_version=4))
    monkeypatch.setattr(from_input, "merge_profiles", lambda _p: ScoringProfile())

    await from_input.derive_url_target_bg(
        supabase,
        MagicMock(),
        user_id="user-1",
        target_id="existing",
        jd_text="x" * 200,
        final_url="https://example.com/jobs/123",
        payload=OptimizedPayload(),
        is_new=False,
    )

    update_body: TargetUpdate = stub_crud.by_name("update")[0]["body"]
    assert update_body.profile_version == 5  # bumped from 4
    assert update_body.activation_status == "idle"


@pytest.mark.asyncio
async def test_derive_url_target_bg_marks_error_on_failure(
    monkeypatch: pytest.MonkeyPatch,
    stub_llm_helpers: _Recorder,
    stub_crud: _Recorder,
) -> None:
    supabase = MagicMock()

    async def boom(llm, *, jd_text):  # type: ignore[no-untyped-def]
        raise RuntimeError("LLM down")

    monkeypatch.setattr(from_input, "derive_profile_from_jd", boom)

    await from_input.derive_url_target_bg(
        supabase,
        MagicMock(),
        user_id="user-1",
        target_id="new",
        jd_text="x" * 200,
        final_url="https://example.com/jobs/abc",
        payload=OptimizedPayload(),
        is_new=True,
    )

    update_bodies = [c["body"] for c in stub_crud.by_name("update")]
    assert any(b.activation_status == "error" for b in update_bodies)
    assert stub_crud.by_name("link") == []
