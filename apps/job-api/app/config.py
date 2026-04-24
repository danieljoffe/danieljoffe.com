from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    job_api_key: str = ""
    admin_session_secret: str = ""
    greenhouse_delay_ms: int = 200
    score_normalizer: int = 30
    allowed_hosts: str = "*"
    # Cross-service email alerts: the poller POSTs new high-scoring jobs to
    # the Next.js app, which renders via React Email and sends through Resend.
    next_app_url: str = ""
    job_alert_secret: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.allowed_hosts.split(",") if h.strip()]


settings = Settings()
