import assert from "node:assert/strict";
import test from "node:test";
import { collectSettings } from "../../src/cli/wizard.js";
import { normalizeSettings } from "../../src/config/normalize.js";
import { savedSettings, recordingReporter } from "../fixtures/project.js";

test("disabled logging needs no path and inactive custom settings never execute", () => {
  const raw = savedSettings({
    wordpress: { debug: false, debugLogPath: undefined },
    theme: { custom: false, customSlug: "stale-theme" },
    plugin: { custom: true, customSlug: "stale-plugin" },
    devConfig: { git: true, toolsetWPContent: true },
  });

  const normalized = normalizeSettings(raw, "/tmp/test-site");

  assert.equal(normalized.wordpress.debugLog, false);
  assert.equal(normalized.wordpress.debugScript, false);
  assert.equal(normalized.wordpress.debugLogPath, null);
  assert.equal(normalized.wordpress.coreDir, "wordpress");
  assert.equal(normalized.plugin.custom, undefined);
  assert.equal(normalized.theme.customSlug, undefined);
  assert.equal(normalized.devConfig.git, undefined);
  assert.equal(raw.theme.customSlug, "stale-theme");
});

test("saved fields are revalidated; missing fields and passwords are collected", async () => {
  const raw = savedSettings({ ddev: { localhost: "false" }, wordpress: { adminEmail: 42 }, devConfig: { git: true } });
  const requested = [];
  const answers = { localhost: false, adminEmail: "fixed@example.test", adminPassword: "new-secret" };

  const settings = await collectSettings("/tmp/test-site", raw, {
    reporter: recordingReporter().reporter,
    prompt: async ({ name }) => {
      requested.push(name);
      return { [name]: answers[name] };
    },
  });

  assert.deepEqual(requested, ["localhost", "adminPassword", "adminEmail"]);
  assert.equal(settings.devConfig.git, true);
  assert.equal(settings.wordpress.adminPassword, "new-secret");
  assert.equal(raw.wordpress.adminPassword, "test-password");
});

test("conditional prompts skip stale disabled values and resolve dependent defaults", async () => {
  const raw = savedSettings({ wordpress: { debug: false }, theme: { custom: true, customName: "My Theme" } });
  const requested = [];

  const result = await collectSettings("/tmp/test-site", raw, {
    reporter: recordingReporter().reporter,
    prompt: async ({ name, initial }) => {
      requested.push(name);
      return { [name]: name === "adminPassword" ? "password" : initial };
    },
  });

  assert.deepEqual(requested, ["adminPassword", "useNamespace", "customSlug", "customNamespace"]);
  assert.equal(result.theme.customSlug, "my-theme");
  assert.equal(result.theme.customNamespace, "CassidyDC\\MyTheme");
});

test("normalization rejects invalid saved values, choices, and paths", () => {
  for (const changes of [
    { wordpress: { coreDir: "/../outside" } },
    { wordpress: { wpEnvType: "Unknown" } },
    { ddev: { localhost: "true" } },
    { wordpress: { debugLogPath: "/../../outside.log" } },
  ]) {
    assert.throws(() => normalizeSettings(savedSettings(changes), "/tmp/test-site"));
  }
});
