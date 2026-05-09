"""Async cost-log buffer for cron paths.

Background
----------
`cost_log.record(...)` writes one `llm_costs` row per LLM completion via
a synchronous Supabase INSERT. Each call is its own DB round-trip.

For interactive paths (analysis, tailor, conversation) that's fine — the
user is already waiting on the LLM, and the spend record needs to be
queryable immediately for the budget guard.

For cron paths (poller stage-3 LLM scoring, batch endpoints) the per-row
INSERT doubles the wall-clock cost of each completion. The poller fans
out N concurrent LLM calls under `LLM_CONCURRENCY = 3`, so each tick
turns into 2N Supabase round-trips on top of N Anthropic calls.

This buffer batches those writes:
  - `enqueue(row)` is O(1), appends to an in-memory list under a lock
  - `flush(supabase)` drains the buffer into a single bulk INSERT
  - `start(supabase)` spawns a background task that flushes every
    `flush_interval_s` seconds (or whenever the buffer reaches
    `max_size`, whichever comes first)
  - `stop(supabase)` drains and shuts down the background task

On flush failure the rows are re-queued so a transient Supabase outage
doesn't drop spend data — the next tick will retry. Pair with
provider-side spend alerts for a hard ceiling.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import threading
from typing import Any

from supabase import Client

TABLE = "llm_costs"

_log = logging.getLogger(__name__)


class CostLogBuffer:
    def __init__(
        self,
        *,
        max_size: int = 100,
        flush_interval_s: float = 5.0,
    ) -> None:
        self._max_size = max_size
        self._flush_interval_s = flush_interval_s
        self._rows: list[dict[str, Any]] = []
        self._lock = threading.Lock()
        self._task: asyncio.Task[None] | None = None
        self._stopping = False
        # Set when a row is enqueued; the background task waits on this
        # to flush early when the buffer is full.
        self._wakeup: asyncio.Event | None = None

    @property
    def pending(self) -> int:
        with self._lock:
            return len(self._rows)

    def enqueue(self, row: dict[str, Any]) -> None:
        """Add one row to the buffer. Thread-safe; safe to call from
        sync code (e.g. inside `asyncio.to_thread`)."""
        with self._lock:
            self._rows.append(row)
            full = len(self._rows) >= self._max_size
        if full and self._wakeup is not None:
            # Wake the flusher early; loop captures and clears the event.
            self._wakeup.set()

    def _drain(self) -> list[dict[str, Any]]:
        with self._lock:
            rows, self._rows = self._rows, []
        return rows

    def _requeue(self, rows: list[dict[str, Any]]) -> None:
        """Push failed rows back to the front so retries preserve order."""
        with self._lock:
            self._rows = rows + self._rows

    async def flush(self, supabase: Client) -> int:
        """Drain the buffer and write the rows in a single INSERT.

        Returns the number of rows written. Re-queues on failure and
        re-raises so the caller can decide whether to log/retry.
        """
        rows = self._drain()
        if not rows:
            return 0
        try:
            await asyncio.to_thread(
                lambda: supabase.table(TABLE).insert(rows).execute()
            )
        except Exception:
            self._requeue(rows)
            _log.exception(
                "cost-log buffer flush failed; re-queued %d row(s)", len(rows)
            )
            raise
        return len(rows)

    async def _run(self, supabase: Client) -> None:
        # `_wakeup` is created synchronously in `start` before this task
        # is scheduled, so it's never None here.
        wakeup = self._wakeup
        if wakeup is None:
            return
        try:
            while not self._stopping:
                with contextlib.suppress(TimeoutError):
                    await asyncio.wait_for(
                        wakeup.wait(), timeout=self._flush_interval_s
                    )
                wakeup.clear()
                with contextlib.suppress(Exception):
                    # `flush` already logs the exception; the loop just
                    # needs to keep going so the next tick retries.
                    await self.flush(supabase)
        finally:
            self._wakeup = None

    def start(self, supabase: Client) -> None:
        """Spawn the periodic flush task. Idempotent.

        Must be called from within a running asyncio loop (e.g. the
        FastAPI lifespan body). Creates the wakeup Event up-front so
        `enqueue(...)` calls that happen between `start()` and the
        task's first `await` still trigger an early flush at max-size.
        """
        if self._task is not None and not self._task.done():
            return
        self._stopping = False
        self._wakeup = asyncio.Event()
        self._task = asyncio.create_task(self._run(supabase))

    async def stop(self, supabase: Client) -> None:
        """Cancel the periodic task and drain any remaining rows."""
        self._stopping = True
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None
        with contextlib.suppress(Exception):
            await self.flush(supabase)


# Module-level singleton — every cron caller writes through the same
# buffer so a single bulk INSERT can collect rows from multiple
# concurrent LLM calls.
buffer = CostLogBuffer()
