export type ExecutorContext = {
  signal: AbortSignal;
  taskId: string;
};

export type ExecutorResult = {
  action: string;
  screenshotPath: string;
};

export type DesktopExecutor = {
  execute(context: ExecutorContext): Promise<ExecutorResult>;
};

export type ExecutionLogEntry = {
  action: string;
  error: string | null;
  success: boolean;
  task_id: string;
  timestamp: string;
};
