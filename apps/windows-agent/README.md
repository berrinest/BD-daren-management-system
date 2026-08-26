# Windows Agent MVP

Phase 8.2 registers this Windows installation, sends a heartbeat every 30
seconds, and polls supported BD tasks every 10 seconds. The user must confirm
before the Agent claims a task. It does not control WeChat or any desktop
application.

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
and asks whether this installation should claim it. Claiming only changes the
task to `in_progress`; Phase 8.2 performs no platform action.
