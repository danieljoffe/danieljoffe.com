import asyncio
import logging
from dataclasses import dataclass

import sentry_sdk

from app.services.issues import parse_issues
from app.services.lighthouse_config import DeviceMode
from app.services.persistence import (
    ScanRowMissingError,
    mark_scan_failed,
    mark_scan_running,
    persist_scan_completion,
)
from app.services.scanner import ScanError, run_scan
from app.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

_ERROR_PATTERNS: list[tuple[str, str]] = [
    (
        "ERR_HTTP2_PROTOCOL_ERROR",
        "This site blocked our scanner. It uses bot detection that prevents automated audits.",
    ),
    (
        "ERR_CONNECTION_REFUSED",
        "Could not connect to this site. The server refused the connection.",
    ),
    (
        "ERR_NAME_NOT_RESOLVED",
        "This domain could not be found. Check the URL for typos.",
    ),
    (
        "ERR_CONNECTION_TIMED_OUT",
        "The site took too long to respond. It may be down or unreachable.",
    ),
    (
        "ERR_SSL_PROTOCOL_ERROR",
        "This site has an SSL/TLS configuration issue that prevents secure connections.",
    ),
    (
        "ERR_CERT_",
        "This site has an invalid or expired SSL certificate.",
    ),
    (
        "ERR_TOO_MANY_REDIRECTS",
        "This site has a redirect loop. Check the URL.",
    ),
    (
        "Timeout 30000ms exceeded",
        "This site took too long to load. It may be very slow or blocking automated browsers.",
    ),
]


def _friendly_error(raw: str) -> str:
    """Map raw Playwright/network errors to user-friendly messages."""
    for pattern, message in _ERROR_PATTERNS:
        if pattern in raw:
            return message
    return raw or "Unknown scan error"


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
                sentry_sdk.capture_exception(exc)
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
        except ScanRowMissingError as exc:
            # No row to mark_scan_failed against. Surface loudly — this is
            # almost always a DB/env config mismatch between the caller and
            # this service, and the scan never ran.
            logger.error("Scan aborted, row missing: %s | %s", job.scan_id, exc)
            sentry_sdk.capture_exception(exc)
        except ScanError as exc:
            await mark_scan_failed(supabase, job.scan_id, str(exc))
            logger.warning("Scan failed: %s | %s", job.scan_id, exc)
        except Exception as exc:
            message = _friendly_error(str(exc))
            await mark_scan_failed(supabase, job.scan_id, message)
            logger.exception("Scan errored: %s", job.scan_id)
            sentry_sdk.capture_exception(exc)


_queue: ScanQueue | None = None


def get_queue() -> ScanQueue:
    global _queue
    if _queue is None:
        _queue = ScanQueue()
    return _queue
