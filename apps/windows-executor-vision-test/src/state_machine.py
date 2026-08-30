from __future__ import annotations

import time
from pathlib import Path
from typing import Callable

from PIL import Image

from .logger import JsonLogger
from .models import OcrItem, ProbeConfig, Rect, State, StepResult
from .vision import VisionEngine
from .windows import (
    WechatWindow,
    click_screen,
    find_wechat_dialog,
    focus_window,
    foreground_wechat_window,
    is_foreground,
    is_foreground_same_process,
    is_occluded,
    move_cursor_screen,
    paste_text,
    screenshot,
)


class StopProbe(RuntimeError):
    pass


class VisionStateMachine:
    def __init__(
        self,
        config: ProbeConfig,
        window: WechatWindow,
        run_dir: Path,
        logger: JsonLogger,
        allow_input: bool,
    ) -> None:
        self.config = config
        self.window = window
        self.run_dir = run_dir
        self.logger = logger
        self.allow_input = allow_input and config.allow_controlled_input
        self.vision = VisionEngine()
        self.results: list[StepResult] = []
        self.state = State.UNKNOWN

    def _capture(self, step: str) -> tuple[Image.Image, Path, list[OcrItem]]:
        image = screenshot(self.window)
        path = self.run_dir / f"{len(self.results):02d}-{step}.png"
        image.save(path)
        items = self.vision.read(image)
        self.logger.event(
            "capture",
            step=step,
            screenshot_path=str(path),
            ocr=[{"text": item.text, "confidence": item.confidence, "rect": item.rect.__dict__} for item in items],
        )
        return image, path, items

    def _record(
        self,
        step: str,
        started: float,
        passed: bool,
        path: Path,
        confidence: float | None = None,
        error_code: str | None = None,
        error_message: str | None = None,
        evidence: dict | None = None,
    ) -> None:
        result = StepResult(
            step=step,
            status="PASS" if passed else "FAIL",
            duration_ms=int((time.monotonic() - started) * 1000),
            confidence=confidence,
            error_code=error_code,
            error_message=error_message,
            screenshot_path=str(path),
            manual_required=not passed,
            evidence=evidence,
        )
        self.results.append(result)
        self.logger.event("step_result", **result.to_dict())
        if not passed:
            self.state = State.FAILED
            raise StopProbe(f"{step}: {error_code}: {error_message}")

    def _guard_window(self, step: str, allow_same_process_popup: bool = False) -> None:
        if allow_same_process_popup and is_foreground_same_process(self.window):
            return
        if not is_foreground(self.window):
            image, path, _items = self._capture(step)
            del image
            self._record(step, time.monotonic(), False, path, error_code="WINDOW_NOT_FOREGROUND", error_message="WeChat is not foreground")
        if is_occluded(self.window):
            image, path, _items = self._capture(step)
            del image
            self._record(step, time.monotonic(), False, path, error_code="WINDOW_OCCLUDED", error_message="WeChat center is occluded")

    def _wait_for(
        self,
        step: str,
        predicate: Callable[[list[OcrItem]], list[OcrItem]],
        timeout_error_code: str = "TIMEOUT",
        timeout_error_message: str | None = None,
        allow_same_process_popup: bool = False,
    ) -> tuple[Image.Image, Path, list[OcrItem]]:
        deadline = time.monotonic() + self.config.step_timeout_seconds
        latest_path: Path | None = None
        while time.monotonic() < deadline:
            self._guard_window(step, allow_same_process_popup)
            image, latest_path, items = self._capture(step)
            matches = predicate(items)
            if matches:
                return image, latest_path, matches
            time.sleep(0.5)
        if latest_path is None:
            _image, latest_path, _items = self._capture(step)
        self._record(
            step,
            deadline - self.config.step_timeout_seconds,
            False,
            latest_path,
            error_code=timeout_error_code,
            error_message=timeout_error_message or f"No reliable state within {self.config.step_timeout_seconds}s",
        )
        raise AssertionError("unreachable")

    def _absolute_center(self, item: OcrItem) -> tuple[int, int]:
        x, y = item.rect.center
        return self.window.rect.left + x, self.window.rect.top + y

    @staticmethod
    def _nearest_input_region(regions: list[Rect]) -> list[Rect]:
        if not regions:
            return []
        nearest_top = min(region.top for region in regions)
        nearest = [region for region in regions if abs(region.top - nearest_top) <= 6]
        return [max(nearest, key=lambda region: region.width * region.height)]

    def run(self) -> list[StepResult]:
        focus_window(self.window)
        self._guard_window("WECHAT_HOME")
        move_cursor_screen(self.window.rect.right - 120, self.window.rect.top + 110)
        time.sleep(0.2)
        started = time.monotonic()
        home_image, path, home_items = self._capture("WECHAT_HOME")
        plus_labels = [
            item
            for item in self.vision.find_text(
                home_items,
                ["+"],
                0.60,
                exact=True,
            )
            if item.rect.top < 110 and item.rect.left < self.window.rect.width * 0.45
        ]
        open_menu_entries = [
            item
            for item in self.vision.find_text(
                home_items,
                ["添加朋友", "添加好友"],
                self.config.ocr_min_confidence,
            )
            if item.rect.left < self.window.rect.width * 0.45
        ]
        self._record(
            "WECHAT_HOME",
            started,
            len(plus_labels) == 1 or len(open_menu_entries) == 1,
            path,
            max((item.confidence for item in plus_labels + open_menu_entries), default=None),
            "ADD_MENU_ENTRY_STATE_AMBIGUOUS"
            if len(plus_labels) != 1 and len(open_menu_entries) != 1
            else None,
            f"Top add buttons={len(plus_labels)}, open menu entries={len(open_menu_entries)}"
            if len(plus_labels) != 1 and len(open_menu_entries) != 1
            else None,
        )

        if not self.allow_input:
            self._record("CONTROLLED_INPUT_GATE", time.monotonic(), False, path, error_code="INPUT_NOT_AUTHORIZED", error_message="Observation succeeded; enable config and --allow-input for the dedicated test account")

        if not open_menu_entries:
            click_screen(*self._absolute_center(plus_labels[0]))
        self.state = State.ADD_FRIEND_ENTRY

        started = time.monotonic()
        _image, path, add_entry_matches = self._wait_for(
            "ADD_FRIEND_ENTRY",
            lambda items: self.vision.find_text(
                items,
                ["添加朋友", "添加好友"],
                self.config.ocr_min_confidence,
                exact=False,
            ),
            timeout_error_code="ADD_FRIEND_ENTRY_NOT_FOUND",
            timeout_error_message="The top + menu did not expose a unique Add Friend entry",
            allow_same_process_popup=True,
        )
        self._record(
            "ADD_FRIEND_ENTRY",
            started,
            len(add_entry_matches) == 1,
            path,
            max((item.confidence for item in add_entry_matches), default=None),
            "ADD_FRIEND_ENTRY_AMBIGUOUS" if len(add_entry_matches) != 1 else None,
            f"Add Friend menu entries: {len(add_entry_matches)}" if len(add_entry_matches) != 1 else None,
        )
        click_screen(*self._absolute_center(add_entry_matches[0]))

        time.sleep(0.6)
        add_friend_dialog = find_wechat_dialog(self.window)
        if add_friend_dialog is None:
            _image, dialog_path, _items = self._capture("ADD_FRIEND_SEARCH_READY")
            self._record(
                "ADD_FRIEND_SEARCH_READY",
                time.monotonic(),
                False,
                dialog_path,
                error_code="ADD_FRIEND_DIALOG_NOT_FOUND",
                error_message="No WeChat-owned Add Friend dialog appeared",
            )
        self.window = add_friend_dialog

        started = time.monotonic()
        _image, path, add_search_matches = self._wait_for(
            "ADD_FRIEND_SEARCH_READY",
            lambda items: self.vision.find_text(
                items,
                ["微信号/手机号", "微信号或手机号", "微信号或者手机号", "账号/手机号"],
                self.config.ocr_min_confidence,
            ),
            timeout_error_code="ADD_FRIEND_SEARCH_NOT_FOUND",
            timeout_error_message="The dedicated Add Friend account input was not found",
        )
        self._record(
            "ADD_FRIEND_SEARCH_READY",
            started,
            len(add_search_matches) == 1,
            path,
            max((item.confidence for item in add_search_matches), default=None),
            "ADD_FRIEND_SEARCH_AMBIGUOUS" if len(add_search_matches) != 1 else None,
            f"Dedicated account inputs: {len(add_search_matches)}" if len(add_search_matches) != 1 else None,
        )
        self.state = State.ADD_FRIEND_SEARCH_READY
        click_screen(*self._absolute_center(add_search_matches[0]))
        paste_text(self.config.test_wechat_id)
        self.state = State.SEARCHING

        started = time.monotonic()
        _image, path, input_matches = self._wait_for(
            "SEARCHING",
            lambda items: [
                item
                for item in self.vision.find_text(
                    items,
                    [self.config.test_wechat_id],
                    self.config.ocr_min_confidence,
                    exact=True,
                )
                if item.rect.top < 100 and item.rect.left < self.window.rect.width * 0.45
            ],
        )
        self._record("SEARCHING", started, len(input_matches) == 1, path, max(item.confidence for item in input_matches), "SEARCH_INPUT_NOT_VERIFIED" if len(input_matches) != 1 else None, f"Search input matches: {len(input_matches)}" if len(input_matches) != 1 else None)

        started = time.monotonic()
        _image, path, search_button_matches = self._wait_for(
            "SEARCH_SUBMIT",
            lambda items: self.vision.find_text(
                items,
                ["搜索"],
                self.config.ocr_min_confidence,
                exact=True,
            ),
            timeout_error_code="ADD_FRIEND_SEARCH_BUTTON_NOT_FOUND",
            timeout_error_message="The dedicated Add Friend search button was not found",
        )
        self._record(
            "SEARCH_SUBMIT",
            started,
            len(search_button_matches) == 1,
            path,
            max((item.confidence for item in search_button_matches), default=None),
            "ADD_FRIEND_SEARCH_BUTTON_AMBIGUOUS" if len(search_button_matches) != 1 else None,
            f"Dedicated search buttons: {len(search_button_matches)}"
            if len(search_button_matches) != 1
            else None,
        )
        click_screen(*self._absolute_center(search_button_matches[0]))

        started = time.monotonic()
        _image, path, result_matches = self._wait_for(
            "SEARCH_RESULT",
            lambda items: [
                item
                for item in self.vision.find_text(items, [self.config.expected_nickname], self.config.ocr_min_confidence, exact=True)
                if item.rect.left < self.window.rect.width * 0.45 and item.rect.top > 90
            ],
            timeout_error_code="SEARCH_RESULT_NOT_FOUND",
            timeout_error_message="No unique contact matched the expected nickname",
        )
        unique_matches = {(item.text, item.rect.left, item.rect.top) for item in result_matches}
        self._record(
            "SEARCH_RESULT",
            started,
            len(unique_matches) == 1,
            path,
            max(item.confidence for item in result_matches),
            "AMBIGUOUS_SEARCH_RESULT" if len(unique_matches) != 1 else None,
            f"Expected exactly one target match, found {len(unique_matches)}" if len(unique_matches) != 1 else None,
            {"matches": sorted(text for text, _x, _y in unique_matches)},
        )
        target = max(result_matches, key=lambda item: item.confidence)
        click_screen(*self._absolute_center(target))
        self.state = State.CONTACT_PROFILE

        started = time.monotonic()
        _image, path, profile_matches = self._wait_for(
            "CONTACT_PROFILE",
            lambda items: self.vision.find_text(items, ["添加到通讯录", "添加好友", "发送"], self.config.ocr_min_confidence),
        )
        already_friend = self.vision.find_text(profile_matches, ["发送"], self.config.ocr_min_confidence, exact=True)
        if already_friend:
            self._record("CONTACT_PROFILE", started, False, path, max(item.confidence for item in already_friend), "ALREADY_FRIEND", "The target opens an existing chat and is already a friend")
        add_matches = self.vision.find_text(profile_matches, ["添加到通讯录", "添加好友"], self.config.ocr_min_confidence)
        self._record("CONTACT_PROFILE", started, len(add_matches) == 1, path, max(item.confidence for item in add_matches), "ADD_BUTTON_AMBIGUOUS" if len(add_matches) != 1 else None, f"Add button candidates: {len(add_matches)}" if len(add_matches) != 1 else None)
        self._record("ADD_FRIEND", started, True, path, max(item.confidence for item in add_matches))
        click_screen(*self._absolute_center(add_matches[0]))
        self.state = State.FORM_READY

        time.sleep(0.6)
        form_window = foreground_wechat_window(self.window)
        if form_window is None:
            _image, form_path, _items = self._capture("FORM_READY")
            self._record(
                "FORM_READY",
                time.monotonic(),
                False,
                form_path,
                error_code="ADD_FRIEND_FORM_WINDOW_NOT_FOUND",
                error_message="No foreground WeChat-owned friend-request form appeared",
            )
        self.window = form_window

        started = time.monotonic()
        form_image, path, form_matches = self._wait_for(
            "FORM_READY",
            lambda items: self.vision.find_text(
                items,
                ["备注", "发送添加朋友申请"],
                self.config.ocr_min_confidence,
            ),
        )
        remark_matches = self.vision.find_text(form_matches, ["备注"], self.config.ocr_min_confidence)
        message_matches = self.vision.find_text(
            form_matches,
            ["发送添加朋友申请"],
            self.config.ocr_min_confidence,
        )
        self._record("REMARK_INPUT", started, len(remark_matches) == 1, path, max((item.confidence for item in remark_matches), default=None), "REMARK_NOT_UNIQUE" if len(remark_matches) != 1 else None, f"Remark anchors: {len(remark_matches)}" if len(remark_matches) != 1 else None)
        self._record("MESSAGE_INPUT", started, len(message_matches) == 1, path, max((item.confidence for item in message_matches), default=None), "MESSAGE_NOT_UNIQUE" if len(message_matches) != 1 else None, f"Message anchors: {len(message_matches)}" if len(message_matches) != 1 else None)

        remark_regions = self._nearest_input_region(
            self.vision.find_input_below(form_image, remark_matches[0].rect)
        )
        message_regions = self._nearest_input_region(
            self.vision.find_input_below(form_image, message_matches[0].rect)
        )
        self._record("REMARK_REGION", started, len(remark_regions) == 1, path, error_code="REMARK_REGION_NOT_UNIQUE" if len(remark_regions) != 1 else None, error_message=f"Remark input regions: {len(remark_regions)}" if len(remark_regions) != 1 else None)
        self._record("MESSAGE_REGION", started, len(message_regions) == 1, path, error_code="MESSAGE_REGION_NOT_UNIQUE" if len(message_regions) != 1 else None, error_message=f"Message input regions: {len(message_regions)}" if len(message_regions) != 1 else None)

        # Inputs are selected from OCR labels plus OpenCV regions, never absolute desktop coordinates.
        remark_x, remark_y = remark_regions[0].center
        click_screen(self.window.rect.left + remark_x, self.window.rect.top + remark_y)
        paste_text(self.config.test_remark)
        message_x, message_y = message_regions[0].center
        click_screen(self.window.rect.left + message_x, self.window.rect.top + message_y)
        paste_text(self.config.test_message)

        started = time.monotonic()
        _image, path, filled_items = self._capture("READY_TO_SUBMIT")
        remark_seen = self.vision.find_text(filled_items, [self.config.test_remark], self.config.ocr_min_confidence)
        message_seen = self.vision.find_text(filled_items, [self.config.test_message], self.config.ocr_min_confidence)
        passed = bool(remark_seen and message_seen)
        self._record("READY_TO_SUBMIT", started, passed, path, min([item.confidence for item in remark_seen + message_seen], default=None), "FILLED_TEXT_NOT_VERIFIED" if not passed else None, "Filled remark/message could not both be verified" if not passed else None)
        self.state = State.READY_TO_SUBMIT
        self.logger.event("safety_stop", reason="FINAL_SEND_IS_DISABLED", state=self.state.value)
        return self.results
