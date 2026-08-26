# Windows Agent MVP

Phase 8.4-A registers this Windows installation, sends a heartbeat every 30
seconds, and polls supported BD tasks every 10 seconds. The user must confirm
before the Agent claims a task. It does not control WeChat or any desktop
application for normal BD tasks. The internal `desktop_test` task is the only
task allowed to invoke the desktop executor: it opens an Agent-owned Notepad,
types fixed test text, captures the primary screen, and closes that process.

Required environment variables:

- `BD_WEB_URL`: deployed BD Web origin, for example `https://example.vercel.app`
- `BD_AGENT_ACCESS_TOKEN`: current user's Supabase access token
- `BD_AGENT_DEVICE_NAME`: optional display name; defaults to the Windows hostname

Build and start from the repository root:

```powershell
pnpm --filter @bd/windows-agent build
$env:BD_WEB_URL = "https://your-bd-system.example"
$env:BD_AGENT_ACCESS_TOKEN = "your-user-access-token"
pnpm --filter @bd/windows-agent start
```

Press `Ctrl+C` to send a final paused heartbeat and exit gracefully. The local
installation identifier is stored in `%LOCALAPPDATA%\BDTalentAgent\agent.json`.
The access token is not written to this file.

When a `wechat_add_friend` task is found, the CLI displays the public task DTO
and asks whether this installation should claim it. Declining the second
confirmation records `failed`; confirming it records `running` and submits a
clearly labelled simulated result. Non-test tasks perform no platform action.

Desktop execution logs are written as JSON Lines to
`%LOCALAPPDATA%\BDTalentAgent\logs\executions.jsonl`. Screenshots are stored in
`%LOCALAPPDATA%\BDTalentAgent\screenshots`. No WeChat or platform selector is
present in the executor.

After building, an explicit interactive smoke test is available with
`pnpm --filter @bd/windows-agent test:desktop`. It is never run by the normal
test or build scripts. Run it from a normal PowerShell window in the signed-in
Windows desktop session; service, CI, and sandbox sessions cannot activate a
desktop window or capture an interactive screen.
