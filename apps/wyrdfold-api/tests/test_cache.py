"""Cache key helpers and scoped invalidation."""

from __future__ import annotations

from app.cache import TTLCache, jobs_cache_prefix, make_cache_key


def test_jobs_cache_prefix_includes_target_id() -> None:
    assert jobs_cache_prefix(target_id="abc-123") == "jobs:t=abc-123"


def test_jobs_cache_prefix_marks_global_view_explicitly() -> None:
    assert jobs_cache_prefix(target_id=None) == "jobs:t=global"


def test_make_cache_key_preserves_prefix_for_scoped_invalidation() -> None:
    key = make_cache_key(jobs_cache_prefix(target_id="abc-123"), page=1)
    assert key.startswith("jobs:t=abc-123:")


def test_make_cache_key_distinguishes_targets_at_prefix_level() -> None:
    a = make_cache_key(jobs_cache_prefix(target_id="a"), page=1)
    b = make_cache_key(jobs_cache_prefix(target_id="b"), page=1)
    assert a.split(":")[:3] != b.split(":")[:3]


def test_invalidate_by_target_prefix_leaves_siblings_intact() -> None:
    cache = TTLCache(ttl=60.0, max_size=128)
    key_a = make_cache_key(jobs_cache_prefix(target_id="a"), page=1)
    key_b = make_cache_key(jobs_cache_prefix(target_id="b"), page=1)
    key_global = make_cache_key(jobs_cache_prefix(target_id=None), page=1)

    cache.set(key_a, {"target": "a"})
    cache.set(key_b, {"target": "b"})
    cache.set(key_global, {"target": "global"})

    cache.invalidate(prefix=f"{jobs_cache_prefix(target_id='a')}:")

    assert cache.get(key_a) is None
    assert cache.get(key_b) == {"target": "b"}
    assert cache.get(key_global) == {"target": "global"}


def test_invalidate_global_prefix_does_not_touch_target_views() -> None:
    cache = TTLCache(ttl=60.0, max_size=128)
    key_a = make_cache_key(jobs_cache_prefix(target_id="a"), page=1)
    key_global = make_cache_key(jobs_cache_prefix(target_id=None), page=1)

    cache.set(key_a, {"target": "a"})
    cache.set(key_global, {"target": "global"})

    cache.invalidate(prefix=f"{jobs_cache_prefix(target_id=None)}:")

    assert cache.get(key_a) == {"target": "a"}
    assert cache.get(key_global) is None
