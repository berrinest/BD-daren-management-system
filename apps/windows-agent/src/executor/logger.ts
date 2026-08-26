import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { getAgentDataDirectory } from "../config.js";
import type { ExecutionLogEntry } from "./types.js";

export type ExecutionLogWriter = (entry: ExecutionLogEntry) => Promise<void>;

export function createExecutionLogWriter(
  directory = join(getAgentDataDirectory(), "logs"),
): ExecutionLogWriter {
  return async (entry) => {
    await mkdir(directory, { recursive: true });
    await appendFile(
      join(directory, "executions.jsonl"),
      `${JSON.stringify(entry)}\n`,
      "utf8",
    );
  };
}
