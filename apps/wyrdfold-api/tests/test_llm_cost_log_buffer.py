"""CostLogBuffer: enqueue / flush / start / stop semantics."""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.services.llm.cost_log_buffer import CostLogBuffer


def _row(i: int) -> dict[str, Any]:
    return {"i": i, "purpose": "test", "cost_usd": 0.01 * i}


def _supabase_mock() -> MagicMock:
    sb = MagicMock()
    sb.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])
    return sb


def test_enqueue_appends_to_pending() -> None:
    buf = CostLogBuffer(max_size=10, flush_interval_s=60.0)
    buf.enqueue(_row(1))
    buf.enqueue(_row(2))
    assert buf.pending == 2


async def test_flush_writes_pending_rows_in_one_bulk_insert() -> None:
    buf = CostLogBuffer(max_size=100, flush_interval_s=60.0)
    sb = _supabase_mock()

    for i in range(5):
        buf.enqueue(_row(i))

    written = await buf.flush(sb)

    assert written == 5
    assert buf.pending == 0
    sb.table.assert_called_once_with("llm_costs")
    insert_arg = sb.table.return_value.insert.call_args.args[0]
    assert len(insert_arg) == 5
    assert insert_arg[0]["i"] == 0
    assert insert_arg[-1]["i"] == 4


async def test_flush_empty_buffer_is_noop() -> None:
    buf = CostLogBuffer()
    sb = _supabase_mock()
    written = await buf.flush(sb)
    assert written == 0
    sb.table.assert_not_called()


async def test_flush_failure_re_queues_rows_and_raises() -> None:
    buf = CostLogBuffer()
    sb = MagicMock()
    sb.table.return_value.insert.return_value.execute.side_effect = Exception("boom")

    buf.enqueue(_row(1))
    buf.enqueue(_row(2))

    with pytest.raises(Exception, match="boom"):
        await buf.flush(sb)

    # Rows must survive the failure so the next tick retries.
    assert buf.pending == 2


async def test_flush_failure_preserves_row_order_on_requeue() -> None:
    buf = CostLogBuffer()
    sb = MagicMock()
    sb.table.return_value.insert.return_value.execute.side_effect = Exception("boom")

    for i in range(3):
        buf.enqueue(_row(i))

    with pytest.raises(Exception):
        await buf.flush(sb)

    drained = buf._drain()
    assert [r["i"] for r in drained] == [0, 1, 2]


async def test_periodic_task_drains_buffer_on_interval() -> None:
    buf = CostLogBuffer(max_size=100, flush_interval_s=0.05)
    sb = _supabase_mock()

    buf.start(sb)
    try:
        buf.enqueue(_row(1))
        # Wait for at least one tick.
        for _ in range(20):
            await asyncio.sleep(0.05)
            if buf.pending == 0:
                break
        assert buf.pending == 0
        sb.table.return_value.insert.assert_called()
    finally:
        await buf.stop(sb)


async def test_max_size_triggers_early_flush() -> None:
    buf = CostLogBuffer(max_size=3, flush_interval_s=60.0)
    sb = _supabase_mock()

    buf.start(sb)
    try:
        for i in range(3):
            buf.enqueue(_row(i))
        # Hitting max_size sets the wakeup event; the flusher should
        # process well before the 60s interval.
        for _ in range(40):
            await asyncio.sleep(0.025)
            if buf.pending == 0:
                break
        assert buf.pending == 0
    finally:
        await buf.stop(sb)


async def test_stop_drains_remaining_rows() -> None:
    buf = CostLogBuffer(max_size=100, flush_interval_s=60.0)
    sb = _supabase_mock()

    buf.start(sb)
    buf.enqueue(_row(1))
    buf.enqueue(_row(2))

    await buf.stop(sb)
    assert buf.pending == 0
    insert_arg = sb.table.return_value.insert.call_args.args[0]
    assert len(insert_arg) == 2


def test_start_is_idempotent() -> None:
    buf = CostLogBuffer()
    sb = _supabase_mock()

    async def _go() -> None:
        buf.start(sb)
        first = buf._task
        buf.start(sb)
        # Second start is a noop while the task is alive.
        assert buf._task is first
        await buf.stop(sb)

    asyncio.run(_go())


async def test_enqueue_from_worker_thread_wakes_flusher() -> None:
    """Regression: ``enqueue`` is routinely called inside
    ``asyncio.to_thread`` workers. The early-flush wakeup must cross
    the thread boundary safely — ``asyncio.Event.set()`` is not
    thread-safe, so we use ``loop.call_soon_threadsafe``."""
    buf = CostLogBuffer(max_size=3, flush_interval_s=60.0)
    sb = _supabase_mock()

    buf.start(sb)
    try:
        # Fill exactly to max_size from a worker thread — this triggers
        # the cross-thread wakeup path. Without ``call_soon_threadsafe``
        # the flusher would either crash or only fire on the 60s tick.
        def _producer() -> None:
            for i in range(3):
                buf.enqueue(_row(i))

        await asyncio.to_thread(_producer)

        # Periodic task should drain well before the 60s interval.
        for _ in range(40):
            await asyncio.sleep(0.025)
            if buf.pending == 0:
                break
        assert buf.pending == 0
        sb.table.return_value.insert.assert_called()
    finally:
        await buf.stop(sb)


async def test_stop_does_not_lose_rows_to_cancelled_error() -> None:
    """Regression: an earlier version called ``task.cancel()`` to wind
    down the periodic task, but ``CancelledError`` inherits from
    ``BaseException`` and bypasses ``flush``'s ``except Exception``
    re-queue branch. Any rows drained mid-flush would be dropped.

    Cooperative shutdown lets the in-flight flush complete naturally,
    so when ``stop`` returns every enqueued row has either landed in
    the DB or been re-queued for the next process boot.
    """
    buf = CostLogBuffer(max_size=100, flush_interval_s=0.05)

    write_count = 0

    def _slow_execute() -> Any:
        nonlocal write_count
        # Simulate Supabase taking a beat to ack. Real ``execute`` is
        # sync, so we mirror that — ``flush`` already wraps the call in
        # ``to_thread`` so the loop stays responsive.
        import time

        time.sleep(0.05)
        write_count += 1
        return MagicMock(data=[])

    sb = MagicMock()
    sb.table.return_value.insert.return_value.execute.side_effect = _slow_execute

    buf.start(sb)
    for i in range(5):
        buf.enqueue(_row(i))
    # Give the periodic task a tick to start the first flush.
    await asyncio.sleep(0.06)

    await buf.stop(sb)

    # All five rows must be accounted for — either the in-flight flush
    # finished cleanly or stop's final flush picked them up. Either way
    # nothing should be sitting in ``_rows`` and ``execute`` must have
    # been called at least once.
    assert buf.pending == 0
    assert write_count >= 1
