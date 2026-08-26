# Windows Agent MVP

Phase 8.1 only registers this Windows installation and sends a heartbeat every
30 seconds. It does not read tasks or control any desktop application.

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
