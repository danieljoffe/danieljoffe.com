"""Router tests for /profile/resume-style."""

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
    sb.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = _Resp(
        [row]
    )


def test_get_returns_defaults_when_unset(client_factory):
    sb = MagicMock()
    _select_returns(sb, {"resume_style_settings": None})
    client = client_factory(sb)
    r = client.get("/profile/resume-style")
    assert r.status_code == 200
    assert r.json() == {"preset": "modern", "accent": "slate"}


def test_get_returns_stored_style(client_factory):
    sb = MagicMock()
    _select_returns(
        sb, {"resume_style_settings": {"preset": "classic", "accent": "navy"}}
    )
    client = client_factory(sb)
    r = client.get("/profile/resume-style")
    assert r.status_code == 200
    assert r.json() == {"preset": "classic", "accent": "navy"}


def test_patch_merges_single_axis_onto_stored(client_factory):
    sb = MagicMock()
    _select_returns(
        sb, {"resume_style_settings": {"preset": "compact", "accent": "slate"}}
    )
    sb.table.return_value.update.return_value.eq.return_value.execute.return_value = _Resp(
        None
    )
    client = client_factory(sb)
    r = client.patch("/profile/resume-style", json={"accent": "forest"})
    assert r.status_code == 200
    # preset preserved, accent changed
    assert r.json() == {"preset": "compact", "accent": "forest"}
    # persisted as the full merged object
    update_arg = sb.table.return_value.update.call_args[0][0]
    assert update_arg == {
        "resume_style_settings": {"preset": "compact", "accent": "forest"}
    }


def test_patch_empty_body_returns_current_without_writing(client_factory):
    sb = MagicMock()
    _select_returns(
        sb, {"resume_style_settings": {"preset": "executive", "accent": "black"}}
    )
    client = client_factory(sb)
    r = client.patch("/profile/resume-style", json={})
    assert r.status_code == 200
    assert r.json() == {"preset": "executive", "accent": "black"}
    sb.table.return_value.update.assert_not_called()


def test_patch_rejects_unknown_preset(client_factory):
    sb = MagicMock()
    client = client_factory(sb)
    r = client.patch("/profile/resume-style", json={"preset": "bogus"})
    assert r.status_code == 422
