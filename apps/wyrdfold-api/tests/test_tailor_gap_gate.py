"""Tests for the structural gap gate on resume/cover-letter generation (#498)."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_supabase, verify_api_key_or_jwt
from app.main import app
from app.models.experience import (
    OptimizedDoc,
    OptimizedPayload,
    Outcome,
    Role,
    Skill,
)

client = TestClient(app, headers={"host": "localhost"})


def _optimized_doc(payload: OptimizedPayload) -> OptimizedDoc:
    return OptimizedDoc(
        id="opt-1",
        user_id=None,
        prose_doc_id="p-1",
        version=1,
        payload=payload,
        markdown_view=None,
        source="llm",
        created_at="2026-01-01T00:00:00Z",
    )


def _no_roles_payload() -> OptimizedPayload:
    return OptimizedPayload(summary="Senior engineer.")


def _insufficient_outcomes_payload() -> OptimizedPayload:
    """3 roles, 2 without outcomes — majority lack outcomes."""
    return OptimizedPayload(
        roles=[
            Role(id="a", company="A", title="Eng", start="2020-01", end="2022-01", summary="s", skills=[], outcome_refs=["x"]),
            Role(id="b", company="B", title="Eng", start="2018-01", end="2019-12", summary="s", skills=[], outcome_refs=[]),
            Role(id="c", company="C", title="Eng", start="2016-01", end="2017-12", summary="s", skills=[], outcome_refs=[]),
        ],
    )


def _high_gap_pct_but_structural_ok() -> OptimizedPayload:
    """All roles have outcomes, but missing summaries/metrics/evidence.
    Should NOT be blocked by the structural gate."""
    return OptimizedPayload(
        roles=[
            Role(id="a", company="A", title="Eng", start="2020-01", end=None, summary=None, skills=[], outcome_refs=["x"]),
        ],
        outcomes=[Outcome(description="Did things", metric=None, value=None, role_ref="a")],
        skills=[Skill(name="React"), Skill(name="TS")],
    )


class TestGapGateResume:
    @pytest.fixture(autouse=True)
    def _overrides(self):
        app.dependency_overrides[verify_api_key_or_jwt] = lambda: "test"
        app.dependency_overrides[get_supabase] = lambda: MagicMock()
        yield
        app.dependency_overrides.clear()

    @patch("app.routers.tailor.optimized")
    def test_resume_blocked_when_no_roles(self, mock_opt: MagicMock) -> None:
        mock_opt.get_latest.return_value = _optimized_doc(_no_roles_payload())
        resp = client.post(
            "/tailor/resume",
            json={"job_description": "Build things.", "contact": {"name": "Test"}},
        )
        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert detail["code"] == "gap_gate"
        assert detail["reason"] == "no_roles"

    @patch("app.routers.tailor.optimized")
    def test_resume_blocked_when_insufficient_outcomes(self, mock_opt: MagicMock) -> None:
        mock_opt.get_latest.return_value = _optimized_doc(_insufficient_outcomes_payload())
        resp = client.post(
            "/tailor/resume",
            json={"job_description": "Build things.", "contact": {"name": "Test"}},
        )
        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert detail["code"] == "gap_gate"
        assert detail["reason"] == "insufficient_outcomes"

    def test_gate_passes_with_high_gap_pct_but_structural_ok(self) -> None:
        """High gap_pct should NOT block when structural minimums are met."""
        from app.services.experience.gap_tracker import can_generate, gap_health

        payload = _high_gap_pct_but_structural_ok()
        assert gap_health(payload).gap_pct > 25
        assert can_generate(payload).ok

    @patch("app.routers.tailor.optimized")
    def test_cover_letter_blocked_when_no_roles(self, mock_opt: MagicMock) -> None:
        mock_opt.get_latest.return_value = _optimized_doc(_no_roles_payload())
        resp = client.post(
            "/tailor/cover-letter",
            json={
                "job_description": "Build things.",
                "company_name": "Acme",
                "contact": {"name": "Test"},
            },
        )
        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert detail["code"] == "gap_gate"
        assert detail["reason"] == "no_roles"
