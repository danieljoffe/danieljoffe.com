"""Router tests for /profile/onboarding/*.

Covers the three endpoints shipped in
plan-wyrdfold-onboarding-completion-tracking.md PR:

- GET  /profile/onboarding         — read status
- PATCH /profile/onboarding/step   — set current_step / path
- POST /profile/onboarding/complete — set completed_at (idempotent)

Schema-level only — we mock Supabase. The actual SQL behaviour is
covered by the migration's Supabase Preview check.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.dependencies import (
    get_current_user_email,
    get_current_user_id,
    get_supabase,
    verify_supabase_jwt,
)
from app.main import app


class _Resp:
    def __init__(self, data: Any) -> None:
        self.data = data


_TEST_USER_ID = "00000000-0000-0000-0000-000000000001"


@pytest.fixture
def client_factory():
    def _make(supabase: MagicMock) -> TestClient:
        app.dependency_overrides[get_supabase] = lambda: supabase
        app.dependency_overrides[verify_supabase_jwt] = lambda: _TEST_USER_ID
        app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID
        app.dependency_overrides[get_current_user_email] = lambda: None
        return TestClient(app)

    yield _make
    app.dependency_overrides.clear()


def _select_returns(sb: MagicMock, row: dict[str, Any]) -> None:
    """Match the .select(...).eq(...).limit(...).execute() chain used by
    _get_or_create_profile."""
    sb.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = _Resp(
        [row]
    )


# ---- GET /profile/onboarding -----------------------------------------


def test_get_returns_null_fields_for_brand_new_user(client_factory):
    sb = MagicMock()
    _select_returns(
        sb,
        {
            "onboarding_completed_at": None,
            "onboarding_path": None,
            "onboarding_current_step": None,
        },
    )
    client = client_factory(sb)
    r = client.get("/profile/onboarding")
    assert r.status_code == 200
    assert r.json() == {
        "completed_at": None,
        "path": None,
        "current_step": None,
    }


def test_get_returns_stored_progress(client_factory):
    sb = MagicMock()
    _select_returns(
        sb,
        {
            "onboarding_completed_at": "2026-06-04T12:00:00+00:00",
            "onboarding_path": "A",
            "onboarding_current_step": "completion",
        },
    )
    client = client_factory(sb)
    r = client.get("/profile/onboarding")
    assert r.status_code == 200
    body = r.json()
    assert body["completed_at"] is not None
    assert body["path"] == "A"
    assert body["current_step"] == "completion"


def test_get_falls_back_to_none_on_unknown_step(client_factory):
    """An old wizard version persisting a step we no longer support
    shouldn't 500 the dashboard — it sits on the critical path. The
    read helper sanitizes unknown values into None so the wizard
    treats it as "start fresh." This is graceful degradation by
    design."""
    sb = MagicMock()
    _select_returns(
        sb,
        {
            "onboarding_completed_at": None,
            "onboarding_path": "X",
            "onboarding_current_step": "step-from-the-future",
        },
    )
    client = client_factory(sb)
    r = client.get("/profile/onboarding")
    assert r.status_code == 200
    body = r.json()
    assert body["current_step"] is None
    assert body["path"] is None


# ---- PATCH /profile/onboarding/step ----------------------------------


def test_patch_step_writes_only_current_step(client_factory):
    sb = MagicMock()
    _select_returns(
        sb,
        {
            "onboarding_completed_at": None,
            "onboarding_path": "A",
            "onboarding_current_step": "identity",
        },
    )
    client = client_factory(sb)
    r = client.patch("/profile/onboarding/step", json={"current_step": "identity"})

    assert r.status_code == 200
    update_call = sb.table.return_value.update.call_args
    assert update_call is not None
    assert update_call.args[0] == {"onboarding_current_step": "identity"}


def test_patch_step_writes_both_path_and_step(client_factory):
    sb = MagicMock()
    _select_returns(
        sb,
        {
            "onboarding_completed_at": None,
            "onboarding_path": "B",
            "onboarding_current_step": "identity",
        },
    )
    client = client_factory(sb)
    r = client.patch(
        "/profile/onboarding/step",
        json={"path": "B", "current_step": "identity"},
    )

    assert r.status_code == 200
    update_call = sb.table.return_value.update.call_args
    assert update_call.args[0] == {
        "onboarding_path": "B",
        "onboarding_current_step": "identity",
    }


def test_patch_step_rejects_unknown_step_value(client_factory):
    sb = MagicMock()
    _select_returns(
        sb,
        {
            "onboarding_completed_at": None,
            "onboarding_path": None,
            "onboarding_current_step": None,
        },
    )
    client = client_factory(sb)
    r = client.patch(
        "/profile/onboarding/step", json={"current_step": "imaginary-step"}
    )
    assert r.status_code == 422


def test_patch_step_rejects_unknown_path_value(client_factory):
    sb = MagicMock()
    _select_returns(
        sb,
        {
            "onboarding_completed_at": None,
            "onboarding_path": None,
            "onboarding_current_step": None,
        },
    )
    client = client_factory(sb)
    r = client.patch("/profile/onboarding/step", json={"path": "Z"})
    assert r.status_code == 422


def test_patch_step_with_empty_body_no_op(client_factory):
    """No fields supplied → no update query fires; current state is
    returned unchanged. Idempotent re-call safety."""
    sb = MagicMock()
    _select_returns(
        sb,
        {
            "onboarding_completed_at": None,
            "onboarding_path": "A",
            "onboarding_current_step": "identity",
        },
    )
    client = client_factory(sb)
    r = client.patch("/profile/onboarding/step", json={})
    assert r.status_code == 200
    sb.table.return_value.update.assert_not_called()


# ---- POST /profile/onboarding/complete -------------------------------


def test_complete_sets_timestamp_when_null(client_factory):
    sb = MagicMock()
    _select_returns(
        sb,
        {
            "onboarding_completed_at": None,
            "onboarding_path": "A",
            "onboarding_current_step": "pick-targets",
        },
    )
    client = client_factory(sb)
    r = client.post("/profile/onboarding/complete")

    assert r.status_code == 200
    update_call = sb.table.return_value.update.call_args
    payload = update_call.args[0]
    assert payload["onboarding_current_step"] == "completion"
    assert "onboarding_completed_at" in payload  # timestamp written


def test_complete_is_idempotent_on_already_completed_users(client_factory):
    """Calling complete twice doesn't overwrite the original timestamp.
    Earlier completion is the source of truth for 'when did this user
    actually onboard.'"""
    sb = MagicMock()
    _select_returns(
        sb,
        {
            "onboarding_completed_at": datetime(2026, 6, 1, tzinfo=UTC).isoformat(),
            "onboarding_path": "A",
            "onboarding_current_step": "completion",
        },
    )
    client = client_factory(sb)
    r = client.post("/profile/onboarding/complete")

    assert r.status_code == 200
    payload = sb.table.return_value.update.call_args.args[0]
    assert payload["onboarding_current_step"] == "completion"
    assert "onboarding_completed_at" not in payload  # not overwritten
