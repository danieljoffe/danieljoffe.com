"""Supabase Storage for uploaded resume files.

Follows the same pattern as tailor/persistence.py. Stores originals
so users can reference what they uploaded.
"""

from __future__ import annotations

from supabase import Client

STORAGE_BUCKET = "resume-uploads"


def _storage_path(user_id: str | None, upload_id: str, file_ext: str) -> str:
    return f"{user_id or 'anon'}/{upload_id}.{file_ext}"


def upload_file(
    supabase: Client,
    *,
    user_id: str | None,
    upload_id: str,
    file_bytes: bytes,
    file_ext: str,
    content_type: str,
) -> str:
    """Upload a resume file to Supabase Storage. Returns the storage path."""
    path = _storage_path(user_id, upload_id, file_ext)
    supabase.storage.from_(STORAGE_BUCKET).upload(
        path=path,
        file=file_bytes,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    return path


def download_file(supabase: Client, storage_path: str) -> bytes:
    """Download a resume file from Supabase Storage."""
    return supabase.storage.from_(STORAGE_BUCKET).download(storage_path)
