import asyncio
import json
import logging
import os
import signal
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.services.browser_pool import get_browser_pool
from app.services.lighthouse_config import DeviceMode, build_cli_args, config_for

logger = logging.getLogger(__name__)

LIGHTHOUSE_BIN = os.environ.get("LIGHTHOUSE_BIN", "lighthouse")
AXE_SCRIPT_PATH = os.environ.get("AXE_SCRIPT_PATH", "/app/vendor/axe.min.js")
SCAN_TIMEOUT_SEC = int(os.environ.get("SCAN_TIMEOUT_SEC", "90"))
AXE_TIMEOUT_SEC = int(os.environ.get("AXE_TIMEOUT_SEC", "30"))

_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)


@dataclass(frozen=True)
class ScanResults:
    lighthouse: dict[str, Any]
    axe: dict[str, Any]
    page_title: str
    page_description: str
    screenshot_url: str | None


class ScanError(RuntimeError):
    """Lighthouse run failed or returned unusable output."""


def _kill_process_group(proc: asyncio.subprocess.Process) -> None:
    """Kill the entire process group that *proc* leads.

    Lighthouse's Node process spawns Chrome as a child via chrome-launcher.
    A bare proc.kill() only SIGKILLs the Node process; Chrome survives as
    an orphan, consuming memory and blocking subsequent scans with "Unable
    to connect to Chrome." start_new_session=True on the subprocess puts
    the tree in its own process group so killpg reaches Chrome too.
    """
    if proc.pid is None:
        return
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    except (ProcessLookupError, OSError):
        pass


async def _run_lighthouse(url: str, device: DeviceMode) -> dict[str, Any]:
    with tempfile.TemporaryDirectory() as tmpdir:
        output_path = str(Path(tmpdir) / "report.json")
        args = build_cli_args(url, device, output_path)
        args[0] = LIGHTHOUSE_BIN

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            start_new_session=True,
        )
        try:
            _, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=SCAN_TIMEOUT_SEC
            )
        except TimeoutError as exc:
            # Kill the entire process group — not just the Node process.
            # Without this, Chrome is orphaned and causes the next scan to
            # fail with "Unable to connect to Chrome."
            _kill_process_group(proc)
            await proc.wait()
            raise ScanError(f"Lighthouse timed out after {SCAN_TIMEOUT_SEC}s") from exc

        if not Path(output_path).exists():
            detail = stderr.decode(errors="replace").strip() if stderr else ""
            raise ScanError(f"Lighthouse produced no output. stderr: {detail[:500]}")

        with open(output_path, encoding="utf-8") as f:
            return dict(json.load(f))


async def _run_axe_and_capture(
    url: str, device: DeviceMode
) -> tuple[dict[str, Any], str, str, bytes | None]:
    pool = get_browser_pool()
    browser = await pool.acquire()
    try:
        cfg = config_for(device)
        context = await browser.new_context(
            viewport={
                "width": cfg.screen_emulation.width,
                "height": cfg.screen_emulation.height,
            },
            device_scale_factor=cfg.screen_emulation.device_scale_factor,
            is_mobile=cfg.screen_emulation.mobile,
            user_agent=_USER_AGENT,
        )
        context.set_default_timeout(30_000)
        try:
            page = await context.new_page()
            await page.goto(url, wait_until="load", timeout=30_000)
            try:
                await page.wait_for_load_state("networkidle", timeout=10_000)
            except Exception:
                logger.info("networkidle not reached for %s; proceeding after load", url)

            page_title = await page.title()
            page_description = ""
            try:
                handle = await page.query_selector('meta[name="description"]')
                if handle is not None:
                    page_description = await handle.get_attribute("content") or ""
            except Exception:
                page_description = ""

            screenshot_bytes: bytes | None = None
            try:
                screenshot_bytes = await page.screenshot(
                    type="jpeg", quality=60, full_page=False
                )
            except Exception as exc:
                logger.warning("Screenshot capture failed: %s", exc)

            axe_result: dict[str, Any] = {"violations": []}
            axe_path = Path(AXE_SCRIPT_PATH)
            if axe_path.exists():
                await page.add_script_tag(path=str(axe_path))
                try:
                    raw = await asyncio.wait_for(
                        page.evaluate("async () => await window.axe.run(document)"),
                        timeout=AXE_TIMEOUT_SEC,
                    )
                except TimeoutError:
                    logger.warning(
                        "axe.run timed out after %ss; returning empty violations",
                        AXE_TIMEOUT_SEC,
                    )
                    raw = None
                if isinstance(raw, dict):
                    axe_result = raw
            else:
                logger.warning("axe.min.js not found at %s; skipping axe", axe_path)

            return axe_result, page_title, page_description, screenshot_bytes
        finally:
            await context.close()
    finally:
        await pool.release()


async def _upload_screenshot(
    supabase: Any, screenshot_bytes: bytes | None
) -> str | None:
    if not screenshot_bytes or supabase is None:
        return None
    try:
        filename = f"{uuid.uuid4().hex}.jpg"
        storage = supabase.storage.from_("screenshots")
        await asyncio.to_thread(
            storage.upload,
            filename,
            screenshot_bytes,
            {"content-type": "image/jpeg", "cache-control": "31536000"},
        )
        public = await asyncio.to_thread(storage.get_public_url, filename)
        if isinstance(public, dict):
            return str(public.get("publicUrl") or "") or None
        return str(public) if public else None
    except Exception as exc:
        logger.warning("Screenshot upload failed: %s", exc)
        return None


async def run_scan(
    url: str,
    device: DeviceMode = "mobile",
    supabase: Any | None = None,
) -> ScanResults:
    # Run Lighthouse and Playwright in parallel — they use independent processes
    lighthouse_task = asyncio.create_task(_run_lighthouse(url, device))
    axe_task = asyncio.create_task(_run_axe_and_capture(url, device))

    # Wait for both; if Lighthouse fails, still let axe finish for cleanup
    lighthouse_result, axe_results = await asyncio.gather(
        lighthouse_task, axe_task, return_exceptions=True
    )

    # Re-raise Lighthouse errors
    if isinstance(lighthouse_result, BaseException):
        raise lighthouse_result

    # Re-raise Playwright errors
    if isinstance(axe_results, BaseException):
        raise axe_results

    axe_result, page_title, page_description, screenshot_bytes = axe_results

    # Upload screenshot concurrently (doesn't block result assembly)
    screenshot_url = await _upload_screenshot(supabase, screenshot_bytes)

    return ScanResults(
        lighthouse=lighthouse_result,
        axe=axe_result,
        page_title=page_title,
        page_description=page_description,
        screenshot_url=screenshot_url,
    )
