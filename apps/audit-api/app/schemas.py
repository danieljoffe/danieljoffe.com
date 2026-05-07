from ipaddress import ip_address
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator

from app.services.ssrf_guard import assert_safe_host

_BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "metadata.goog",
}


class RunScanRequest(BaseModel):
    scan_id: str = Field(min_length=1)
    url: str = Field(min_length=1, max_length=2048)
    device_mode: Literal["mobile", "desktop"] = "mobile"

    @field_validator("url")
    @classmethod
    def _validate_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("url must use http or https scheme")
        host = (parsed.hostname or "").lower()
        if not host:
            raise ValueError("url must include a hostname")
        if host in _BLOCKED_HOSTNAMES:
            raise ValueError("url host is not allowed")
        try:
            ip = ip_address(host)
        except ValueError:
            # Hostname is not a literal IP — DNS-resolve and reject if any
            # resolved address falls in a disallowed range. Without this,
            # `metadata.evil.com → 169.254.169.254` would slip past the
            # literal-IP block and Lighthouse would scan internal infra.
            try:
                assert_safe_host(host)
            except ValueError as exc:
                raise ValueError("url host is not allowed") from exc
        else:
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
                or ip.is_unspecified
            ):
                raise ValueError("url host is not allowed")
        return value


class RunScanResponse(BaseModel):
    status: Literal["accepted"] = "accepted"
    scan_id: str


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    queue: int
    running: bool
