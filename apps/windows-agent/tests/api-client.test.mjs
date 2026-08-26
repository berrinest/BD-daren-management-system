import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import test from "node:test";

import { BdAgentApiClient } from "../dist/api-client.js";

test("Agent client registers, heartbeats, polls, and claims with bearer auth", async () => {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    let body = "";
    request.setEncoding("utf8");
    for await (const chunk of request) body += chunk;
    requests.push({
      authorization: request.headers.authorization,
      body: body ? JSON.parse(body) : null,
      method: request.method,
      url: request.url,
    });
    response.writeHead(200, { "Content-Type": "application/json" });
    if (request.url === "/api/agent/tasks?scope=today&task_type=wechat_add_friend") {
      response.end(JSON.stringify({
        tasks: [{
          created_at: "2026-08-26T09:00:00.000Z",
          due_at: "2026-08-26T10:00:00.000Z",
          next_action: "添加微信好友",
          status: "pending",
          target: {
            id: "00000000-0000-4000-8000-000000000004",
            nickname: "测试达人",
            platform: "douyin",
            platform_account: "douyin-test",
            type: "resource",
            wechat: "wechat-test",
          },
          task_id: "00000000-0000-4000-8000-000000000003",
          task_type: "wechat_add_friend",
        }],
      }));
    } else if (request.url?.endsWith("/claim")) {
      response.end(JSON.stringify({
        agent_id: "00000000-0000-4000-8000-000000000001",
        started_at: "2026-08-26T10:00:00.000Z",
        status: "in_progress",
        task_id: "00000000-0000-4000-8000-000000000003",
      }));
    } else {
      response.end(JSON.stringify({ agent: {
        id: "00000000-0000-4000-8000-000000000001",
        device_name: "QA PC",
        last_seen_at: "2026-08-26T10:00:00.000Z",
        status: "active",
        version: "0.1.0",
      } }));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const client = new BdAgentApiClient(`http://127.0.0.1:${address.port}`, "test-token");

  await client.register({
    deviceName: "QA PC",
    installationId: "00000000-0000-4000-8000-000000000002",
    version: "0.1.0",
  });
  await client.heartbeat("00000000-0000-4000-8000-000000000001", "0.1.0", "active");
  const tasks = await client.getTasks();
  const claim = await client.claimTask(
    "00000000-0000-4000-8000-000000000003",
    "00000000-0000-4000-8000-000000000001",
  );
  server.close();

  assert.equal(requests.length, 4);
  assert.equal(requests[0].authorization, "Bearer test-token");
  assert.equal(requests[0].url, "/api/agent/instances/register");
  assert.equal(requests[0].body.agent_type, "windows");
  assert.equal(requests[1].url, "/api/agent/instances/00000000-0000-4000-8000-000000000001/heartbeat");
  assert.equal(requests[1].body.status, "active");
  assert.equal(requests[2].url, "/api/agent/tasks?scope=today&task_type=wechat_add_friend");
  assert.equal(requests[2].authorization, "Bearer test-token");
  assert.equal(tasks[0].task_type, "wechat_add_friend");
  assert.equal(requests[3].url, "/api/agent/tasks/00000000-0000-4000-8000-000000000003/claim");
  assert.equal(requests[3].body.agent_id, "00000000-0000-4000-8000-000000000001");
  assert.equal(claim.status, "in_progress");
});
