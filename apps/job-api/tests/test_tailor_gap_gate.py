"""Tests for the gap gate on resume/cover-letter generation (#498)."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_supabase, verify_api_key_or_session
from app.main import app
from app.models.experience import OptimizedDoc, OptimizedPayload, Role, Skill

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


def _incomplete_payload() -> OptimizedPayload:
    """Payload with high gap percentage (>45%)."""
    return OptimizedPayload(
        roles=[
            Role(
                id="a",
                company="Acme",
                title="Eng",
                start="2020-01",
                end=None,
                summary=None,
                skills=[],
                outcome_refs=[],
            ),
        ],
        skills=[Skill(name="React")],
    )


def _complete_payload() -> OptimizedPayload:
    """Payload with 0% gaps."""
    from app.models.experience import Outcome

    return OptimizedPayload(
        summary="Senior engineer.",
        roles=[
            Role(
                id="a",
                company="Acme",
                title="Eng",
                start="2020-01",
                end="2024-01",
                summary="Built things.",
                skills=["React"],
                outcome_refs=["x"],
            ),
        ],
        outcomes=[
            Outcome(description="Cut LCP", metric="LCP", value="2s", role_ref="a"),
        ],
        skills=[Skill(name="React", evidence_refs=["a"])],
    )


class TestGapGateResume:
    @pytest.fixture(autouse=True)
    def _overrides(self):
        app.dependency_overrides[verify_api_key_or_session] = lambda: "test"
        app.dependency_overrides[get_supabase] = lambda: MagicMock()
        yield
        app.dependency_overrides.clear()

    @patch("app.routers.tailor.optimized")
    def test_resume_blocked_when_gaps_above_threshold(
        self, mock_opt: MagicMock
    ) -> None:
        mock_opt.get_latest.return_value = _optimized_doc(_incomplete_payload())
        resp = client.post(
            "/tailor/resume",
            json={
                "job_description": "Build things.",
                "contact": {"name": "Test User"},
            },
        )
        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert detail["code"] == "gap_gate"
        assert detail["gap_pct"] > 45.0

    def test_resume_allowed_when_gaps_below_threshold(self) -> None:
        """Gate should not fire when payload is complete."""
        from app.services.experience.gap_tracker import gap_health

        payload = _complete_payload()
        health = gap_health(payload)
        assert health.gap_pct <= 45.0

    @patch("app.routers.tailor.optimized")
    def test_cover_letter_blocked_when_gaps_above_threshold(
        self, mock_opt: MagicMock
    ) -> None:
        mock_opt.get_latest.return_value = _optimized_doc(_incomplete_payload())
        resp = client.post(
            "/tailor/cover-letter",
            json={
                "job_description": "Build things.",
                "company_name": "Acme",
                "contact": {"name": "Test User"},
            },
        )
        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert detail["code"] == "gap_gate"
