from functools import lru_cache

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from supabase import Client, create_client

from app.config import Settings, settings

api_key_header = APIKeyHeader(name="x-api-key")


def get_settings() -> Settings:
    return settings


def get_supabase(s: Settings = Depends(get_settings)) -> Client:
    if not s.supabase_url or not s.supabase_service_key:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    return create_client(s.supabase_url, s.supabase_service_key)


def verify_api_key(
    key: str = Security(api_key_header),
    s: Settings = Depends(get_settings),
) -> str:
    if not s.job_api_key or key != s.job_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return key
