"""Tests for resume lifecycle: edit, approve, export-zip, get-by-job (#505)."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from app.models.ats_lint import LintResult
from app.models.tailor import (
    BulkExportRequest,
    ContactInfo,
    ResumeEditRequest,
    TailoredBullet,
    TailoredResume,
    TailoredResumeRecord,
    TailoredRole,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOW = datetime.now(UTC)

_CONTACT = ContactInfo(name="Daniel Joffe", email="d@example.com")

_RESUME = TailoredResume(
    summary="Original summary",
    contact=_CONTACT,
    experience=[
        TailoredRole(
            company="Acme",
            title="Engineer",
            start="2023-01",
            end="2024-01",
            bullets=[TailoredBullet(text="Built things", source_outcome_ref="o-1")],
            source_role_ref="role-1",
        ),
    ],
    skills=["Python", "TypeScript"],
)


def _make_record(
    *,
    approved_at: datetime | None = None,
    document_type: str = "resume",
    storage_path: str | None = "anon/rec-1.docx",
    job_posting_id: str | None = "job-1",
) -> TailoredResumeRecord:
    return TailoredResumeRecord(
        id="rec-1",
        user_id=None,
        job_posting_id=job_posting_id,
        document_type=document_type,
        resume_type="generic",
        jd_snapshot="JD text",
        jd_snapshot_hash="abc123",
        payload=_RESUME.model_dump(),
        storage_path=storage_path,
        warnings=[],
        model="claude-sonnet-4-6",
        input_tokens=100,
        output_tokens=50,
        cost_usd=0.001,
        latency_ms=50,
        created_at=_NOW,
        approved_at=approved_at,
    )


# ---------------------------------------------------------------------------
# Model validation
# ---------------------------------------------------------------------------


class TestResumeEditRequestValidation:
    def test_valid_markdown(self) -> None:
        req = ResumeEditRequest(markdown="# Daniel\n\n## Experience\n\n- did things")
        assert req.markdown.startswith("# Daniel")

    def test_rejects_empty_markdown(self) -> None:
        with pytest.raises(ValidationError):
            ResumeEditRequest(markdown="")

    def test_rejects_too_long_markdown(self) -> None:
        with pytest.raises(ValidationError):
            ResumeEditRequest(markdown="x" * 50_001)


class TestBulkExportRequestValidation:
    def test_valid_request(self) -> None:
        req = BulkExportRequest(resume_ids=["r-1", "r-2"])
        assert len(req.resume_ids) == 2

    def test_rejects_empty_list(self) -> None:
        with pytest.raises(ValidationError):
            BulkExportRequest(resume_ids=[])

    def test_rejects_over_20(self) -> None:
        with pytest.raises(ValidationError):
            BulkExportRequest(resume_ids=[f"r-{i}" for i in range(21)])


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------


class TestPersistenceHelpers:
    def test_update_payload(self) -> None:
        from app.services.tailor.persistence import update_payload

        supabase = MagicMock()
        updated_record = _make_record()
        supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            updated_record.model_dump(mode="json")
        ]

        result = update_payload(supabase, "rec-1", {"summary": "Updated"})
        assert result.id == "rec-1"
        supabase.table.assert_called_with("tailored_resumes")

    def test_update_payload_with_storage_path(self) -> None:
        from app.services.tailor.persistence import update_payload

        supabase = MagicMock()
        updated_record = _make_record()
        supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            updated_record.model_dump(mode="json")
        ]

        result = update_payload(
            supabase, "rec-1", {"summary": "Updated"}, storage_path="anon/rec-1.docx"
        )
        assert result.id == "rec-1"
        # Verify the update call included storage_path
        call_args = supabase.table.return_value.update.call_args
        assert call_args[0][0]["storage_path"] == "anon/rec-1.docx"

    def test_approve(self) -> None:
        from app.services.tailor.persistence import approve

        supabase = MagicMock()
        approved_record = _make_record(approved_at=_NOW)
        supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            approved_record.model_dump(mode="json")
        ]

        result = approve(supabase, "rec-1")
        assert result.id == "rec-1"
        assert result.approved_at is not None

    def test_get_by_job_found(self) -> None:
        from app.services.tailor.persistence import get_by_job

        supabase = MagicMock()
        record = _make_record()
        chain = supabase.table.return_value.select.return_value
        chain = chain.eq.return_value.eq.return_value
        chain.order.return_value.limit.return_value.execute.return_value.data = [
            record.model_dump(mode="json")
        ]

        result = get_by_job(supabase, "job-1")
        assert result is not None
        assert result.id == "rec-1"

    def test_get_by_job_not_found(self) -> None:
        from app.services.tailor.persistence import get_by_job

        supabase = MagicMock()
        chain = supabase.table.return_value.select.return_value
        chain = chain.eq.return_value.eq.return_value
        chain.order.return_value.limit.return_value.execute.return_value.data = []

        result = get_by_job(supabase, "nonexistent")
        assert result is None

    def test_mark_job_resume_draft_updates_status(self) -> None:
        from app.services.tailor.persistence import mark_job_resume_draft

        supabase = MagicMock()
        mark_job_resume_draft(supabase, "job-42")

        supabase.table.assert_called_with("job_postings")
        update_call = supabase.table.return_value.update.call_args
        payload = update_call[0][0]
        assert payload["status"] == "resume_draft"
        assert "updated_at" in payload
        supabase.table.return_value.update.return_value.eq.assert_called_with(
            "id", "job-42"
        )


# ---------------------------------------------------------------------------
# Single-resume status bump
# ---------------------------------------------------------------------------


class TestSingleResumeStatusBump:
    """POST /tailor/resume must advance job_postings.status to 'resume_draft'
    after a successful generation. Without this the JobDetailPanel never
    shows the 'Review Resume' button — the resume exists in the DB but is
    invisible to the user.
    """

    @pytest.mark.asyncio
    async def test_full_generation_marks_job_resume_draft(self) -> None:
        from app.models.tailor import TailorRequest
        from app.routers import tailor as tailor_router
        from app.services.tailor import PipelineSuccess

        supabase = MagicMock()
        llm = MagicMock()
        record = _make_record()

        success = PipelineSuccess(
            record=record,
            resume=_RESUME,
            warnings=[],
            lint=LintResult(ok=True, violations=[]),
            llm_result=MagicMock(),
        )

        with (
            patch("app.routers.tailor.optimized") as mock_opt,
            patch("app.routers.tailor.preferences") as mock_prefs,
            patch(
                "app.routers.tailor.resolve_contact",
                return_value=_CONTACT,
            ),
            patch(
                "app.routers.tailor.run_tailor_pipeline",
                return_value=success,
            ),
            patch(
                "app.services.tailor.persistence.mark_job_resume_draft"
            ) as mock_mark,
        ):
            mock_opt.get_latest.return_value = MagicMock(
                payload=MagicMock(roles=[MagicMock()], outcomes=[MagicMock()])
            )
            mock_prefs.get.return_value = None
            # Bypass the structural gap gate — we're testing the post-success path.
            with patch(
                "app.routers.tailor.gap_tracker.can_generate",
                return_value=MagicMock(ok=True),
            ):
                # force_fresh skips the reuse short-circuit so we hit the full
                # generation branch deterministically.
                await tailor_router.create_tailored_resume(
                    body=TailorRequest(
                        job_description="Build things.",
                        contact=_CONTACT,
                        job_posting_id="job-1",
                        force_fresh=True,
                    ),
                    supabase=supabase,
                    llm=llm,
                )

        mock_mark.assert_called_once_with(supabase, "job-1")

    @pytest.mark.asyncio
    async def test_no_status_bump_when_job_posting_id_missing(self) -> None:
        """One-off generations without a linked job (e.g. preview from a JD
        paste) should not touch any job_postings row."""
        from app.models.tailor import TailorRequest
        from app.routers import tailor as tailor_router
        from app.services.tailor import PipelineSuccess

        supabase = MagicMock()
        llm = MagicMock()
        record = _make_record(job_posting_id=None)

        success = PipelineSuccess(
            record=record,
            resume=_RESUME,
            warnings=[],
            lint=LintResult(ok=True, violations=[]),
            llm_result=MagicMock(),
        )

        with (
            patch("app.routers.tailor.optimized") as mock_opt,
            patch("app.routers.tailor.preferences") as mock_prefs,
            patch(
                "app.routers.tailor.resolve_contact",
                return_value=_CONTACT,
            ),
            patch(
                "app.routers.tailor.run_tailor_pipeline",
                return_value=success,
            ),
            patch(
                "app.services.tailor.persistence.mark_job_resume_draft"
            ) as mock_mark,
        ):
            mock_opt.get_latest.return_value = MagicMock(
                payload=MagicMock(roles=[MagicMock()], outcomes=[MagicMock()])
            )
            mock_prefs.get.return_value = None
            with patch(
                "app.routers.tailor.gap_tracker.can_generate",
                return_value=MagicMock(ok=True),
            ):
                await tailor_router.create_tailored_resume(
                    body=TailorRequest(
                        job_description="Build things.",
                        contact=_CONTACT,
                        force_fresh=True,
                    ),
                    supabase=supabase,
                    llm=llm,
                )

        mock_mark.assert_not_called()


# ---------------------------------------------------------------------------
# Edit endpoint
# ---------------------------------------------------------------------------


class TestEditResume:
    _GOOD_MD = "# Daniel Joffe\n\n## Experience\n\n### Engineer — Acme\n\n- Did things\n"

    @pytest.mark.asyncio
    async def test_edit_success(self) -> None:
        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        record = _make_record()
        updated_record = _make_record()

        with (
            patch(
                "app.services.tailor.persistence.get",
                return_value=record,
            ),
            patch(
                "app.services.tailor.persistence.update_payload_md",
                return_value=updated_record,
            ),
        ):
            result = await tailor_router.edit_tailored_resume(
                resume_id="rec-1",
                body=ResumeEditRequest(markdown=self._GOOD_MD),
                supabase=supabase,
            )

        assert result.record.id == "rec-1"

    @pytest.mark.asyncio
    async def test_edit_not_found(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()

        with (
            patch("app.services.tailor.persistence.get", return_value=None),
            pytest.raises(HTTPException) as exc_info,
        ):
            await tailor_router.edit_tailored_resume(
                resume_id="nonexistent",
                body=ResumeEditRequest(markdown=self._GOOD_MD),
                supabase=supabase,
            )
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_edit_rejected_if_approved(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        record = _make_record(approved_at=_NOW)

        with (
            patch("app.services.tailor.persistence.get", return_value=record),
            pytest.raises(HTTPException) as exc_info,
        ):
            await tailor_router.edit_tailored_resume(
                resume_id="rec-1",
                body=ResumeEditRequest(markdown=self._GOOD_MD),
                supabase=supabase,
            )
        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_edit_rejected_for_cover_letter(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        record = _make_record(document_type="cover_letter")

        with (
            patch("app.services.tailor.persistence.get", return_value=record),
            pytest.raises(HTTPException) as exc_info,
        ):
            await tailor_router.edit_tailored_resume(
                resume_id="rec-1",
                body=ResumeEditRequest(markdown=self._GOOD_MD),
                supabase=supabase,
            )
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_edit_lint_failure_missing_experience(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        record = _make_record()

        # No `## Experience` heading -> markdown lint blocks the save.
        bad_md = "# Daniel Joffe\n\n## Skills\n\nPython\n"

        with (
            patch("app.services.tailor.persistence.get", return_value=record),
            pytest.raises(HTTPException) as exc_info,
        ):
            await tailor_router.edit_tailored_resume(
                resume_id="rec-1",
                body=ResumeEditRequest(markdown=bad_md),
                supabase=supabase,
            )
        assert exc_info.value.status_code == 422


# ---------------------------------------------------------------------------
# Approve endpoint
# ---------------------------------------------------------------------------


class TestApproveResume:
    @pytest.mark.asyncio
    async def test_approve_success(self) -> None:
        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        record = _make_record()
        approved_record = _make_record(approved_at=_NOW)

        with (
            patch("app.services.tailor.persistence.get", return_value=record),
            patch(
                "app.services.tailor.persistence.approve",
                return_value=approved_record,
            ),
        ):
            result = await tailor_router.approve_tailored_resume(
                resume_id="rec-1",
                supabase=supabase,
            )

        assert result.approved_at is not None
        # Verify job status was updated to resume_ready
        supabase.table.assert_any_call("job_postings")

    @pytest.mark.asyncio
    async def test_approve_idempotent(self) -> None:
        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        already_approved = _make_record(approved_at=_NOW)

        with patch(
            "app.services.tailor.persistence.get",
            return_value=already_approved,
        ):
            result = await tailor_router.approve_tailored_resume(
                resume_id="rec-1",
                supabase=supabase,
            )

        assert result.approved_at is not None

    @pytest.mark.asyncio
    async def test_approve_not_found(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()

        with (
            patch("app.services.tailor.persistence.get", return_value=None),
            pytest.raises(HTTPException) as exc_info,
        ):
            await tailor_router.approve_tailored_resume(
                resume_id="nonexistent",
                supabase=supabase,
            )
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_approve_rejected_for_cover_letter(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        record = _make_record(document_type="cover_letter")

        with (
            patch("app.services.tailor.persistence.get", return_value=record),
            pytest.raises(HTTPException) as exc_info,
        ):
            await tailor_router.approve_tailored_resume(
                resume_id="rec-1",
                supabase=supabase,
            )
        assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# Export zip endpoint
# ---------------------------------------------------------------------------


class TestExportZip:
    @pytest.mark.asyncio
    async def test_export_zip_success(self) -> None:
        import zipfile as zf
        from io import BytesIO

        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        record = _make_record(approved_at=_NOW)

        with (
            patch("app.services.tailor.persistence.get", return_value=record),
            patch(
                "app.services.tailor.persistence.download_docx",
                return_value=b"fake-docx",
            ),
        ):
            result = await tailor_router.export_resumes_zip(
                body=BulkExportRequest(resume_ids=["rec-1"]),
                supabase=supabase,
            )

        assert result.media_type == "application/zip"
        # Verify it's a valid zip
        with zf.ZipFile(BytesIO(result.body)) as z:
            assert len(z.namelist()) == 1
            name = z.namelist()[0]
            assert name.endswith(".docx")
            assert "Acme" in name

    @pytest.mark.asyncio
    async def test_export_zip_rejects_unapproved(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        unapproved = _make_record(approved_at=None)

        with (
            patch("app.services.tailor.persistence.get", return_value=unapproved),
            pytest.raises(HTTPException) as exc_info,
        ):
            await tailor_router.export_resumes_zip(
                body=BulkExportRequest(resume_ids=["rec-1"]),
                supabase=supabase,
            )
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_export_zip_not_found(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()

        with (
            patch("app.services.tailor.persistence.get", return_value=None),
            pytest.raises(HTTPException) as exc_info,
        ):
            await tailor_router.export_resumes_zip(
                body=BulkExportRequest(resume_ids=["nonexistent"]),
                supabase=supabase,
            )
        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Get by job endpoint
# ---------------------------------------------------------------------------


class TestGetByJob:
    @pytest.mark.asyncio
    async def test_get_by_job_found(self) -> None:
        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        record = _make_record()

        with patch(
            "app.services.tailor.persistence.get_by_job",
            return_value=record,
        ):
            result = await tailor_router.get_resume_by_job(
                job_posting_id="job-1",
                supabase=supabase,
            )

        assert result.id == "rec-1"
        assert result.job_posting_id == "job-1"

    @pytest.mark.asyncio
    async def test_get_by_job_not_found(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()

        with (
            patch(
                "app.services.tailor.persistence.get_by_job",
                return_value=None,
            ),
            pytest.raises(HTTPException) as exc_info,
        ):
            await tailor_router.get_resume_by_job(
                job_posting_id="nonexistent",
                supabase=supabase,
            )
        assert exc_info.value.status_code == 404
