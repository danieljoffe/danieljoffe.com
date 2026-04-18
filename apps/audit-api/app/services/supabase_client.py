from functools import lru_cache
from typing import Any

from app.config import settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Any | None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)
