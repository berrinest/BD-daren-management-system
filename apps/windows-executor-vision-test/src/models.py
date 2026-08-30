from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path
from typing import Any


class State(str, Enum):
    WECHAT_HOME = "WECHAT_HOME"
    ADD_FRIEND_ENTRY = "ADD_FRIEND_ENTRY"
    ADD_FRIEND_SEARCH_READY = "ADD_FRIEND_SEARCH_READY"
    SEARCH_READY = "SEARCH_READY"
    SEARCHING = "SEARCHING"
    SEARCH_RESULT = "SEARCH_RESULT"
    CONTACT_PROFILE = "CONTACT_PROFILE"
    ADD_FRIEND = "ADD_FRIEND"
    FORM_READY = "FORM_READY"
    READY_TO_SUBMIT = "READY_TO_SUBMIT"
    UNKNOWN = "UNKNOWN"
    FAILED = "FAILED"


@dataclass(frozen=True)
class Rect:
    left: int
    top: int
    right: int
    bottom: int

    @property
    def width(self) -> int:
        return self.right - self.left

    @property
    def height(self) -> int:
        return self.bottom - self.top

    @property
    def center(self) -> tuple[int, int]:
        return ((self.left + self.right) // 2, (self.top + self.bottom) // 2)


@dataclass(frozen=True)
class OcrItem:
    text: str
    confidence: float
    rect: Rect


@dataclass
class StepResult:
    step: str
    status: str
    duration_ms: int
    confidence: float | None = None
    error_code: str | None = None
    error_message: str | None = None
    screenshot_path: str | None = None
    manual_required: bool = False
    evidence: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ProbeConfig:
    wechat_version: str
    required_dpi: int
    window_width: int
    window_height: int
    test_wechat_id: str
    expected_nickname: str
    test_remark: str
    test_message: str
    step_timeout_seconds: int
    ocr_min_confidence: float
    template_min_confidence: float
    allow_controlled_input: bool
    artifact_root: Path
