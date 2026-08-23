/* global chrome */

const connection = document.querySelector("#connection");
const taskList = document.querySelector("#tasks");
const emptyState = document.querySelector("#empty");
const notice = document.querySelector("#notice");
const refreshButton = document.querySelector("#refresh");
const agentMeta = document.querySelector("#agent-meta");

const taskTypeLabels = {
  cooperation: "合作推进",
  follow_up: "重新联系",
  other: "其他任务",
  quote_follow_up: "报价跟进",
};
const platformLabels = {
  bilibili: "B站",
  douyin: "抖音",
  kuaishou: "快手",
  other: "其他",
  weibo: "微博",
  xiaohongshu: "小红书",
};
const resultOptions = {
  resource: [
    ["friend_request_sent", "已发送好友申请"],
    ["friend_request_accepted", "已通过"],
    ["no_response", "暂无回应"],
    ["rejected", "已拒绝"],
  ],
  talent: [
    ["replied", "已回复"],
    ["interested", "有意向"],
    ["quote_sent", "已报价"],
    ["cooperation_confirmed", "已确认合作"],
    ["rejected", "已拒绝"],
  ],
};

function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function setConnection(message, state) {
  connection.textContent = message;
  connection.className = `connection ${state}`;
}

function setNotice(message, error = false) {
  notice.textContent = message;
  notice.className = `notice${error ? " error" : ""}`;
  notice.hidden = !message;
}

function formatDateTime(value) {
  if (!value) return "未设置";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
}

function addDetail(container, label, value) {
  const detail = document.createElement("div");
  detail.className = "detail";
  const name = document.createElement("span");
  name.textContent = label;
  const content = document.createElement("strong");
  content.textContent = value || "未填写";
  detail.append(name, content);
  container.append(detail);
}

async function claimTask(task, button) {
  button.disabled = true;
  setNotice("正在领取任务…");
  const response = await sendMessage({ task_id: task.task_id, type: "CLAIM_TASK" });
  if (!response?.ok) {
    button.disabled = false;
    setNotice(response?.error?.message || "领取失败", true);
    return;
  }
  setNotice("任务已领取，请人工完成操作后回传结果。");
  await loadTasks();
}

async function submitResult(task, form, button) {
  const formData = new FormData(form);
  button.disabled = true;
  setNotice("正在提交执行结果…");
  const response = await sendMessage({
    result: {
      result_code: formData.get("result_code"),
      result_notes: String(formData.get("result_notes") ?? "").trim() || null,
    },
    task_id: task.task_id,
    type: "SUBMIT_RESULT",
  });
  if (!response?.ok) {
    button.disabled = false;
    setNotice(response?.error?.message || "结果提交失败", true);
    return;
  }
  setNotice("执行结果已保存，任务已完成。");
  await loadTasks();
}

function renderTask(task) {
  const card = document.createElement("article");
  card.className = "task-card";
  const heading = document.createElement("div");
  heading.className = "task-heading";
  const title = document.createElement("h2");
  title.textContent = task.target.nickname;
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = task.target.type === "resource" ? "资源" : "达人";
  heading.append(title, badge);

  const details = document.createElement("div");
  details.className = "task-details";
  addDetail(details, "平台", platformLabels[task.target.platform] || task.target.platform);
  addDetail(details, "平台账号", task.target.platform_account);
  addDetail(details, "任务", taskTypeLabels[task.task_type] || task.task_type);
  addDetail(details, "到期时间", formatDateTime(task.due_at));

  const nextAction = document.createElement("p");
  nextAction.className = "next-action";
  nextAction.textContent = `下一步：${task.next_action || "按任务要求处理"}`;
  card.append(heading, details, nextAction);

  if (task.status === "pending") {
    const claimButton = document.createElement("button");
    claimButton.type = "button";
    claimButton.textContent = "领取任务";
    claimButton.addEventListener("click", () => void claimTask(task, claimButton));
    card.append(claimButton);
  } else {
    const form = document.createElement("form");
    form.className = "result-form";
    const select = document.createElement("select");
    select.name = "result_code";
    select.required = true;
    for (const [value, label] of resultOptions[task.target.type]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
    const notes = document.createElement("textarea");
    notes.name = "result_notes";
    notes.maxLength = 2000;
    notes.placeholder = "执行备注（选填）";
    notes.rows = 2;
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "确认完成并回传";
    form.append(select, notes, submitButton);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitResult(task, form, submitButton);
    });
    card.append(form);
  }
  return card;
}

function renderTasks(tasks) {
  taskList.replaceChildren(...tasks.map(renderTask));
  emptyState.hidden = tasks.length !== 0;
}

async function loadTasks() {
  refreshButton.disabled = true;
  setConnection("正在连接 BD 系统…", "pending");
  try {
    const state = await sendMessage({ type: "GET_AGENT_STATE" });
    if (state?.config) {
      agentMeta.textContent = `设备 ${state.config.agent_id.slice(0, 8)} · v${state.config.version}`;
    }
    if (!state?.connected) {
      setConnection("❌ 请打开 BD 系统并登录", "disconnected");
      renderTasks([]);
      emptyState.hidden = true;
      return;
    }

    const response = await sendMessage({ type: "GET_TASKS" });
    if (!response?.ok) {
      setConnection(
        response?.status === 401 ? "❌ 请打开 BD 系统并登录" : `❌ ${response?.error?.message || "无法连接 BD 系统"}`,
        "disconnected",
      );
      renderTasks([]);
      emptyState.hidden = true;
      return;
    }
    setConnection("✅ BD 系统已登录", "connected");
    renderTasks(response.data?.tasks ?? []);
  } catch {
    setConnection("❌ 无法连接扩展后台服务", "disconnected");
    renderTasks([]);
    emptyState.hidden = true;
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", () => void loadTasks());
void loadTasks();
