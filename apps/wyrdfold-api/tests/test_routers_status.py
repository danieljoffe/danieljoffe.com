from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_supabase, verify_api_key_or_session
from app.main import app


class _Resp:
    def __init__(self, data: Any) -> None:
        self.data = data


def _build_supabase(posting_data: dict[str, Any] | None) -> MagicMock:
    sb = MagicMock()
    # .table("jobs").select("status").eq("id", id).single().execute()
    select_chain = sb.table.return_value.select.return_value.eq.return_value.single
    select_chain.return_value.execute.return_value = _Resp(posting_data)
    # insert, update, and delete are chain-called; default MagicMock return is fine
    sb.table.return_value.insert.return_value.execute.return_value = _Resp(None)
    sb.table.return_value.update.return_value.eq.return_value.execute.return_value = _Resp(None)
    delete_data = [posting_data] if posting_data else None
    delete_chain = sb.table.return_value.delete.return_value.eq.return_value
    delete_chain.execute.return_value = _Resp(delete_data)
    return sb


@pytest.fixture
def client_factory():
    def _make(supabase: MagicMock, *, authed: bool = True) -> TestClient:
        app.dependency_overrides[get_supabase] = lambda: supabase
        if authed:
            app.dependency_overrides[verify_api_key_or_session] = lambda: "test"
        c = TestClient(app)
        return c

    yield _make
    app.dependency_overrides.clear()


def test_status_unauth_returns_401():
    # No override for auth dep — should 401 via real dependency.
    client = TestClient(app)
    r = client.post("/jobs/abc/status", json={"status": "new"})
    assert r.status_code == 401


def test_status_404_when_posting_missing(client_factory):
    sb = _build_supabase(posting_data=None)
    client = client_factory(sb)
    r = client.post("/jobs/abc/status", json={"status": "new"})
    assert r.status_code == 404


def test_status_200_on_valid_update(client_factory):
    sb = _build_supabase(posting_data={"status": "saved"})
    client = client_factory(sb)
    r = client.post("/jobs/abc/status", json={"status": "applied", "note": "sent"})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["old_status"] == "saved"
    assert body["new_status"] == "applied"


def test_status_422_on_invalid_status(client_factory):
    sb = _build_supabase(posting_data={"status": "new"})
    client = client_factory(sb)
    r = client.post("/jobs/abc/status", json={"status": "bogus"})
    assert r.status_code == 422


# --- DELETE /jobs/{posting_id} ---


def test_delete_unauth_returns_401():
    client = TestClient(app)
    r = client.delete("/jobs/abc")
    assert r.status_code == 401


def test_delete_404_when_posting_missing(client_factory):
    sb = _build_supabase(posting_data=None)
    client = client_factory(sb)
    r = client.delete("/jobs/abc")
    assert r.status_code == 404


def test_delete_200_on_valid_delete(client_factory):
    sb = _build_supabase(posting_data={"id": "abc"})
    client = client_factory(sb)
    r = client.delete("/jobs/abc")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["deleted_id"] == "abc"
