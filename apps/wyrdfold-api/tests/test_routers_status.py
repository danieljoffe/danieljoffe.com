from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.dependencies import (
    get_current_user_id,
    get_supabase,
    verify_api_key_or_jwt,
    verify_supabase_jwt,
)
from app.main import app


class _Resp:
    def __init__(self, data: Any) -> None:
        self.data = data


_TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
_TEST_TARGET_ID = "11111111-1111-1111-1111-111111111111"


def _build_supabase(
    posting_data: dict[str, Any] | None,
    *,
    owns_posting: bool = True,
) -> MagicMock:
    """Mock supabase chain for status + delete routes.

    Status uses `_assert_user_owns_posting` which:
      1. table("jobs").select(...).eq("id", id).single().execute()
      2. table("user_targets").select(...).eq.eq.limit(1).execute()
    Delete uses the jobs router's own `_assert_user_owns_posting` which
    differs slightly: it uses .limit(1) instead of .single(). Mock both.
    """
    sb = MagicMock()
    posting_with_target = (
        {**posting_data, "target_id": _TEST_TARGET_ID, "id": "abc"}
        if posting_data is not None
        else None
    )

    def _table(name: str):
        t = MagicMock()
        if name == "jobs":
            sel = t.select.return_value
            # status.py uses .single().execute()
            sel.eq.return_value.single.return_value.execute.return_value = _Resp(
                posting_with_target
            )
            # jobs.py delete/get use .limit(1).execute()
            sel.eq.return_value.limit.return_value.execute.return_value = _Resp(
                [posting_with_target] if posting_with_target else None
            )
            t.insert.return_value.execute.return_value = _Resp(None)
            t.update.return_value.eq.return_value.execute.return_value = _Resp(None)
            delete_chain = t.delete.return_value.eq.return_value
            delete_chain.execute.return_value = _Resp(
                [posting_with_target] if posting_with_target else None
            )
        elif name == "user_targets":
            link_data = (
                [{"target_id": _TEST_TARGET_ID}]
                if owns_posting and posting_with_target
                else []
            )
            t.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = _Resp(
                link_data
            )
        elif name == "status_log":
            t.insert.return_value.execute.return_value = _Resp(None)
        return t

    sb.table.side_effect = _table
    return sb


@pytest.fixture
def client_factory():
    def _make(supabase: MagicMock, *, authed: bool = True) -> TestClient:
        app.dependency_overrides[get_supabase] = lambda: supabase
        if authed:
            app.dependency_overrides[verify_api_key_or_jwt] = lambda: "test"
            app.dependency_overrides[verify_supabase_jwt] = lambda: _TEST_USER_ID
            app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID
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


def test_status_update_only_evicts_owning_target_and_global_views(client_factory):
    """Sibling targets' cached pages must survive a status mutation."""
    from app.cache import job_list_cache, jobs_cache_prefix, make_cache_key

    sibling_target = "22222222-2222-2222-2222-222222222222"
    owning_key = make_cache_key(
        jobs_cache_prefix(target_id=_TEST_TARGET_ID), page=1
    )
    sibling_key = make_cache_key(
        jobs_cache_prefix(target_id=sibling_target), page=1
    )
    global_key = make_cache_key(jobs_cache_prefix(target_id=None), page=1)

    job_list_cache.set(owning_key, {"v": "owning"})
    job_list_cache.set(sibling_key, {"v": "sibling"})
    job_list_cache.set(global_key, {"v": "global"})

    sb = _build_supabase(posting_data={"status": "saved"})
    client = client_factory(sb)
    r = client.post("/jobs/abc/status", json={"status": "applied"})
    assert r.status_code == 200

    assert job_list_cache.get(owning_key) is None
    assert job_list_cache.get(global_key) is None
    assert job_list_cache.get(sibling_key) == {"v": "sibling"}


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
