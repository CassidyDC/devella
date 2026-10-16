/**
 * DDEV Setup Tests
 *
 * @file Verify DDEV YAML updates, hooks, and project recovery behavior.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parse } from "yaml";
import { setupDdev, updateDdevConfig, wordpressConstants } from "../../src/install/ddev.js";
import { normalizeSettings } from "../../src/config/normalize.js";
import { savedSettings, commandRunner, recordingReporter, temporaryProject } from "../fixtures/project.js";

test("YAML edits preserve user configuration and are byte-stable on reruns", async () => {
  const settings = normalizeSettings(savedSettings(), "/tmp/project");

  for (const fixture of ["ddev-custom.yaml", "ddev-flow.yaml"]) {
    const text = await readFile(new URL(`../fixtures/${fixture}`, import.meta.url), "utf8");

    for (const source of [text, text.replaceAll("\n", "\r\n")]) {
      const updated = updateDdevConfig(source, settings);
      const config = parse(updated);

      assert.equal(updateDdevConfig(updated, settings), updated);
      assert.equal(config.use_dns_when_possible, false);
      assert.equal(
        config.hooks["post-start"].filter((hook) => hook.exec?.startsWith("wp --color config set WP_DEBUG ")).length,
        1,
      );

      assert.ok(config.hooks["post-start"].some((hook) => hook.exec?.includes("user-hook")));
      assert.ok(config.upload_dirs.includes("custom-uploads"));
      assert.equal(config.upload_dirs.filter((entry) => entry === "wp-content/uploads").length, 1);
      assert.equal(config.upload_dirs.filter((entry) => entry === "wp-content/ai1wm-backups").length, 1);

      if (fixture === "ddev-custom.yaml") {
        assert.match(updated, /Keep this comment/);
        assert.match(updated, /A custom multiline hook/);
        assert.deepEqual(config.hooks["pre-start"], [{ "exec-host": "echo before" }]);
        assert.ok(config.hooks["post-start"].some((hook) => hook.exec === "wp config set CUSTOM_FLAG true --raw"));
      }

      if (source.includes("\r\n")) assert.ok(!/(?<!\r)\n/.test(updated));
    }
  }
});

test("disabled logging replaces stale hooks and DNS can be changed in both directions", () => {
  const settings = normalizeSettings(
    savedSettings({ wordpress: { debug: false }, ddev: { localhost: false } }),
    "/tmp/project",
  );

  const updated = updateDdevConfig(
    "use_dns_when_possible: false\nhooks:\n  post-start:\n    - exec: wp config set WP_DEBUG_LOG old --raw\n",
    settings,
  );

  const config = parse(updated);

  assert.equal(config.use_dns_when_possible, true);
  assert.equal(
    config.hooks["post-start"].filter((hook) => hook.exec?.startsWith("wp --color config set WP_DEBUG_LOG ")).length,
    1,
  );

  assert.equal(wordpressConstants(settings).WP_DEBUG_LOG, "false");
  assert.equal(wordpressConstants(settings).WP_DEBUG_DISPLAY, "false");
  assert.equal(wordpressConstants(settings).SCRIPT_DEBUG, "false");
});

test("generated hooks pass PHP expressions literally through the container shell", async () => {
  const settings = normalizeSettings(
    savedSettings({ wordpress: { debugLogPath: "/wp-content/logs/Jacob's $HOME $(echo nope).log" } }),
    "/tmp/project",
  );

  const config = parse(updateDdevConfig("{}\n", settings));
  const hook = config.hooks["post-start"].find(({ exec }) =>
    exec.startsWith("wp --color config set WP_DEBUG_LOG "),
  ).exec;
  const { stdout } = await promisify(execFile)("sh", ["-c", `wp() { printf '%s' "$5"; }; ${hook}`]);

  assert.equal(stdout, wordpressConstants(settings).WP_DEBUG_LOG);
});

test("invalid YAML and incompatible DDEV configurations fail before editing", () => {
  const settings = normalizeSettings(savedSettings(), "/tmp/project");

  for (const content of [
    "[",
    "[]",
    "hooks: 42",
    "hooks: {post-start: nope}",
    "upload_dirs: nope",
    "name: other-project",
    "type: drupal",
    "docroot: web",
    "hooks: {}\nhooks: {}\n",
  ]) {
    assert.throws(() => updateDdevConfig(content, settings));
  }
});

test("recreating configuration stops a registered project before configuring it", async (t) => {
  const rootDir = await temporaryProject(t);
  const settings = normalizeSettings(savedSettings(), rootDir);

  const { calls, runCommand } = commandRunner(async (command, args) => {
    if (args[0] === "config") {
      await mkdir(path.join(rootDir, ".ddev"));
      await writeFile(path.join(rootDir, ".ddev/config.yaml"), "name: test-site\ntype: wordpress\n");
    }
  });

  await setupDdev({
    rootDir,
    settings,
    runCommand,
    reporter: recordingReporter().reporter,
    facts: { registeredProject: true },
  });

  assert.deepEqual(
    calls.map(({ args }) => args[0]),
    ["stop", "config", "start"],
  );
});
