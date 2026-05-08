"""Tests for the in-process APScheduler wiring."""

from unittest.mock import patch

import pytest

from app.scheduler import build_scheduler, start_scheduler_if_enabled


def test_build_scheduler_registers_single_job() -> None:
    """``build_scheduler`` configures but does not start — verify the job
    is registered without needing a running event loop."""

    async def _noop() -> None:
        return None

    scheduler = build_scheduler(tick_minutes=15, job_func=_noop)
    jobs = scheduler.get_jobs()
    assert len(jobs) == 1
    assert jobs[0].id == "poll_due_sources"


def test_start_scheduler_returns_none_when_disabled() -> None:
    """Default settings have the scheduler off — verify nothing starts."""
    with patch("app.scheduler.settings") as mock_settings:
        mock_settings.poll_scheduler_enabled = False
        result = start_scheduler_if_enabled()
    assert result is None


@pytest.mark.asyncio
async def test_start_scheduler_returns_running_handle_when_enabled() -> None:
    """AsyncIOScheduler binds to the running loop, so this test has to
    be async — production calls it from inside the FastAPI lifespan."""
    with patch("app.scheduler.settings") as mock_settings:
        mock_settings.poll_scheduler_enabled = True
        mock_settings.poll_tick_minutes = 30
        scheduler = start_scheduler_if_enabled()

    assert scheduler is not None
    try:
        assert scheduler.running is True
        assert len(scheduler.get_jobs()) == 1
    finally:
        scheduler.shutdown(wait=False)


@pytest.mark.asyncio
async def test_run_scheduled_poll_invokes_due_poller_with_pool_client() -> None:
    """The tick body must pull the singleton supabase client and pass it
    to ``poll_due_sources``. Easy to break by accident — guard it."""
    from app.models.schemas import PollResult
    from app.scheduler import _run_scheduled_poll

    fake_client = object()
    fake_result = PollResult(
        sources_polled=1, new_jobs=2, updated_jobs=0, archived_jobs=0, errors=[]
    )

    with (
        patch("app.scheduler.get_supabase_pool", return_value=fake_client),
        patch("app.scheduler.poll_due_sources", autospec=True) as mock_poll,
    ):
        mock_poll.return_value = fake_result
        await _run_scheduled_poll()

    mock_poll.assert_awaited_once_with(fake_client)


@pytest.mark.asyncio
async def test_run_scheduled_poll_skips_when_supabase_uninitialized() -> None:
    """If Supabase env isn't configured, ``get_supabase_pool`` returns
    None — the tick should log+skip instead of crashing."""
    from app.scheduler import _run_scheduled_poll

    with (
        patch("app.scheduler.get_supabase_pool", return_value=None),
        patch("app.scheduler.poll_due_sources", autospec=True) as mock_poll,
    ):
        await _run_scheduled_poll()

    mock_poll.assert_not_called()


@pytest.mark.asyncio
async def test_run_scheduled_poll_swallows_exceptions() -> None:
    """APScheduler swallows exceptions from job bodies silently — that's
    a debugging trap. The tick must log and return cleanly itself."""
    from app.scheduler import _run_scheduled_poll

    with (
        patch("app.scheduler.get_supabase_pool", return_value=object()),
        patch("app.scheduler.poll_due_sources", side_effect=RuntimeError("kaboom")),
    ):
        # Must not raise.
        await _run_scheduled_poll()
