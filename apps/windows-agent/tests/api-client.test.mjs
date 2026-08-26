import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import test from "node:test";

import { BdAgentApiClient } from "../dist/api-client.js";

test("register and heartbeat send bearer-authenticated requests", async () => {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    let body = "";
    request.setEncoding("utf8");
    for await (const chunk of request) body += chunk;
    requests.push({
      authorization: request.headers.authorization,
      body: JSON.parse(body),
      method: request.method,
      url: request.url,
    });
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({
      agent: {
        id: "00000000-0000-4000-8000-000000000001",
        device_name: "QA PC",
        last_seen_at: "2026-08-26T10:00:00.000Z",
        status: "active",
        version: "0.1.0",
      },
    }));
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
  server.close();

  assert.equal(requests.length, 2);
  assert.equal(requests[0].authorization, "Bearer test-token");
  assert.equal(requests[0].url, "/api/agent/instances/register");
  assert.equal(requests[0].body.agent_type, "windows");
  assert.equal(requests[1].url, "/api/agent/instances/00000000-0000-4000-8000-000000000001/heartbeat");
  assert.equal(requests[1].body.status, "active");
});
