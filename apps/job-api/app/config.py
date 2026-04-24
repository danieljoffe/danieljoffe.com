from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    job_api_key: str = ""
    admin_session_secret: str = ""
    greenhouse_delay_ms: int = 200
    score_normalizer: int = 30
    allowed_hosts: str = "*"

    # LLM provider — set to "anthropic" to use the real SDK; mock is the safe default.
    llm_provider: Literal["mock", "anthropic"] = "mock"
    anthropic_api_key: str = ""
    anthropic_timeout_seconds: float = 600.0
    anthropic_max_retries: int = 2

    # URL validation — enable to validate job URLs during polling.
    validate_poll_urls: bool = False

    # Embeddings provider — set to "voyage" to use the real SDK; mock is the default.
    embeddings_provider: Literal["mock", "voyage"] = "mock"
    voyage_api_key: str = ""
    voyage_timeout_seconds: float = 60.0
    voyage_max_retries: int = 2

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.allowed_hosts.split(",") if h.strip()]


settings = Settings()
