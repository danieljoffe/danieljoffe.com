"""HTTP rate limiting via slowapi.

Per-user (JWT-keyed) limits on expensive or fan-out endpoints — LLM-backed
generation, Brave-fan-out source discovery, URL validation, and user-driven
job creation. Closes #850 S2 ("no HTTP rate limiting"), which left the API's
expensive non-LLM endpoints with zero protection.

In-memory backend is correct for the current single-replica Railway deploy.
When scaling to multiple replicas, swap to a Redis storage URI via
``Limiter(storage_uri="redis://…")`` — otherwise each replica enforces its
own bucket and the combined limit is N× the configured ceiling.

Key strategy:
  - JWT callers are keyed by ``jwt:<sub>`` so limits track real users
    regardless of IP (NAT, mobile network changes).
  - Unauthenticated / api-key fallback is keyed by client IP so bad actors
    can't trivially bypass by dropping the Bearer header.
  - Failures decoding the JWT (malformed, expired) fall through to IP keying;
    they'll be rejected by the endpoint's auth dependency anyway, so the
    limiter just protects against pre-auth flooding.
"""

from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.dependencies import _try_decode_jwt_sub


def _user_or_ip_key(request: Request) -> str:
    """Return ``jwt:<sub>`` when a valid Supabase JWT is present, else
    ``ip:<host>``.

    Synchronous on the hot path; the JWT decode is cached by PyJWKClient so
    repeat lookups for the same key id are O(1).
    """
    sub = _try_decode_jwt_sub(request, settings)
    if sub:
        return f"jwt:{sub}"
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=_user_or_ip_key,
    enabled=settings.rate_limit_enabled,
    # Default limits — endpoints set their own via ``@limiter.limit(...)``,
    # but this keeps any future undeclared endpoint from being uncovered.
    default_limits=["120/minute"],
)
