from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    supabase_url: str = ""
    supabase_service_role_key: str = Field(default="", repr=False)
    audit_api_key: str = Field(default="", repr=False)
    admin_session_secret: str = Field(default="", repr=False)
    allowed_hosts: str = ""
    sentry_dsn: str = Field(default="", repr=False)
    sentry_environment: str = "development"
    sentry_traces_sample_rate: float = Field(default=0.1, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def _validate_session_secret(self) -> "Settings":
        # Either unset (= unconfigured, dep returns 503) or strong (>= 32
        # chars). A short non-empty value is almost always a misconfiguration
        # — surface it at startup rather than at the first request.
        if self.admin_session_secret and len(self.admin_session_secret) < 32:
            raise ValueError(
                "ADMIN_SESSION_SECRET must be at least 32 characters "
                "(or unset to disable session auth)"
            )
        return self

    @property
    def allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.allowed_hosts.split(",") if h.strip()]


settings = Settings()
