from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = Field(default="", repr=False)
    audit_api_key: str = Field(default="", repr=False)
    admin_session_secret: str = Field(default="", repr=False)
    allowed_hosts: str = ""
    sentry_dsn: str = Field(default="", repr=False)
    sentry_environment: str = "development"
    sentry_traces_sample_rate: float = Field(default=0.1, ge=0.0, le=1.0)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.allowed_hosts.split(",") if h.strip()]


settings = Settings()
