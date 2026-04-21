"""Singleton Supabase client.

Creates one client at app startup and reuses it across all requests,
eliminating per-request connection overhead.
"""

from supabase import Client, create_client

from app.config import settings

_client: Client | None = None


def init_supabase() -> None:
    global _client
    if settings.supabase_url and settings.supabase_service_role_key:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase_pool() -> Client | None:
    return _client


def close_supabase() -> None:
    global _client
    _client = None
