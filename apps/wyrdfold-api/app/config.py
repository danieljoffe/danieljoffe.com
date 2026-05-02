from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = Field(default="", repr=False)
    wyrdfold_api_key: str = Field(default="", repr=False)
    # HS256 secret from the Supabase project (Project Settings → API → JWT
    # Settings). Used to verify Bearer tokens minted by Supabase Auth.
    supabase_jwt_secret: str = Field(default="", repr=False)
    greenhouse_delay_ms: int = Field(default=200, ge=0, le=10_000)
    score_normalizer: int = 30
    allowed_hosts: str = ""

    # Sentry — leave DSN empty to disable (local dev, tests).
    sentry_dsn: str = Field(default="", repr=False)
    sentry_environment: str = "development"
    sentry_traces_sample_rate: float = Field(default=0.1, ge=0.0, le=1.0)

    # Twilio SMS — set all three to enable SMS notifications (#511).
    twilio_account_sid: str = ""
    twilio_auth_token: str = Field(default="", repr=False)
    twilio_phone_number: str = ""

    # LLM provider — set to "anthropic" to use the real SDK; mock is the safe default.
    llm_provider: Literal["mock", "anthropic"] = "mock"
    anthropic_api_key: str = Field(default="", repr=False)
    anthropic_timeout_seconds: float = Field(default=600.0, ge=1.0, le=3600.0)
    anthropic_max_retries: int = Field(default=2, ge=0, le=10)

    # URL validation — enable to validate job URLs during polling.
    validate_poll_urls: bool = True

    # Firecrawl — set API key to enable JS-rendered page extraction fallback.
    firecrawl_api_key: str = Field(default="", repr=False)

    # Embeddings provider — set to "voyage" to use the real SDK; mock is the default.
    embeddings_provider: Literal["mock", "voyage"] = "mock"
    voyage_api_key: str = Field(default="", repr=False)
    voyage_timeout_seconds: float = Field(default=60.0, ge=1.0, le=600.0)
    voyage_max_retries: int = Field(default=2, ge=0, le=10)

    # Email/SMS notifications — Next.js app URL and shared secret for job alerts.
    next_app_url: str = ""
    job_alert_secret: str = Field(default="", repr=False)

    # Slow-request log threshold (ms). Requests slower than this get logged
    # at WARNING with method/path/duration. Set to 0 to log every request.
    slow_request_threshold_ms: int = Field(default=500, ge=0, le=60_000)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.allowed_hosts.split(",") if h.strip()]


settings = Settings()
