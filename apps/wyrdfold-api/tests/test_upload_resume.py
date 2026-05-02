"""Tests for POST /experience/upload-resume endpoint (#497)."""

from __future__ import annotations

import io
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import UploadFile


def _make_docx_bytes(paragraphs: list[str] | None = None) -> bytes:
    from docx import Document

    doc = Document()
    for text in (paragraphs or ["Senior Frontend Engineer", "React, TypeScript"]):
        doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _make_upload_file(
    content: bytes,
    filename: str = "resume.docx",
    content_type: str = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
) -> UploadFile:
    return UploadFile(
        file=io.BytesIO(content),
        filename=filename,
        headers=MagicMock(get=lambda k, d=None: content_type if k == "content-type" else d),
        size=len(content),
    )


def _mock_supabase() -> MagicMock:
    """Build a Supabase mock that handles prose + upload tracking."""
    supabase = MagicMock()

    # prose get_latest → None (first upload)
    supabase.table.return_value.select.return_value.order.return_value.limit.return_value.is_.return_value.execute.return_value.data = (
        []
    )

    # prose create_version → new doc
    supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {
            "id": "prose-1",
            "user_id": None,
            "version": 1,
            "content": "test content",
            "created_at": "2026-04-24T12:00:00Z",
        }
    ]

    # storage mock
    supabase.storage.from_.return_value.upload.return_value = None

    return supabase


class TestUploadResumeEndpoint:
    @pytest.mark.asyncio
    async def test_happy_path_docx(self, monkeypatch: pytest.MonkeyPatch) -> None:
        docx_bytes = _make_docx_bytes(["Software Engineer", "Built amazing things"])
        supabase = _mock_supabase()

        from app.routers import experience as exp_router

        monkeypatch.setattr(
            "app.services.experience.prose.get_latest", lambda *a, **kw: None
        )

        from datetime import UTC, datetime

        from app.models.experience import ProseDoc

        created_doc = ProseDoc(
            id="prose-1", user_id=None, version=1,
            content="Software Engineer\nBuilt amazing things",
            created_at=datetime.now(UTC),
        )
        monkeypatch.setattr(
            "app.services.experience.prose.create_version",
            lambda *a, **kw: created_doc,
        )

        # Mock storage
        monkeypatch.setattr(
            "app.services.ingest.storage.upload_file",
            lambda *a, **kw: "anon/upload-1.docx",
        )

        # Mock the upload tracking insert
        supabase.table.return_value.insert.return_value.execute.return_value.data = [{}]

        file = _make_upload_file(docx_bytes)
        result = await exp_router.upload_resume(
            file=file,
            auto_derive=False,
            supabase=supabase,
            llm=MagicMock(),
            embeddings=MagicMock(),
        )

        assert result.success is True
        assert result.prose_doc_id == "prose-1"
        assert result.prose_version == 1
        assert result.extracted_chars > 0
        assert result.filename == "resume.docx"
        assert result.optimized_doc_id is None

    @pytest.mark.asyncio
    async def test_empty_file_returns_422(self) -> None:
        from fastapi import HTTPException

        from app.routers import experience as exp_router

        file = _make_upload_file(b"")
        with pytest.raises(HTTPException) as exc_info:
            await exp_router.upload_resume(
                file=file,
                auto_derive=False,
                supabase=MagicMock(),
                llm=MagicMock(),
                embeddings=MagicMock(),
            )
        assert exc_info.value.status_code == 422
        assert "Empty" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_unsupported_type_returns_415(self) -> None:
        from fastapi import HTTPException

        from app.routers import experience as exp_router

        file = _make_upload_file(b"plain text", "notes.txt", "text/plain")
        with pytest.raises(HTTPException) as exc_info:
            await exp_router.upload_resume(
                file=file,
                auto_derive=False,
                supabase=MagicMock(),
                llm=MagicMock(),
                embeddings=MagicMock(),
            )
        assert exc_info.value.status_code == 415

    @pytest.mark.asyncio
    async def test_corrupt_file_returns_422(self) -> None:
        from fastapi import HTTPException

        from app.routers import experience as exp_router

        file = _make_upload_file(b"not a docx", "bad.docx")
        with pytest.raises(HTTPException) as exc_info:
            await exp_router.upload_resume(
                file=file,
                auto_derive=False,
                supabase=MagicMock(),
                llm=MagicMock(),
                embeddings=MagicMock(),
            )
        assert exc_info.value.status_code == 422

    @pytest.mark.asyncio
    async def test_file_too_large_returns_413(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from fastapi import HTTPException

        from app.routers import experience as exp_router
        from app.services.ingest import parse as parse_mod

        monkeypatch.setattr(parse_mod, "MAX_FILE_SIZE", 100)

        docx_bytes = _make_docx_bytes(["x" * 200])
        file = _make_upload_file(docx_bytes)
        with pytest.raises(HTTPException) as exc_info:
            await exp_router.upload_resume(
                file=file,
                auto_derive=False,
                supabase=MagicMock(),
                llm=MagicMock(),
                embeddings=MagicMock(),
            )
        assert exc_info.value.status_code == 413

    @pytest.mark.asyncio
    async def test_merge_with_existing_prose(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from datetime import UTC, datetime

        from app.models.experience import ProseDoc
        from app.routers import experience as exp_router
        from app.services.ingest.merge import DEFAULT_PURPOSE as MERGE_PURPOSE
        from app.services.llm.mock import MockLLMClient

        docx_bytes = _make_docx_bytes(["New upload content"])

        existing_doc = ProseDoc(
            id="prose-old", user_id=None, version=3,
            content="Existing career narrative here.",
            created_at=datetime.now(UTC),
        )
        monkeypatch.setattr(
            "app.services.experience.prose.get_latest",
            lambda *a, **kw: existing_doc,
        )

        created_content: list[str] = []

        def fake_create(supabase: Any, user_id: Any, content: str) -> ProseDoc:
            created_content.append(content)
            return ProseDoc(
                id="prose-new", user_id=None, version=4,
                content=content, created_at=datetime.now(UTC),
            )

        monkeypatch.setattr(
            "app.services.experience.prose.create_version", fake_create,
        )
        monkeypatch.setattr(
            "app.services.ingest.storage.upload_file",
            lambda *a, **kw: "anon/upload-2.docx",
        )
        monkeypatch.setattr(
            "app.services.llm.cost_log.record", MagicMock(),
        )

        merged_doc = (
            "Existing career narrative here.\n"
            "New upload content"
        )
        llm = MockLLMClient(scripted={MERGE_PURPOSE: merged_doc})
        supabase = _mock_supabase()
        file = _make_upload_file(docx_bytes)
        result = await exp_router.upload_resume(
            file=file,
            auto_derive=False,
            supabase=supabase,
            llm=llm,
            embeddings=MagicMock(),
        )

        assert result.success is True
        assert result.prose_version == 4
        # Verify the merged LLM output was persisted (semantic merge, no divider)
        assert len(created_content) == 1
        assert created_content[0] == merged_doc
        # Verify the merge LLM call was made with the right purpose
        assert llm.calls and llm.calls[0]["purpose"] == MERGE_PURPOSE

    @pytest.mark.asyncio
    async def test_auto_derive_triggers_pipeline(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from datetime import UTC, datetime

        from app.models.experience import OptimizedDoc, OptimizedPayload, ProseDoc
        from app.models.llm import LLMResult, LLMUsage
        from app.routers import experience as exp_router

        docx_bytes = _make_docx_bytes(["Career content"])

        monkeypatch.setattr(
            "app.services.experience.prose.get_latest", lambda *a, **kw: None,
        )
        monkeypatch.setattr(
            "app.services.experience.prose.create_version",
            lambda *a, **kw: ProseDoc(
                id="prose-1", user_id=None, version=1,
                content="Career content", created_at=datetime.now(UTC),
            ),
        )
        monkeypatch.setattr(
            "app.services.ingest.storage.upload_file",
            lambda *a, **kw: "anon/upload.docx",
        )

        derive_called = {"count": 0}

        async def fake_derive(llm: Any, *, prose_text: str, **kw: Any) -> Any:
            derive_called["count"] += 1
            payload = OptimizedPayload(summary="Derived summary")
            result = LLMResult(
                content="{}", model="claude-sonnet-4-6",
                usage=LLMUsage(input_tokens=100, output_tokens=50),
                cost_usd=0.001, latency_ms=50,
            )
            return payload, result

        monkeypatch.setattr(
            "app.services.experience.derive.derive_from_prose", fake_derive,
        )
        monkeypatch.setattr(
            "app.services.llm.cost_log.record", MagicMock(),
        )
        monkeypatch.setattr(
            "app.services.experience.optimized.create_version",
            lambda *a, **kw: OptimizedDoc(
                id="opt-1", user_id=None, prose_doc_id="prose-1",
                version=1, payload=OptimizedPayload(summary="Derived summary"),
                markdown_view=None, source="llm", created_at=datetime.now(UTC),
            ),
        )
        monkeypatch.setattr(
            "app.services.experience.chunks.upsert_for_optimized",
            AsyncMock(),
        )

        supabase = _mock_supabase()
        file = _make_upload_file(docx_bytes)
        result = await exp_router.upload_resume(
            file=file,
            auto_derive=True,
            supabase=supabase,
            llm=MagicMock(),
            embeddings=MagicMock(),
        )

        assert result.success is True
        assert result.optimized_doc_id == "opt-1"
        assert derive_called["count"] == 1
