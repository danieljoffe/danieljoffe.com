"""Tests for batch resume generation (#503)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.ats_lint import LintResult, LintViolation
from app.models.batch import BatchItem, BatchJob, BatchRequest, BatchResponse
from app.models.experience import OptimizedDoc, OptimizedPayload
from app.models.llm import LLMResult, LLMUsage
from app.models.tailor import (
    ContactInfo,
    TailoredResume,
    TailoredResumeRecord,
)
from app.services.batch import (
    TABLE,
    _update_batch,
    create_batch,
    get_batch,
    process_batch,
)
from app.services.tailor import PipelineLintFailure, PipelineSuccess

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOW = datetime.now(UTC)

_CONTACT = ContactInfo(name="Daniel Joffe", email="d@example.com")

_OPTIMIZED = OptimizedDoc(
    id="opt-1",
    user_id=None,
    prose_doc_id="prose-1",
    version=1,
    payload=OptimizedPayload(summary="Test summary"),
    markdown_view=None,
    source="llm",
    created_at=_NOW,
)

_LLM_RESULT = LLMResult(
    content="{}",
    model="claude-sonnet-4-6",
    usage=LLMUsage(input_tokens=100, output_tokens=50),
    cost_usd=0.001,
    latency_ms=50,
)

_RESUME = TailoredResume(
    summary="Summary",
    contact=_CONTACT,
    experience=[],
    skills=["Python"],
)

_RESUME_RECORD = TailoredResumeRecord(
    id="rec-1",
    user_id=None,
    job_posting_id="job-1",
    document_type="resume",
    resume_type="generic",
    jd_snapshot="JD",
    jd_snapshot_hash="abc",
    payload=_RESUME.model_dump(),
    storage_path=None,
    warnings=[],
    model="claude-sonnet-4-6",
    input_tokens=100,
    output_tokens=50,
    cost_usd=0.001,
    latency_ms=50,
    created_at=_NOW,
)


def _pending_item(jid: str) -> dict[str, Any]:
    return {
        "job_posting_id": jid,
        "status": "pending",
        "resume_record_id": None,
        "error": None,
    }


def _default_batch_data() -> dict[str, Any]:
    return {
        "id": "batch-1",
        "user_id": None,
        "status": "pending",
        "total": 2,
        "completed": 0,
        "failed": 0,
        "items": [_pending_item("job-1"), _pending_item("job-2")],
        "created_at": _NOW.isoformat(),
        "updated_at": _NOW.isoformat(),
    }


def _set_mock_data(supabase: MagicMock, data: list[Any]) -> None:
    insert = supabase.table.return_value.insert.return_value
    insert.execute.return_value.data = data
    select = supabase.table.return_value.select.return_value
    # ``get_batch`` (post user_id scoping): select → eq(id) → is_(user_id) → execute
    select.eq.return_value.is_.return_value.execute.return_value.data = data
    # Back-compat for the older single-``eq`` chain (kept for any callers
    # that still go through it during refactoring).
    select.eq.return_value.execute.return_value.data = data


def _mock_supabase_for_batch(
    batch_data: dict[str, Any] | None = None,
) -> MagicMock:
    """Build a Supabase mock that handles batch operations."""
    supabase = MagicMock()
    data = [batch_data] if batch_data else [_default_batch_data()]
    _set_mock_data(supabase, data)
    return supabase


# ---------------------------------------------------------------------------
# Batch models
# ---------------------------------------------------------------------------


class TestBatchModels:
    def test_batch_item_defaults(self) -> None:
        item = BatchItem(job_posting_id="job-1")
        assert item.status == "pending"
        assert item.resume_record_id is None
        assert item.error is None

    def test_batch_request_validation(self) -> None:
        req = BatchRequest(
            job_posting_ids=["job-1", "job-2"],
            contact=_CONTACT,
        )
        assert len(req.job_posting_ids) == 2
        assert req.resume_type is None
        assert req.page_budget == 2

    def test_batch_request_rejects_empty(self) -> None:
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            BatchRequest(job_posting_ids=[], contact=_CONTACT)

    def test_batch_request_rejects_over_20(self) -> None:
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            BatchRequest(
                job_posting_ids=[f"job-{i}" for i in range(21)],
                contact=_CONTACT,
            )

    def test_batch_response_shape(self) -> None:
        resp = BatchResponse(batch_id="b-1", total=3, status="pending")
        assert resp.warnings == []


# ---------------------------------------------------------------------------
# Batch persistence
# ---------------------------------------------------------------------------


class TestBatchPersistence:
    def test_create_batch(self) -> None:
        supabase = _mock_supabase_for_batch()
        batch = create_batch(
            supabase,
            user_id=None,
            job_posting_ids=["job-1", "job-2"],
        )
        assert batch.id == "batch-1"
        assert batch.total == 2
        assert batch.status == "pending"
        assert len(batch.items) == 2

        # Verify the insert was called on the right table
        supabase.table.assert_any_call(TABLE)

    def test_get_batch(self) -> None:
        supabase = _mock_supabase_for_batch()
        batch = get_batch(supabase, "batch-1", user_id=None)
        assert batch is not None
        assert batch.id == "batch-1"

    def test_get_batch_not_found(self) -> None:
        supabase = MagicMock()
        _set_mock_data(supabase, [])
        batch = get_batch(supabase, "nonexistent", user_id=None)
        assert batch is None

    def test_update_batch(self) -> None:
        supabase = MagicMock()
        _update_batch(
            supabase,
            "batch-1",
            status="processing",
            completed=1,
            failed=0,
        )
        supabase.table.assert_any_call(TABLE)
        supabase.table.return_value.update.assert_called_once()


# ---------------------------------------------------------------------------
# Batch processing
# ---------------------------------------------------------------------------


class TestBatchProcessing:
    @pytest.mark.asyncio
    async def test_process_single_item_success(self) -> None:
        supabase = _mock_supabase_for_batch()
        llm = MagicMock()

        success = PipelineSuccess(
            record=_RESUME_RECORD,
            resume=_RESUME,
            warnings=[],
            lint=LintResult(ok=True, violations=[]),
            llm_result=_LLM_RESULT,
        )

        with patch(
            "app.services.batch.run_tailor_pipeline",
            new_callable=AsyncMock,
            return_value=success,
        ) as mock_pipeline:
            await process_batch(
                supabase,
                llm,
                batch_id="batch-1",
                user_id=None,
                optimized=_OPTIMIZED,
                jobs=[{"id": "job-1", "description_html": "<p>JD</p>"}],
                contact=_CONTACT,
                preferences=None,
                resume_type="generic",
                page_budget=2,
            )

            mock_pipeline.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_item_lint_failure(self) -> None:
        supabase = _mock_supabase_for_batch()
        llm = MagicMock()

        lint_fail = PipelineLintFailure(
            lint=LintResult(
                ok=False,
                violations=[
                    LintViolation(code="too_long", message="Page overflow", severity="error")
                ],
            ),
            resume=_RESUME,
            warnings=[],
            llm_result=_LLM_RESULT,
        )

        with patch(
            "app.services.batch.run_tailor_pipeline",
            new_callable=AsyncMock,
            return_value=lint_fail,
        ):
            await process_batch(
                supabase,
                llm,
                batch_id="batch-1",
                user_id=None,
                optimized=_OPTIMIZED,
                jobs=[{"id": "job-1", "description_html": "<p>JD</p>"}],
                contact=_CONTACT,
                preferences=None,
                resume_type="generic",
                page_budget=2,
            )

        # Batch should still complete (with failures tracked)
        # The _update_batch calls track the failed item

    @pytest.mark.asyncio
    async def test_process_item_exception(self) -> None:
        supabase = _mock_supabase_for_batch()
        llm = MagicMock()

        with patch(
            "app.services.batch.run_tailor_pipeline",
            new_callable=AsyncMock,
            side_effect=RuntimeError("LLM connection failed"),
        ):
            await process_batch(
                supabase,
                llm,
                batch_id="batch-1",
                user_id=None,
                optimized=_OPTIMIZED,
                jobs=[{"id": "job-1", "description_html": "<p>JD</p>"}],
                contact=_CONTACT,
                preferences=None,
                resume_type="generic",
                page_budget=2,
            )

        # Should not raise — exceptions are caught per-item

    @pytest.mark.asyncio
    async def test_process_batch_not_found(self) -> None:
        supabase = MagicMock()
        _set_mock_data(supabase, [])
        llm = MagicMock()

        # Should return early without error
        await process_batch(
            supabase,
            llm,
            batch_id="nonexistent",
            user_id=None,
            optimized=_OPTIMIZED,
            jobs=[],
            contact=_CONTACT,
            preferences=None,
            resume_type="generic",
            page_budget=2,
        )

    @pytest.mark.asyncio
    async def test_process_multiple_items_mixed_results(self) -> None:
        supabase = _mock_supabase_for_batch()
        llm = MagicMock()

        success = PipelineSuccess(
            record=_RESUME_RECORD,
            resume=_RESUME,
            warnings=[],
            lint=LintResult(ok=True, violations=[]),
            llm_result=_LLM_RESULT,
        )

        call_count = {"n": 0}

        async def mock_pipeline(*args: Any, **kwargs: Any) -> Any:
            call_count["n"] += 1
            if call_count["n"] == 1:
                return success
            raise RuntimeError("second job failed")

        with patch(
            "app.services.batch.run_tailor_pipeline",
            side_effect=mock_pipeline,
        ):
            await process_batch(
                supabase,
                llm,
                batch_id="batch-1",
                user_id=None,
                optimized=_OPTIMIZED,
                jobs=[
                    {"id": "job-1", "description_html": "<p>JD1</p>"},
                    {"id": "job-2", "description_html": "<p>JD2</p>"},
                ],
                contact=_CONTACT,
                preferences=None,
                resume_type="generic",
                page_budget=2,
            )

        assert call_count["n"] == 2

    @pytest.mark.asyncio
    async def test_process_updates_job_status_on_success(self) -> None:
        supabase = _mock_supabase_for_batch()
        llm = MagicMock()

        success = PipelineSuccess(
            record=_RESUME_RECORD,
            resume=_RESUME,
            warnings=[],
            lint=LintResult(ok=True, violations=[]),
            llm_result=_LLM_RESULT,
        )

        with (
            patch(
                "app.services.batch.run_tailor_pipeline",
                new_callable=AsyncMock,
                return_value=success,
            ),
            patch(
                "app.services.tailor.persistence.mark_job_resume_draft"
            ) as mock_mark,
        ):
            await process_batch(
                supabase,
                llm,
                batch_id="batch-1",
                user_id=None,
                optimized=_OPTIMIZED,
                jobs=[{"id": "job-1", "description_html": "<p>JD</p>"}],
                contact=_CONTACT,
                preferences=None,
                resume_type="generic",
                page_budget=2,
            )

        mock_mark.assert_called_once_with(supabase, "job-1")


# ---------------------------------------------------------------------------
# Batch endpoint
# ---------------------------------------------------------------------------


class TestBatchEndpoint:
    @pytest.mark.asyncio
    async def test_create_batch_no_optimized_doc(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        llm = MagicMock()
        background = MagicMock()

        with patch(
            "app.services.experience.optimized.get_latest",
            return_value=None,
        ):
            with pytest.raises(HTTPException) as exc_info:
                await tailor_router.create_batch_resumes(
                    body=BatchRequest(
                        job_posting_ids=["job-1"],
                        contact=_CONTACT,
                    ),
                    background_tasks=background,
                    supabase=supabase,
                    llm=llm,
                )
            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_create_batch_job_not_found(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        _set_mock_data(supabase, [])
        llm = MagicMock()
        background = MagicMock()

        with patch(
            "app.services.experience.optimized.get_latest",
            return_value=_OPTIMIZED,
        ):
            with pytest.raises(HTTPException) as exc_info:
                await tailor_router.create_batch_resumes(
                    body=BatchRequest(
                        job_posting_ids=["nonexistent"],
                        contact=_CONTACT,
                    ),
                    background_tasks=background,
                    supabase=supabase,
                    llm=llm,
                )
            assert exc_info.value.status_code == 404
            assert "nonexistent" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_create_batch_happy_path(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        # Mock jobs lookup
        _set_mock_data(supabase, [
            {"id": "job-1", "title": "SWE", "description_html": "<p>JD</p>"}
        ])
        llm = MagicMock()
        background = MagicMock()

        monkeypatch.setattr(
            "app.services.experience.optimized.get_latest",
            lambda *a, **kw: _OPTIMIZED,
        )
        monkeypatch.setattr(
            "app.services.experience.preferences.get",
            lambda *a, **kw: None,
        )

        batch = BatchJob(
            id="batch-1",
            user_id=None,
            status="pending",
            total=1,
            completed=0,
            failed=0,
            items=[BatchItem(job_posting_id="job-1")],
            created_at=_NOW,
            updated_at=_NOW,
        )
        monkeypatch.setattr(
            "app.routers.tailor.create_batch",
            lambda *a, **kw: batch,
        )

        result = await tailor_router.create_batch_resumes(
            body=BatchRequest(
                job_posting_ids=["job-1"],
                contact=_CONTACT,
            ),
            background_tasks=background,
            supabase=supabase,
            llm=llm,
        )

        assert result.batch_id == "batch-1"
        assert result.total == 1
        assert result.status == "pending"
        background.add_task.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_batch_not_found(self) -> None:
        from fastapi import HTTPException

        from app.routers import tailor as tailor_router

        supabase = MagicMock()

        with patch("app.routers.tailor.get_batch", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                await tailor_router.get_batch_status(
                    batch_id="nonexistent",
                    supabase=supabase,
                )
            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_batch_returns_progress(self) -> None:
        from app.routers import tailor as tailor_router

        supabase = MagicMock()
        batch = BatchJob(
            id="batch-1",
            user_id=None,
            status="processing",
            total=3,
            completed=2,
            failed=0,
            items=[
                BatchItem(job_posting_id="job-1", status="completed", resume_record_id="rec-1"),
                BatchItem(job_posting_id="job-2", status="completed", resume_record_id="rec-2"),
                BatchItem(job_posting_id="job-3", status="pending"),
            ],
            created_at=_NOW,
            updated_at=_NOW,
        )

        with patch("app.routers.tailor.get_batch", return_value=batch):
            result = await tailor_router.get_batch_status(
                batch_id="batch-1",
                supabase=supabase,
            )

        assert result.status == "processing"
        assert result.completed == 2
        assert result.total == 3
