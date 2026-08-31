export type AgentWechatExecutionDto = {
  expected_nickname: string;
  greeting_message: string;
  remark: string;
  talent_level: "A" | "B" | "C";
  wechat_id: string;
};

export type AgentWechatExecutionSnapshotRow = {
  execution_expected_nickname: string | null;
  execution_greeting_message: string | null;
  execution_remark: string | null;
  execution_talent_level: string | null;
  execution_wechat_id: string | null;
};

export function getWechatExecutionSnapshot(
  task: AgentWechatExecutionSnapshotRow,
): AgentWechatExecutionDto | null {
  if (
    !task.execution_wechat_id
    || !task.execution_expected_nickname
    || (task.execution_talent_level !== "A" && task.execution_talent_level !== "B" && task.execution_talent_level !== "C")
    || !task.execution_greeting_message
    || !task.execution_remark
  ) {
    return null;
  }
  return {
    expected_nickname: task.execution_expected_nickname,
    greeting_message: task.execution_greeting_message,
    remark: task.execution_remark,
    talent_level: task.execution_talent_level,
    wechat_id: task.execution_wechat_id,
  };
}
