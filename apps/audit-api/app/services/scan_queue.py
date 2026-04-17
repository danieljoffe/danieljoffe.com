import asyncio
import logging
from dataclasses import dataclass

from app.services.issues import parse_issues
from app.services.lighthouse_config import DeviceMode
from app.services.persistence import (
    mark_scan_failed,
    mark_scan_running,
    persist_scan_completion,
)
from app.services.scanner import ScanError, run_scan
from app.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ScanJob:
    scan_id: str
    url: str
    device: DeviceMode


class ScanQueue:
    """Serialized queue. Lighthouse uses global performance marks, so concurrent
    runs in the same process collide. One job at a time."""

    def __init__(self) -> None:
        self._queue: asyncio.Queue[ScanJob] = asyncio.Queue()
        self._worker: asyncio.Task[None] | None = None
        self._running: bool = False

    @property
    def size(self) -> int:
        return self._queue.qsize()

    @property
    def running(self) -> bool:
        return self._running

    def start(self) -> None:
        if self._worker is None or self._worker.done():
            self._worker = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        if self._worker is not None:
            self._worker.cancel()
            try:
                await self._worker
            except asyncio.CancelledError:
                pass
            except Exception:
                logger.exception("Scan worker raised during shutdown")
            self._worker = None

    async def enqueue(self, job: ScanJob) -> None:
        await self._queue.put(job)
        self.start()

    async def _run_loop(self) -> None:
        while True:
            job = await self._queue.get()
            self._running = True
            try:
                await self._execute(job)
            except Exception as exc:
                logger.exception("Scan worker crashed on %s: %s", job.scan_id, exc)
            finally:
                self._running = False
                self._queue.task_done()

    async def _execute(self, job: ScanJob) -> None:
        supabase = get_supabase_client()
        try:
            await mark_scan_running(supabase, job.scan_id)
            results = await run_scan(job.url, job.device, supabase=supabase)
            issues = parse_issues(results.lighthouse, results.axe)
            await persist_scan_completion(supabase, job.scan_id, results, issues)
            logger.info(
                "Scan completed: %s | %s | issues=%d",
                job.scan_id,
                job.device,
                len(issues),
            )
        except ScanError as exc:
            await mark_scan_failed(supabase, job.scan_id, str(exc))
            logger.warning("Scan failed: %s | %s", job.scan_id, exc)
        except Exception as exc:
            message = str(exc) or "Unknown scan error"
            await mark_scan_failed(supabase, job.scan_id, message)
            logger.exception("Scan errored: %s", job.scan_id)


_queue: ScanQueue | None = None


def get_queue() -> ScanQueue:
    global _queue
    if _queue is None:
        _queue = ScanQueue()
    return _queue
