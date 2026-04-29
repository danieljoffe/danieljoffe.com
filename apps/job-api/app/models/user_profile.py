"""Pydantic models for user profile — notification + identity fields."""

from pydantic import BaseModel, Field


class NotificationPreferences(BaseModel):
    """Read model for notification preferences."""

    job_notifications_enabled: bool = False
    job_score_threshold: int = 100
    sms_notifications_enabled: bool = False
    sms_score_threshold: int = 100
    sms_daily_limit: int = 5
    phone_number: str | None = None
    email: str | None = None


class NotificationPreferencesUpdate(BaseModel):
    """Write model — all fields optional so callers can patch individual settings."""

    job_notifications_enabled: bool | None = None
    job_score_threshold: int | None = Field(default=None, ge=0, le=200)
    sms_notifications_enabled: bool | None = None
    sms_score_threshold: int | None = Field(default=None, ge=0, le=200)
    sms_daily_limit: int | None = Field(default=None, ge=1, le=50)
    phone_number: str | None = Field(default=None, max_length=20)


class IdentityFields(BaseModel):
    """Read model for resume / cover-letter identity. Backend sources contact
    info from here so the frontend never has to send it (F3-A).
    """

    name: str | None = None
    email: str | None = None
    phone_number: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    website_url: str | None = None


class IdentityFieldsUpdate(BaseModel):
    """Write model — all fields optional. Empty strings clear the field."""

    name: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    phone_number: str | None = Field(default=None, max_length=20)
    location: str | None = Field(default=None, max_length=200)
    linkedin_url: str | None = Field(default=None, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)
