from __future__ import annotations

import ctypes
import ctypes.wintypes as wintypes
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageGrab

from .models import Rect


user32 = ctypes.WinDLL("user32", use_last_error=True)
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

# Keep screenshot pixels, window rectangles and SendInput coordinates in the
# same physical-pixel coordinate space at the fixed 125% test DPI.
try:
    user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))  # PER_MONITOR_AWARE_V2
except OSError:
    pass

user32.IsWindowVisible.argtypes = [wintypes.HWND]
user32.IsWindowVisible.restype = wintypes.BOOL
user32.IsIconic.argtypes = [wintypes.HWND]
user32.IsIconic.restype = wintypes.BOOL
user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
user32.GetWindowTextLengthW.restype = ctypes.c_int
user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user32.GetWindowTextW.restype = ctypes.c_int
user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
user32.GetWindowThreadProcessId.restype = wintypes.DWORD
user32.GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.RECT)]
user32.GetWindowRect.restype = wintypes.BOOL
user32.GetDpiForWindow.argtypes = [wintypes.HWND]
user32.GetDpiForWindow.restype = wintypes.UINT
user32.GetForegroundWindow.restype = wintypes.HWND
user32.WindowFromPoint.argtypes = [wintypes.POINT]
user32.WindowFromPoint.restype = wintypes.HWND
user32.GetAncestor.argtypes = [wintypes.HWND, wintypes.UINT]
user32.GetAncestor.restype = wintypes.HWND
user32.SetForegroundWindow.argtypes = [wintypes.HWND]
user32.SetForegroundWindow.restype = wintypes.BOOL
user32.BringWindowToTop.argtypes = [wintypes.HWND]
user32.BringWindowToTop.restype = wintypes.BOOL
user32.AttachThreadInput.argtypes = [wintypes.DWORD, wintypes.DWORD, wintypes.BOOL]
user32.AttachThreadInput.restype = wintypes.BOOL
user32.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
user32.ShowWindow.restype = wintypes.BOOL
user32.MoveWindow.argtypes = [wintypes.HWND, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, wintypes.BOOL]
user32.MoveWindow.restype = wintypes.BOOL
user32.SetCursorPos.argtypes = [ctypes.c_int, ctypes.c_int]
user32.SetCursorPos.restype = wintypes.BOOL
kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
kernel32.OpenProcess.restype = wintypes.HANDLE
kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
kernel32.CloseHandle.restype = wintypes.BOOL

PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
SW_RESTORE = 9
GA_ROOT = 2
INPUT_KEYBOARD = 1
KEYEVENTF_KEYUP = 0x0002
VK_CONTROL = 0x11
VK_A = 0x41
VK_V = 0x56


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_void_p),
    ]


class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_void_p),
    ]


class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [("uMsg", wintypes.DWORD), ("wParamL", wintypes.WORD), ("wParamH", wintypes.WORD)]


class INPUT_UNION(ctypes.Union):
    _fields_ = [("mi", MOUSEINPUT), ("ki", KEYBDINPUT), ("hi", HARDWAREINPUT)]


class INPUT(ctypes.Structure):
    _anonymous_ = ("union",)
    _fields_ = [("type", wintypes.DWORD), ("union", INPUT_UNION)]


user32.SendInput.argtypes = [wintypes.UINT, ctypes.POINTER(INPUT), ctypes.c_int]
user32.SendInput.restype = wintypes.UINT
kernel32.QueryFullProcessImageNameW.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)]
kernel32.QueryFullProcessImageNameW.restype = wintypes.BOOL


@dataclass(frozen=True)
class WechatWindow:
    hwnd: int
    pid: int
    title: str
    executable: Path
    version: str
    rect: Rect
    dpi: int
    minimized: bool


def _process_path(pid: int) -> Path | None:
    handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
    if not handle:
        return None
    try:
        size = wintypes.DWORD(32768)
        buffer = ctypes.create_unicode_buffer(size.value)
        if kernel32.QueryFullProcessImageNameW(handle, 0, buffer, ctypes.byref(size)):
            return Path(buffer.value)
        return None
    finally:
        kernel32.CloseHandle(handle)


def _file_version(path: Path) -> str:
    command = (
        "(Get-Item -LiteralPath '"
        + str(path).replace("'", "''")
        + "').VersionInfo.ProductVersion"
    )
    completed = subprocess.run(
        ["powershell.exe", "-NoProfile", "-Command", command],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    return completed.stdout.strip()


def find_wechat_window() -> WechatWindow | None:
    candidates: list[WechatWindow] = []
    callback_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    def callback(hwnd: int, _lparam: int) -> bool:
        if not user32.IsWindowVisible(hwnd):
            return True
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        path = _process_path(pid.value)
        if not path or path.name.lower() not in {"weixin.exe", "wechat.exe"}:
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        title_buffer = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, title_buffer, length + 1)
        native_rect = wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(native_rect))
        rect = Rect(native_rect.left, native_rect.top, native_rect.right, native_rect.bottom)
        minimized = bool(user32.IsIconic(hwnd))
        if minimized or (rect.width > 500 and rect.height > 400):
            candidates.append(
                WechatWindow(
                    hwnd=int(hwnd),
                    pid=pid.value,
                    title=title_buffer.value,
                    executable=path,
                    version=_file_version(path),
                    rect=rect,
                    dpi=int(user32.GetDpiForWindow(hwnd)),
                    minimized=minimized,
                )
            )
        return True

    user32.EnumWindows(callback_type(callback), 0)
    return max(candidates, key=lambda item: item.rect.width * item.rect.height, default=None)


def find_wechat_dialog(parent: WechatWindow) -> WechatWindow | None:
    """Find a visible WeChat-owned dialog without accepting unrelated windows."""
    candidates: list[WechatWindow] = []
    callback_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    def callback(hwnd: int, _lparam: int) -> bool:
        if int(hwnd) == parent.hwnd or not user32.IsWindowVisible(hwnd):
            return True
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        if pid.value != parent.pid:
            return True
        native_rect = wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(native_rect))
        rect = Rect(native_rect.left, native_rect.top, native_rect.right, native_rect.bottom)
        if rect.width < 350 or rect.height < 400:
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        title_buffer = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, title_buffer, length + 1)
        candidates.append(
            WechatWindow(
                hwnd=int(hwnd),
                pid=pid.value,
                title=title_buffer.value,
                executable=parent.executable,
                version=parent.version,
                rect=rect,
                dpi=int(user32.GetDpiForWindow(hwnd)),
                minimized=bool(user32.IsIconic(hwnd)),
            )
        )
        return True

    user32.EnumWindows(callback_type(callback), 0)
    return max(candidates, key=lambda item: item.rect.width * item.rect.height, default=None)


def foreground_wechat_window(parent: WechatWindow) -> WechatWindow | None:
    hwnd = user32.GetForegroundWindow()
    if not hwnd:
        return None
    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    if pid.value != parent.pid:
        return None
    native_rect = wintypes.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(native_rect))
    rect = Rect(native_rect.left, native_rect.top, native_rect.right, native_rect.bottom)
    if rect.width < 350 or rect.height < 400:
        return None
    length = user32.GetWindowTextLengthW(hwnd)
    title_buffer = ctypes.create_unicode_buffer(length + 1)
    user32.GetWindowTextW(hwnd, title_buffer, length + 1)
    return WechatWindow(
        hwnd=int(hwnd),
        pid=pid.value,
        title=title_buffer.value,
        executable=parent.executable,
        version=parent.version,
        rect=rect,
        dpi=int(user32.GetDpiForWindow(hwnd)),
        minimized=bool(user32.IsIconic(hwnd)),
    )


def normalize_window(window: WechatWindow, width: int, height: int) -> WechatWindow:
    user32.ShowWindow(window.hwnd, SW_RESTORE)
    user32.MoveWindow(window.hwnd, 20, 20, width, height, True)
    user32.SetForegroundWindow(window.hwnd)
    time.sleep(0.8)
    refreshed = find_wechat_window()
    if not refreshed:
        raise RuntimeError("WeChat window disappeared after normalization")
    return refreshed


def is_foreground(window: WechatWindow) -> bool:
    return int(user32.GetForegroundWindow()) == window.hwnd


def is_foreground_same_process(window: WechatWindow) -> bool:
    foreground = user32.GetForegroundWindow()
    if not foreground:
        return False
    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(foreground, ctypes.byref(pid))
    return pid.value == window.pid


def is_occluded(window: WechatWindow) -> bool:
    if not is_foreground(window):
        return True
    center_x, center_y = window.rect.center
    top = int(user32.WindowFromPoint(wintypes.POINT(center_x, center_y)))
    root = int(user32.GetAncestor(top, GA_ROOT)) if top else 0
    return root not in {window.hwnd, 0}


def screenshot(window: WechatWindow) -> Image.Image:
    return ImageGrab.grab(
        bbox=(window.rect.left, window.rect.top, window.rect.right, window.rect.bottom),
        all_screens=False,
    )


def click_screen(x: int, y: int) -> None:
    user32.SetCursorPos(x, y)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    user32.mouse_event(0x0004, 0, 0, 0, 0)


def move_cursor_screen(x: int, y: int) -> None:
    user32.SetCursorPos(x, y)


def focus_window(window: WechatWindow) -> bool:
    user32.ShowWindow(window.hwnd, SW_RESTORE)
    current_thread = kernel32.GetCurrentThreadId()
    foreground = user32.GetForegroundWindow()
    foreground_thread = user32.GetWindowThreadProcessId(foreground, None) if foreground else 0
    attached = bool(
        foreground_thread
        and foreground_thread != current_thread
        and user32.AttachThreadInput(current_thread, foreground_thread, True)
    )
    try:
        user32.BringWindowToTop(window.hwnd)
        focused = bool(user32.SetForegroundWindow(window.hwnd))
    finally:
        if attached:
            user32.AttachThreadInput(current_thread, foreground_thread, False)
    time.sleep(0.4)
    return focused and is_foreground(window)


def set_clipboard(text: str) -> None:
    escaped = text.replace("'", "''")
    command = f"Set-Clipboard -Value '{escaped}'"
    completed = subprocess.run(
        ["powershell.exe", "-NoProfile", "-STA", "-Command", command],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or "Set-Clipboard failed")


def _key(vk: int, up: bool = False) -> INPUT:
    flags = KEYEVENTF_KEYUP if up else 0
    return INPUT(type=INPUT_KEYBOARD, ki=KEYBDINPUT(vk, 0, flags, 0, None))


def paste_text(text: str, replace_existing: bool = True) -> None:
    set_clipboard(text)
    time.sleep(0.08)
    if replace_existing:
        select_sequence = [_key(VK_CONTROL), _key(VK_A), _key(VK_A, True), _key(VK_CONTROL, True)]
        select_array_type = INPUT * len(select_sequence)
        selected = user32.SendInput(
            len(select_sequence),
            select_array_type(*select_sequence),
            ctypes.sizeof(INPUT),
        )
        if selected != len(select_sequence):
            raise RuntimeError(
                f"SendInput sent {selected}/{len(select_sequence)} select events; "
                f"win32_error={ctypes.get_last_error()}; input_size={ctypes.sizeof(INPUT)}"
            )
        time.sleep(0.08)
    paste_sequence = [_key(VK_CONTROL), _key(VK_V), _key(VK_V, True), _key(VK_CONTROL, True)]
    paste_array_type = INPUT * len(paste_sequence)
    pasted = user32.SendInput(
        len(paste_sequence),
        paste_array_type(*paste_sequence),
        ctypes.sizeof(INPUT),
    )
    if pasted != len(paste_sequence):
        raise RuntimeError(
            f"SendInput sent {pasted}/{len(paste_sequence)} paste events; "
            f"win32_error={ctypes.get_last_error()}; input_size={ctypes.sizeof(INPUT)}"
        )
    time.sleep(0.12)
