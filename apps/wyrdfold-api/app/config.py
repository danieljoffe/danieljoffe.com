from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    supabase_url: str = ""
    supabase_service_role_key: str = Field(default="", repr=False)
    wyrdfold_api_key: str = Field(default="", repr=False)
    # JWT verification uses Supabase's JWKS endpoint at
    # `<supabase_url>/auth/v1/.well-known/jwks.json` — public-key verification
    # with key rotation handled automatically. No shared secret required.
    # Override the audience for tests; production should keep "authenticated".
    supabase_jwt_audience: str = "authenticated"
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

    # CORS — comma-separated allowlist of origins permitted to call the API
    # from a browser. Empty disables CORS (server-to-server only). Production
    # should be the Next.js app URL; local dev typically `http://localhost:3000,http://localhost:3100`.
    cors_allowed_origins: str = ""

    # In-process scheduled poller. Off by default so tests and ad-hoc dev
    # processes don't trigger background fetches; ops opt-in via env var.
    # Tick = how often the scheduler wakes up to look for due sources;
    # actual per-source cadence is governed by ``sources.poll_interval_minutes``.
    poll_scheduler_enabled: bool = False
    poll_tick_minutes: int = Field(default=30, ge=1, le=1440)

    # Brave Search API — powers the target-driven source-discovery loop. Set
    # the key to enable; empty key disables discovery entirely (the service
    # logs a warning and exits cleanly). 2,000 free queries/month is plenty
    # for daily-per-target with a query cap. Get one at https://brave.com/search/api/.
    brave_search_api_key: str = Field(default="", repr=False)
    # Hard cap on total Brave queries fired per discovery run, across all
    # targets and keywords. The free tier is 2,000/month; at 200/day across
    # daily runs we'd burn through it in 10 days, so 200 is the ceiling for a
    # single run and the per-target loop fans out within that budget.
    discovery_query_cap_per_run: int = Field(default=200, ge=1, le=2000)
    # Per-keyword result depth — top N URLs we look at from each search.
    discovery_results_per_query: int = Field(default=20, ge=1, le=50)

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    # Per-user LLM budget (defense-in-depth). Rolling window over llm_costs.
    # Set to 0 to disable a window. API-key callers (cron) bypass — system
    # paths are trusted and gated by the operator.
    user_llm_daily_budget_usd: float = Field(default=5.0, ge=0.0)
    user_llm_hourly_budget_usd: float = Field(default=1.0, ge=0.0)

    @property
    def allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.allowed_hosts.split(",") if h.strip()]


settings = Settings()
