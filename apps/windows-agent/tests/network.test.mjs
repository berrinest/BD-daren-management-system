import assert from "node:assert/strict";
import test from "node:test";

import {
  displayProxyUrl,
  parseWindowsProxyServer,
  resolveProxySettings,
} from "../dist/network/proxy.js";

test("proxy detection prioritizes HTTPS, HTTP, then ALL proxy environment variables", () => {
  const settings = resolveProxySettings({
    ALL_PROXY: "http://all.example:3000",
    HTTP_PROXY: "http://http.example:3000",
    HTTPS_PROXY: "http://secure.example:3000",
  }, null);
  assert.equal(settings.proxyUrl, "http://secure.example:3000/");
  assert.equal(settings.source, "environment:HTTPS_PROXY");
});

test("proxy detection supports lower-case environment variables", () => {
  const settings = resolveProxySettings({ https_proxy: "127.0.0.1:7892" }, null);
  assert.equal(settings.proxyUrl, "http://127.0.0.1:7892/");
});

test("Windows per-protocol proxy selects HTTPS and normalizes bypass entries", () => {
  const settings = resolveProxySettings({}, {
    proxyEnable: 1,
    proxyOverride: "<local>;*.internal",
    proxyServer: "http=127.0.0.1:8080;https=127.0.0.1:8443",
  });
  assert.equal(settings.proxyUrl, "http://127.0.0.1:8443/");
  assert.equal(settings.noProxy, "localhost,127.0.0.1,::1,*.internal");
});

test("proxy display removes credentials", () => {
  assert.equal(displayProxyUrl("http://user:secret@127.0.0.1:7892"), "http://127.0.0.1:7892");
  assert.equal(parseWindowsProxyServer("127.0.0.1:7892"), "http://127.0.0.1:7892/");
});
