from dataclasses import dataclass
from typing import Literal

DeviceMode = Literal["mobile", "desktop"]

LIGHTHOUSE_CATEGORIES = ["performance", "accessibility", "best-practices", "seo"]

CHROME_FLAGS = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-crash-reporter",
    "--disable-breakpad",
    "--disable-software-rasterizer",
    "--single-process",
    "--no-zygote",
]


@dataclass(frozen=True)
class ScreenEmulation:
    mobile: bool
    width: int
    height: int
    device_scale_factor: float


@dataclass(frozen=True)
class Throttling:
    cpu_slowdown_multiplier: int
    download_throughput_kbps: int
    upload_throughput_kbps: int
    rtt_ms: int


@dataclass(frozen=True)
class LighthouseConfig:
    form_factor: DeviceMode
    throttling: Throttling
    screen_emulation: ScreenEmulation


MOBILE_CONFIG = LighthouseConfig(
    form_factor="mobile",
    throttling=Throttling(
        cpu_slowdown_multiplier=1,
        download_throughput_kbps=1600,
        upload_throughput_kbps=750,
        rtt_ms=150,
    ),
    screen_emulation=ScreenEmulation(
        mobile=True, width=375, height=812, device_scale_factor=3
    ),
)

DESKTOP_CONFIG = LighthouseConfig(
    form_factor="desktop",
    throttling=Throttling(
        cpu_slowdown_multiplier=1,
        download_throughput_kbps=10240,
        upload_throughput_kbps=10240,
        rtt_ms=40,
    ),
    screen_emulation=ScreenEmulation(
        mobile=False, width=1350, height=940, device_scale_factor=1
    ),
)


def config_for(device: DeviceMode) -> LighthouseConfig:
    return DESKTOP_CONFIG if device == "desktop" else MOBILE_CONFIG


def build_cli_args(url: str, device: DeviceMode, output_path: str) -> list[str]:
    cfg = config_for(device)
    chrome_flags = " ".join(CHROME_FLAGS)
    return [
        "lighthouse",
        url,
        f"--output-path={output_path}",
        "--output=json",
        "--quiet",
        "--only-categories=" + ",".join(LIGHTHOUSE_CATEGORIES),
        f"--form-factor={cfg.form_factor}",
        "--throttling-method=simulate",
        f"--throttling.cpuSlowdownMultiplier={cfg.throttling.cpu_slowdown_multiplier}",
        f"--throttling.downloadThroughputKbps={cfg.throttling.download_throughput_kbps}",
        f"--throttling.uploadThroughputKbps={cfg.throttling.upload_throughput_kbps}",
        f"--throttling.rttMs={cfg.throttling.rtt_ms}",
        f"--screen-emulation.mobile={'true' if cfg.screen_emulation.mobile else 'false'}",
        f"--screen-emulation.width={cfg.screen_emulation.width}",
        f"--screen-emulation.height={cfg.screen_emulation.height}",
        f"--screen-emulation.deviceScaleFactor={cfg.screen_emulation.device_scale_factor}",
        f"--chrome-flags={chrome_flags}",
    ]
