"""Simple in-memory TTL cache for query results.

Avoids adding a dependency on cachetools — this is a minimal, thread-safe
implementation that covers the job-list use case. Cache keys are derived
from query parameters; values are dicts.
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
from typing import Any


class TTLCache:
    """Dict-like cache where entries expire after `ttl` seconds."""

    def __init__(self, ttl: float = 60.0, max_size: int = 256) -> None:
        self._ttl = ttl
        self._max_size = max_size
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            # Evict expired entries if at capacity
            if len(self._store) >= self._max_size:
                now = time.monotonic()
                expired = [k for k, (exp, _) in self._store.items() if now > exp]
                for k in expired:
                    del self._store[k]
                # If still at capacity after eviction, drop oldest
                if len(self._store) >= self._max_size:
                    oldest_key = min(self._store, key=lambda k: self._store[k][0])
                    del self._store[oldest_key]
            self._store[key] = (time.monotonic() + self._ttl, value)

    def invalidate(self, prefix: str | None = None) -> None:
        """Clear all entries, or only those whose key starts with `prefix`."""
        with self._lock:
            if prefix is None:
                self._store.clear()
            else:
                keys = [k for k in self._store if k.startswith(prefix)]
                for k in keys:
                    del self._store[k]


def make_cache_key(prefix: str, **params: Any) -> str:
    """Deterministic cache key from a prefix and arbitrary query params."""
    # Sort keys for determinism, skip None values
    filtered = {k: v for k, v in sorted(params.items()) if v is not None}
    raw = json.dumps(filtered, sort_keys=True, default=str)
    digest = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return f"{prefix}:{digest}"


# Singleton caches
job_list_cache = TTLCache(ttl=60.0, max_size=128)
