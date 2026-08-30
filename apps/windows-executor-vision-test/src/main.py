from __future__ import annotations

import argparse
import json
import platform
import sys
from datetime import datetime
from pathlib import Path

from .logger import JsonLogger
from .models import ProbeConfig, State
from .state_machine import StopProbe, VisionStateMachine
from .windows import find_wechat_window, normalize_window


def load_config(path: Path) -> ProbeConfig:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return ProbeConfig(
        wechat_version=str(raw["wechat_version"]),
        required_dpi=int(raw["required_dpi"]),
        window_width=int(raw["window_width"]),
        window_height=int(raw["window_height"]),
        test_wechat_id=str(raw["test_wechat_id"]),
        expected_nickname=str(raw["expected_nickname"]),
        test_remark=str(raw["test_remark"]),
        test_message=str(raw["test_message"]),
        step_timeout_seconds=int(raw["step_timeout_seconds"]),
        ocr_min_confidence=float(raw["ocr_min_confidence"]),
        template_min_confidence=float(raw["template_min_confidence"]),
        allow_controlled_input=bool(raw["allow_controlled_input"]),
        artifact_root=Path(__file__).resolve().parents[1] / "artifacts",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--allow-input", action="store_true")
    args = parser.parse_args()

    config = load_config(args.config)
    if args.allow_input:
        for field in ("test_wechat_id", "expected_nickname", "test_remark", "test_message"):
            value = str(getattr(config, field)).strip()
            if not value or value.startswith("REPLACE_WITH_"):
                raise ValueError(f"{field} must contain dedicated test data before controlled input")
    run_dir = config.artifact_root / datetime.now().strftime("%Y%m%d-%H%M%S")
    logger = JsonLogger(run_dir)
    logger.event("probe_start", python=sys.version, windows=platform.platform(), allow_input=args.allow_input)

    window = find_wechat_window()
    if not window:
        logger.event("probe_stop", state=State.FAILED.value, error_code="WECHAT_NOT_RUNNING", manual_required=True)
        return 2
    if window.version != config.wechat_version:
        logger.event("probe_stop", state=State.FAILED.value, error_code="WECHAT_VERSION_MISMATCH", expected=config.wechat_version, actual=window.version, manual_required=True)
        return 2
    if window.dpi != config.required_dpi:
        logger.event("probe_stop", state=State.FAILED.value, error_code="DPI_MISMATCH", expected=config.required_dpi, actual=window.dpi, manual_required=True)
        return 2
    if window.minimized:
        logger.event("probe_stop", state=State.FAILED.value, error_code="WECHAT_MINIMIZED", manual_required=True)
        return 2

    window = normalize_window(window, config.window_width, config.window_height)
    machine = VisionStateMachine(config, window, run_dir, logger, args.allow_input)
    fatal_error: str | None = None
    try:
        machine.run()
    except StopProbe as error:
        fatal_error = str(error)
    except Exception as error:  # Fail closed and preserve diagnostics.
        fatal_error = f"UNEXPECTED_ERROR: {type(error).__name__}: {error}"
        logger.event("unexpected_error", error_type=type(error).__name__, message=str(error), manual_required=True)

    passed = [result for result in machine.results if result.status == "PASS"]
    failed = [result for result in machine.results if result.status == "FAIL"]
    summary = {
        "final_state": machine.state.value,
        "go": machine.state == State.READY_TO_SUBMIT and not failed,
        "pass_count": len(passed),
        "fail_count": len(failed),
        "fatal_error": fatal_error,
        "environment": {
            "wechat_version": window.version,
            "dpi": window.dpi,
            "window_width": window.rect.width,
            "window_height": window.rect.height,
        },
        "results": [result.to_dict() for result in machine.results],
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.event("probe_complete", **summary)
    return 0 if summary["go"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
