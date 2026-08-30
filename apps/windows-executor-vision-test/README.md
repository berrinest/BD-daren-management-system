# Windows WeChat Vision Feasibility Probe

Phase 9.1B isolated experiment for Windows 11, WeChat 4.1.13.12, primary
display and 125% DPI. It does not import or modify the production Agent, task
APIs, database, or Supabase configuration.

The program combines:

- Win32 window discovery and screenshots;
- RapidOCR for visible Chinese text;
- OpenCV template matching when reviewed templates are present;
- controlled clipboard/SendInput only after state and confidence checks;
- a fail-closed state machine with JSONL logs and screenshots.

The final Send/Confirm action is intentionally absent. The furthest reachable
state is `READY_TO_SUBMIT`, after the test remark and message are filled.

## Safety gates

- A dedicated test WeChat ID and expected nickname are mandatory.
- The executable version, DPI, primary display and fixed window size are checked.
- Ambiguous search results stop with `manual_required`.
- Minimized, occluded, popup, timeout, or low-confidence states stop immediately.
- `allow_controlled_input` and `--allow-input` must both be enabled.
- No code path clicks a final Send button.

## Setup

```powershell
cd apps/windows-executor-vision-test
Copy-Item config.example.json config.json
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Use the bundled Python path instead of `py` when Python is not globally
installed.

Observation-only run:

```powershell
.\.venv\Scripts\python.exe -m src.main --config config.json
```

Controlled single-test run (never sends):

```powershell
.\.venv\Scripts\python.exe -m src.main --config config.json --allow-input
```

Artifacts are written to `artifacts/<run-id>/` and include `events.jsonl`,
`summary.json`, and per-step PNG screenshots.

