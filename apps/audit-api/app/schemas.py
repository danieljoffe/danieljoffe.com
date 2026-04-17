from typing import Literal

from pydantic import BaseModel, Field


class RunScanRequest(BaseModel):
    scan_id: str = Field(min_length=1)
    url: str = Field(min_length=1)
    device_mode: Literal["mobile", "desktop"] = "mobile"


class RunScanResponse(BaseModel):
    status: Literal["accepted"] = "accepted"
    scan_id: str


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    queue: int
    running: bool
