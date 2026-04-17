from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_supabase, verify_api_key_or_session
from app.main import app
from app.seed.company_seed import COMPANY_SEED


class _Resp:
    def __init__(self, data: Any) -> None:
        self.data = data


@pytest.fixture
def client_factory():
    def _make(supabase: MagicMock, *, authed: bool = True) -> TestClient:
        app.dependency_overrides[get_supabase] = lambda: supabase
        if authed:
            app.dependency_overrides[verify_api_key_or_session] = lambda: "test"
        return TestClient(app)

    yield _make
    app.dependency_overrides.clear()


def test_sources_unauth_returns_401():
    client = TestClient(app)
    r = client.post("/sources", json={"action": "add", "board_token": "foo", "company_name": "F"})
    assert r.status_code == 401


def test_sources_add_calls_upsert(client_factory):
    sb = MagicMock()
    sb.table.return_value.upsert.return_value.execute.return_value = _Resp(
        [{"id": "1", "board_token": "foo", "company_name": "Foo"}]
    )
    client = client_factory(sb)
    r = client.post(
        "/sources",
        json={"action": "add", "board_token": "foo", "company_name": "Foo"},
    )
    assert r.status_code == 200
    assert r.json()["success"] is True
    sb.table.assert_any_call("job_sources")
    sb.table.return_value.upsert.assert_called_once()
    args, kwargs = sb.table.return_value.upsert.call_args
    assert args[0] == {"board_token": "foo", "company_name": "Foo", "provider": "greenhouse"}
    assert kwargs.get("on_conflict") == "board_token"


def test_sources_remove_calls_delete(client_factory):
    sb = MagicMock()
    sb.table.return_value.delete.return_value.eq.return_value.execute.return_value = _Resp(None)
    client = client_factory(sb)
    r = client.post("/sources", json={"action": "remove", "board_token": "foo"})
    assert r.status_code == 200
    assert r.json()["success"] is True
    sb.table.return_value.delete.return_value.eq.assert_called_with("board_token", "foo")


def test_sources_toggle_flips_enabled(client_factory):
    sb = MagicMock()
    (
        sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
    ) = _Resp({"enabled": True})
    sb.table.return_value.update.return_value.eq.return_value.execute.return_value = _Resp(None)
    client = client_factory(sb)
    r = client.post("/sources", json={"action": "toggle", "board_token": "foo"})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["enabled"] is False
    sb.table.return_value.update.assert_called_with({"enabled": False})


def test_sources_seed_inserts_all(client_factory):
    sb = MagicMock()
    sb.table.return_value.upsert.return_value.execute.return_value = _Resp(None)
    client = client_factory(sb)
    r = client.post("/sources/seed")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["seeded"] == len(COMPANY_SEED)
    assert sb.table.return_value.upsert.call_count == len(COMPANY_SEED)
