from app.services.lighthouse_config import build_cli_args, config_for


def test_mobile_config_defaults() -> None:
    cfg = config_for("mobile")
    assert cfg.form_factor == "mobile"
    assert cfg.screen_emulation.mobile is True
    assert cfg.screen_emulation.width == 375


def test_desktop_config_overrides() -> None:
    cfg = config_for("desktop")
    assert cfg.form_factor == "desktop"
    assert cfg.screen_emulation.mobile is False
    assert cfg.screen_emulation.width == 1350
    assert cfg.throttling.rtt_ms == 40


def test_build_cli_args_includes_url_and_output_path() -> None:
    args = build_cli_args("https://example.com", "mobile", "/tmp/out.json")
    assert args[0] == "lighthouse"
    assert "https://example.com" in args
    assert "--output-path=/tmp/out.json" in args
    assert "--output=json" in args


def test_build_cli_args_passes_form_factor() -> None:
    args = build_cli_args("https://x.com", "desktop", "/tmp/o.json")
    assert "--form-factor=desktop" in args


def test_build_cli_args_includes_only_categories() -> None:
    args = build_cli_args("https://x.com", "mobile", "/tmp/o.json")
    cats = next(a for a in args if a.startswith("--only-categories="))
    assert "performance" in cats
    assert "accessibility" in cats
    assert "best-practices" in cats
    assert "seo" in cats


def test_build_cli_args_includes_throttling_overrides() -> None:
    args = build_cli_args("https://x.com", "mobile", "/tmp/o.json")
    assert "--throttling.cpuSlowdownMultiplier=1" in args
    assert "--throttling.downloadThroughputKbps=1600" in args
