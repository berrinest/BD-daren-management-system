import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { DesktopTestExecutor } from "../dist/executor/desktop-test.js";
import { createExecutionLogWriter } from "../dist/executor/logger.js";

test("desktop executor logs a safe PowerShell action without running the desktop in tests", async () => {
  const directory = await mkdtemp(join(tmpdir(), "bd-agent-executor-"));
  const logDirectory = join(directory, "logs");
  const screenshotDirectory = join(directory, "screenshots");
  let script = "";
  const executor = new DesktopTestExecutor(
    async (value) => {
      script = value;
    },
    createExecutionLogWriter(logDirectory),
    screenshotDirectory,
  );

  try {
    const result = await executor.execute({
      signal: new AbortController().signal,
      taskId: "00000000-0000-4000-8000-000000000010",
    });
    const entry = JSON.parse(
      (await readFile(join(logDirectory, "executions.jsonl"), "utf8")).trim(),
    );

    assert.match(script, /Start-Process -FilePath 'notepad\.exe'/);
    assert.match(script, /SetForegroundWindow/);
    assert.match(script, /CopyFromScreen/);
    assert.match(script, /Where-Object \{ \$_\.Id -notin \$existingIds \}/);
    assert.match(script, /Stop-Process -Force/);
    assert.equal(entry.task_id, "00000000-0000-4000-8000-000000000010");
    assert.equal(entry.success, true);
    assert.equal(entry.error, null);
    assert.match(result.screenshotPath, /\.png$/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
