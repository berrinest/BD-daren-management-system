import assert from "node:assert/strict";
import test from "node:test";

import { createLoginReceiver } from "../dist/auth/login-server.js";
import { refreshAccessTokenWith } from "../dist/auth/session.js";

test("loopback login receiver accepts only matching state and passes tokens without logging", async () => {
  let authorized;
  const receiver = await createLoginReceiver(async (payload) => { authorized = payload; });
  try {
    const response = await fetch(receiver.callbackUrl, {
      body: new URLSearchParams({
        refresh_token: "credential-manager-only",
        state: receiver.state,
        supabase_publishable_key: "public-key",
        supabase_url: "https://project.supabase.co",
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });
    const result = await receiver.waitForAuthorization();
    assert.equal(response.status, 200);
    assert.equal(result.refreshToken, "credential-manager-only");
    assert.equal(authorized.state, receiver.state);
  } finally {
    receiver.close();
  }
});

test("loopback login receiver rejects a mismatched state", async () => {
  const receiver = await createLoginReceiver(async () => {
    throw new Error("authorization callback must not run");
  });
  try {
    const rejection = assert.rejects(receiver.waitForAuthorization(), /state 校验失败/);
    const response = await fetch(receiver.callbackUrl, {
      body: new URLSearchParams({
        refresh_token: "must-not-be-stored",
        state: "mismatched-state-value-000000000000000000000000",
        supabase_publishable_key: "public-key",
        supabase_url: "https://project.supabase.co",
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });
    assert.equal(response.status, 400);
    await rejection;
  } finally {
    receiver.close();
  }
});

test("refresh flow rotates the stored refresh token and returns only an access token", async () => {
  const writes = [];
  const accessToken = await refreshAccessTokenWith({
    installationId: "00000000-0000-4000-8000-000000000001",
    supabasePublishableKey: "public-key",
    supabaseUrl: "https://project.supabase.co",
  }, "https://bd.example", {
    fetch: async (_url, init) => {
      assert.match(String(init.body), /stored-refresh/);
      return new Response(JSON.stringify({
        access_token: "new-access",
        refresh_token: "rotated-refresh",
      }), { status: 200 });
    },
    readRefreshToken: async () => "stored-refresh",
    saveRefreshToken: async (baseUrl, token) => { writes.push({ baseUrl, token }); },
  });

  assert.equal(accessToken, "new-access");
  assert.deepEqual(writes, [{ baseUrl: "https://bd.example", token: "rotated-refresh" }]);
});
