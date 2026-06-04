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
    # Bumped from 2 → 5 alongside the V3 prompt rollout. The default-2 budget
    # exhausts on a small fraction of cases during burst load (e.g. Phase 2
    # backfill grading dozens of jobs in under a minute); 5 gives Anthropic
    # rate-limit retries enough headroom to recover without sacrificing
    # responsiveness. Each retry uses exponential backoff inside the SDK.
    anthropic_max_retries: int = Field(default=5, ge=0, le=10)

    # URL validation — enable to validate job URLs during polling.
    validate_poll_urls: bool = True

    # Periodic job URL health checks (see app/services/url_health.py).
    # Off by default. When enabled, the scheduler ticks every
    # ``url_health_tick_hours`` and HEAD-checks the oldest
    # ``url_health_batch_size`` live jobs. Jobs that fail
    # ``url_health_failure_threshold`` consecutive checks (4xx or network
    # error) get archived and their heavy fields NULL'd to reclaim space.
    url_health_check_enabled: bool = False
    url_health_tick_hours: int = Field(default=24, ge=1, le=720)
    url_health_batch_size: int = Field(default=50, ge=1, le=500)
    url_health_concurrency: int = Field(default=10, ge=1, le=50)
    url_health_failure_threshold: int = Field(default=3, ge=1, le=10)

    # Firecrawl — set API key to enable JS-rendered page extraction fallback.
    firecrawl_api_key: str = Field(default="", repr=False)

    # Embeddings provider — set to "voyage" to use the real SDK; mock is the default.
    embeddings_provider: Literal["mock", "voyage"] = "mock"
    voyage_api_key: str = Field(default="", repr=False)
    voyage_timeout_seconds: float = Field(default=60.0, ge=1.0, le=600.0)
    voyage_max_retries: int = Field(default=2, ge=0, le=10)

    # Phase 1 LLM title triage. When True, the poller's ingestion-time
    # gate uses the Haiku-backed binary classifier in
    # ``app/services/relevance/title_triage.py`` instead of the legacy
    # cosine prefilter (which proved structurally weak for short job
    # titles — see plan-llm-scoring-migration.md). Ships FALSE so the
    # PR can be validated per-target in DEV before flipping on. When
    # False the poller is pass-through (no gate); precision relies on
    # downstream keyword scoring.
    phase1_triage_enabled: bool = False

    # Recency decay (#5). When True the /jobs list sorts/paginates by
    # ``scores.recency_score`` (the fit score decayed by posting age via
    # ``app/services/recency.py``) and the poller refreshes that column
    # each cycle. When False the multiplier is 1.0 (recency_score ==
    # score) and the list sorts by raw fit score exactly as before — the
    # flag is a pure sort change, safe to flip per-deploy.
    recency_decay_enabled: bool = False

    # Phase 2 LLM job-fit grading (#6). When True the poller runs the
    # Sonnet-backed ``score_with_phase2_and_persist`` over promising
    # (Phase 1) jobs in place of the legacy Stage 3 keyword+LLM blend,
    # progressively batched and bounded by the per-target daily cap. When
    # False the poller runs the legacy Stage 3 path unchanged. Phase 2
    # only grades rows Phase 1 marked ``promising``, so it requires
    # ``phase1_triage_enabled`` to surface any work.
    phase2_enabled: bool = False

    # Logistics extraction (plan-wyrdfold-logistics-chips.md). When True
    # the Phase 2 grader's system prompt includes a section asking the
    # model to emit a `logistics` JSON object (remote_status, salary
    # min/max/currency/unit, location_city/country) alongside the axis
    # scores. The result is persisted to ``scores.logistics_filters``
    # (migration #20260603100000) and consumed by the /jobs logistics
    # chips. When False the prompt is unchanged and the column stays
    # NULL — this is the additive shadow that pre-flip rollout uses.
    # Per ``feedback-prompt-change-shadow-run``: ship behind this flag,
    # compare axis-score distributions before flipping in production.
    logistics_extraction_enabled: bool = False

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
