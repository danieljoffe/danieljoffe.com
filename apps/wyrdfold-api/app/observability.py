"""Sentry wiring. Must be imported before FastAPI is instantiated.

Sentry's FastAPI integration patches Starlette middleware at init time, so
``init_sentry()`` has to run before ``app = FastAPI(...)``. Callers with no
DSN configured get a no-op (useful for local dev and tests without
credentials).
"""

from __future__ import annotations

import sentry_sdk

from app.config import settings


def init_sentry() -> None:
    if not settings.sentry_dsn:
        return

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,
    )
