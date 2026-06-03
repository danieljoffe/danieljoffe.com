"""In-process job scheduler for periodic polling.

Wraps APScheduler's ``AsyncIOScheduler`` so the FastAPI lifespan can
start/stop a single recurring job that calls ``poll_due_sources``.

The scheduler is **off by default** — opt-in via the
``POLL_SCHEDULER_ENABLED`` env var. Tests should leave it disabled so
the lifespan stays deterministic; ops enable it on the production
process. Any external cron driver (pg_cron, GitHub Actions) can call
``POST /poll/due`` instead and reach the same code path.

Single-instance assumption: APScheduler with ``max_instances=1`` and
``coalesce=True`` is safe for a single FastAPI process. If we ever
horizontally scale the API, swap this for an external trigger so we
don't double-poll.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore[import-untyped]
from apscheduler.triggers.interval import IntervalTrigger  # type: ignore[import-untyped]

from app.cache import job_list_cache
from app.config import settings
from app.services.poller import poll_due_sources
from app.services.url_health import run_url_health_check
from app.supabase_pool import get_supabase_pool

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

logger = logging.getLogger(__name__)


async def _run_scheduled_poll() -> None:
    """Tick body — fetch due sources and invalidate the list cache.

    Errors are logged but never raised; APScheduler would otherwise
    suppress and we'd lose the trace.
    """
    try:
        client = get_supabase_pool()
        if client is None:
            logger.warning("scheduled poll skipped — supabase client not initialized")
            return
        result = await poll_due_sources(client)
        if result.sources_polled > 0:
            job_list_cache.invalidate()
        logger.info(
            "scheduled poll: polled=%d new=%d updated=%d archived=%d errors=%d",
            result.sources_polled,
            result.new_jobs,
            result.updated_jobs,
            result.archived_jobs,
            len(result.errors),
        )
    except Exception:
        logger.exception("scheduled poll raised")


async def _run_scheduled_url_health() -> None:
    """Tick body — HEAD-check the oldest batch of job URLs and archive dead ones.

    See ``app/services/url_health.py``. Errors are logged but never raised
    (same pattern as ``_run_scheduled_poll``). Invalidates the list cache
    when jobs were archived this tick so users see the updated state on
    next page load.
    """
    try:
        client = get_supabase_pool()
        if client is None:
            logger.warning(
                "scheduled url_health skipped — supabase client not initialized"
            )
            return
        summary = await run_url_health_check(client)
        if summary["archived"] > 0:
            job_list_cache.invalidate()
    except Exception:
        logger.exception("scheduled url_health raised")


def build_scheduler(
    *, tick_minutes: int, job_func: Callable[[], Awaitable[None]] = _run_scheduled_poll
) -> AsyncIOScheduler:
    """Construct a configured but unstarted scheduler.

    ``coalesce=True`` collapses missed ticks into one (e.g. if the
    process was paused). ``max_instances=1`` prevents two ticks from
    running concurrently — the poll itself is async-concurrent, so a
    second tick mid-fetch would just add contention.
    """
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        job_func,
        IntervalTrigger(minutes=tick_minutes),
        id="poll_due_sources",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
    )
    return scheduler


def start_scheduler_if_enabled() -> AsyncIOScheduler | None:
    """Build, start, and return the scheduler, or ``None`` when disabled.

    Called from the FastAPI lifespan; the returned handle is what the
    lifespan must shut down on exit.

    Two independent recurring jobs may run on the same scheduler:
      - ``poll_due_sources`` — gated on ``POLL_SCHEDULER_ENABLED``
      - ``url_health_check`` — gated on ``URL_HEALTH_CHECK_ENABLED``

    If both flags are off, no scheduler is started. If only one flag is on,
    only that job is registered. Sharing one scheduler avoids two thread
    pools competing in the same FastAPI process.
    """
    if not (settings.poll_scheduler_enabled or settings.url_health_check_enabled):
        logger.info(
            "schedulers disabled (set POLL_SCHEDULER_ENABLED=true or "
            "URL_HEALTH_CHECK_ENABLED=true to enable)"
        )
        return None

    scheduler = AsyncIOScheduler()

    if settings.poll_scheduler_enabled:
        scheduler.add_job(
            _run_scheduled_poll,
            IntervalTrigger(minutes=settings.poll_tick_minutes),
            id="poll_due_sources",
            max_instances=1,
            coalesce=True,
            replace_existing=True,
        )
        logger.info(
            "poll scheduler registered (tick every %d min)",
            settings.poll_tick_minutes,
        )

    if settings.url_health_check_enabled:
        scheduler.add_job(
            _run_scheduled_url_health,
            IntervalTrigger(hours=settings.url_health_tick_hours),
            id="url_health_check",
            max_instances=1,
            coalesce=True,
            replace_existing=True,
        )
        logger.info(
            "url_health scheduler registered (tick every %d h)",
            settings.url_health_tick_hours,
        )

    scheduler.start()
    return scheduler
