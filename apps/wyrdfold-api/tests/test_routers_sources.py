from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_supabase, verify_api_key_or_jwt
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
            app.dependency_overrides[verify_api_key_or_jwt] = lambda: "test"
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
    sb.table.assert_any_call("sources")
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
    assert sb.table.return_value.upsert.call_count == 1
    call_args, call_kwargs = sb.table.return_value.upsert.call_args
    assert len(call_args[0]) == len(COMPANY_SEED)
    assert call_kwargs["on_conflict"] == "board_token"


# --- GET /sources/verify ---


def test_verify_unauth_returns_401():
    client = TestClient(app)
    r = client.get("/sources/verify", params={"board_token": "stripe"})
    assert r.status_code == 401


def test_verify_valid_token(client_factory):
    sb = MagicMock()
    client = client_factory(sb)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"name": "Stripe"}

    mock_http = AsyncMock()
    mock_http.get.return_value = mock_resp
    mock_http.__aenter__ = AsyncMock(return_value=mock_http)
    mock_http.__aexit__ = AsyncMock(return_value=False)

    with patch("app.routers.sources.httpx.AsyncClient", return_value=mock_http):
        r = client.get("/sources/verify", params={"board_token": "stripe"})

    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is True
    assert body["company_name"] == "Stripe"


def test_verify_invalid_token(client_factory):
    sb = MagicMock()
    client = client_factory(sb)

    mock_resp = MagicMock()
    mock_resp.status_code = 404

    mock_http = AsyncMock()
    mock_http.get.return_value = mock_resp
    mock_http.__aenter__ = AsyncMock(return_value=mock_http)
    mock_http.__aexit__ = AsyncMock(return_value=False)

    with patch("app.routers.sources.httpx.AsyncClient", return_value=mock_http):
        r = client.get("/sources/verify", params={"board_token": "nonexistent"})

    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is False


def test_verify_network_error(client_factory):
    sb = MagicMock()
    client = client_factory(sb)

    mock_http = AsyncMock()
    mock_http.get.side_effect = httpx.HTTPError("Connection failed")
    mock_http.__aenter__ = AsyncMock(return_value=mock_http)
    mock_http.__aexit__ = AsyncMock(return_value=False)

    with patch("app.routers.sources.httpx.AsyncClient", return_value=mock_http):
        r = client.get("/sources/verify", params={"board_token": "stripe"})

    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is False


def test_verify_rejects_invalid_format(client_factory):
    sb = MagicMock()
    client = client_factory(sb)
    r = client.get("/sources/verify", params={"board_token": "INVALID TOKEN!!"})
    assert r.status_code == 422


# --- GET /sources/detect ---


def test_detect_unauth_returns_401():
    client = TestClient(app)
    r = client.get("/sources/detect", params={"q": "stripe"})
    assert r.status_code == 401


def test_detect_found(client_factory):
    sb = MagicMock()
    client = client_factory(sb)

    from app.services.ats_detect import DetectResult

    mock_result = DetectResult(
        provider="greenhouse", board_token="stripe", company_name="Stripe", job_count=42
    )

    with patch("app.routers.sources.detect_ats", return_value=mock_result):
        r = client.get("/sources/detect", params={"q": "stripe"})

    assert r.status_code == 200
    body = r.json()
    assert body["found"] is True
    assert body["provider"] == "greenhouse"
    assert body["board_token"] == "stripe"
    assert body["company_name"] == "Stripe"
    assert body["job_count"] == 42


def test_detect_not_found(client_factory):
    sb = MagicMock()
    client = client_factory(sb)

    with patch("app.routers.sources.detect_ats", return_value=None):
        r = client.get("/sources/detect", params={"q": "nonexistent-xyz"})

    assert r.status_code == 200
    body = r.json()
    assert body["found"] is False


def test_detect_rejects_empty_query(client_factory):
    sb = MagicMock()
    client = client_factory(sb)
    r = client.get("/sources/detect", params={"q": ""})
    assert r.status_code == 422
