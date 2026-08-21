import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = JSON.parse(
  fs.readFileSync(new URL("../manifest.json", import.meta.url), "utf8"),
);

assert.equal(manifest.manifest_version, 3);
assert.ok(
  manifest.host_permissions.includes("https://bd-daren-management-system.vercel.app/*"),
  "the popup needs host permission to find a non-active production BD tab in Edge",
);
assert.ok(
  manifest.content_scripts.some((entry) =>
    entry.matches.includes("https://bd-daren-management-system.vercel.app/*")
      && entry.js.includes("content/app-bridge.js")),
  "the production BD page must receive the app bridge content script",
);

console.log("manifest permissions test passed");
