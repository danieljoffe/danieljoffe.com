"""Persistent browser pool with idle shutdown.

Keeps a single Chromium instance alive between scans, creating fresh
browser contexts per scan for cookie/state isolation. Shuts down
automatically after BROWSER_IDLE_SEC of inactivity.
"""

import asyncio
import logging
import os
from typing import Any

from playwright.async_api import Browser, Playwright, async_playwright

logger = logging.getLogger(__name__)

BROWSER_IDLE_SEC = int(os.environ.get("BROWSER_IDLE_SEC", "1800"))  # 30 minutes

_LAUNCH_ARGS = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-setuid-sandbox",
]


class BrowserPool:
    """Manages a persistent Chromium browser with idle-timeout shutdown."""

    def __init__(self) -> None:
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._lock = asyncio.Lock()
        self._idle_handle: asyncio.TimerHandle | None = None
        self._scan_count = 0

    async def acquire(self) -> Browser:
        """Get the browser instance, launching if needed. Resets idle timer."""
        async with self._lock:
            self._cancel_idle_timer()
            if self._browser is None or not self._browser.is_connected():
                await self._launch()
            self._scan_count += 1
            assert self._browser is not None
            return self._browser

    async def release(self) -> None:
        """Signal that a scan finished. Starts idle timer if no scans active."""
        async with self._lock:
            self._scan_count = max(0, self._scan_count - 1)
            if self._scan_count == 0:
                self._schedule_idle_shutdown()

    async def shutdown(self) -> None:
        """Force-close the browser (called on app shutdown)."""
        async with self._lock:
            self._cancel_idle_timer()
            await self._close()

    @property
    def is_running(self) -> bool:
        return self._browser is not None and self._browser.is_connected()

    async def _launch(self) -> None:
        if self._browser and self._browser.is_connected():
            return
        await self._close()
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(args=_LAUNCH_ARGS)
        logger.info("Browser launched")

    async def _close(self) -> None:
        if self._browser:
            try:
                await self._browser.close()
            except Exception:
                pass
            self._browser = None
        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception:
                pass
            self._playwright = None
        logger.info("Browser closed")

    def _schedule_idle_shutdown(self) -> None:
        loop = asyncio.get_event_loop()
        self._idle_handle = loop.call_later(
            BROWSER_IDLE_SEC, lambda: asyncio.ensure_future(self._idle_shutdown())
        )

    async def _idle_shutdown(self) -> None:
        async with self._lock:
            if self._scan_count == 0:
                logger.info(
                    "Browser idle for %ds, shutting down", BROWSER_IDLE_SEC
                )
                await self._close()

    def _cancel_idle_timer(self) -> None:
        if self._idle_handle:
            self._idle_handle.cancel()
            self._idle_handle = None


_pool: BrowserPool | None = None


def get_browser_pool() -> BrowserPool:
    global _pool
    if _pool is None:
        _pool = BrowserPool()
    return _pool
