/**
 * Project Preparation Tests
 * @file Verify preflight checks, filesystem setup, and generated project files.
 */

import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { mkdir, readFile, readdir, symlink, writeFile } from "node:fs/promises";
import { normalizeSettings } from "../../src/config/normalize.js";
import { preflight } from "../../src/install/preflight.js";
import { prepareFilesystem } from "../../src/install/filesystem.js";
import { prepareComposer } from "../../src/install/integrations/composer.js";
import { renderIndex, renderWpCli } from "../../src/install/templates/wordpress-bootstrap.js";
import { renderRay } from "../../src/install/templates/ray.js";
import { assertProjectPath, projectRelativePath } from "../../src/system/paths.js";
import { commandRunner, recordingReporter, savedSettings, temporaryProject } from "../fixtures/project.js";

/**
 * Create a standard installation context rooted in a temporary project.
 *
 * @param {import("node:test").TestContext} t Active test context for cleanup registration.
 * @param {object} [overrides] Values to override in the standard saved settings.
 * @returns {Promise<object>} Test context with temporary root, normalized settings, runner, and reporter.
 */
async function context(t, overrides) {
  const rootDir = await temporaryProject(t);

  return {
    rootDir,
    settings: normalizeSettings(savedSettings(overrides), rootDir),
    reporter: recordingReporter().reporter,
    ...commandRunner(),
  };
}

test("preflight probes dependencies without creating project files", async (t) => {
  const ctx = await context(t);

  await preflight(ctx);
  assert.deepEqual(await readdir(ctx.rootDir), []);
  assert.deepEqual(
    ctx.calls.map(({ command, args }) => [command, ...args]),
    [
      ["ddev", "--version"],
      ["composer", "--version"],
      ["docker", "--version"],
      ["docker", "info"],
      ["ddev", "list", "--json-output"],
    ],
  );

  assert.ok(ctx.calls.every(({ options }) => options.cwd === ctx.rootDir));
});

test("unavailable Docker fails with an actionable message before writes", async (t) => {
  const ctx = await context(t);
  const { runCommand } = commandRunner((command, args) => {
    if (args[0] === "info") throw new Error("daemon down");
  });

  await assert.rejects(preflight({ ...ctx, runCommand }), /Start your Docker provider/);
  assert.deepEqual(await readdir(ctx.rootDir), []);
});

test("a DDEV project registered elsewhere cannot be stopped or reused", async (t) => {
  const ctx = await context(t);
  const otherRoot = await temporaryProject(t);

  const { calls, runCommand } = commandRunner((command, args) =>
    args[0] === "list"
      ? {
          stdout: JSON.stringify({ raw: [{ name: "test-site", approot: otherRoot }] }),
        }
      : {},
  );

  await assert.rejects(preflight({ ...ctx, runCommand }), /different directory/);
  assert.deepEqual(await readdir(ctx.rootDir), []);
  assert.ok(!calls.some(({ args }) => args[0] === "stop"));
});

test("a registered project in the same directory is available for configuration recovery", async (t) => {
  const ctx = await context(t);

  const { runCommand } = commandRunner((command, args) =>
    args[0] === "list"
      ? {
          stdout: JSON.stringify({ raw: [{ name: "test-site", approot: ctx.rootDir }] }),
        }
      : {},
  );
  assert.equal((await preflight({ ...ctx, runCommand })).registeredProject, true);
});

test("conflicting bootstrap files, Composer settings, and YAML are preserved", async (t) => {
  for (const [name, content] of [
    ["index.php", "<?php echo 'custom';"],
    ["wp-cli.yml", "path: other-core"],
    ["composer.json", '{"extra":{"wordpress-install-dir":"elsewhere"}}'],
    ["composer.json", '{"config":{"allow-plugins":false}}'],
    [".ddev/config.yaml", "hooks: nope"],
  ]) {
    const ctx = await context(t);
    const filename = path.join(ctx.rootDir, name);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, content);
    await assert.rejects(preflight(ctx));
    assert.equal(await readFile(filename, "utf8"), content);
    assert.ok(!ctx.calls.some(({ args }) => args[0] === "require" || args[0] === "start"));
  }
});

test("project paths reject traversal, escaping symlinks, and dangling symlinks", async (t) => {
  const root = await temporaryProject(t);
  const outside = await temporaryProject(t);

  for (const value of ["/../outside", "/a/../../outside", "C:/outside", "a\\b", "/", "a\0b"])
    assert.throws(() => projectRelativePath(value));

  await symlink(outside, path.join(root, "escape"));
  await assert.rejects(assertProjectPath(root, "escape/file"), /symlink/);
  await symlink(path.join(outside, "missing"), path.join(root, "dangling"));
  await assert.rejects(assertProjectPath(root, "dangling"), /symlink/);
  await mkdir(path.join(root, "inside"));
  await symlink(path.join(root, "inside"), path.join(root, "alias"));
  assert.equal(await assertProjectPath(root, "alias/new-file"), path.join(root, "alias/new-file"));
});

test("filesystem preparation preserves files and supports disabled or root-level logs", async (t) => {
  const ctx = await context(t, { wordpress: { debug: false } });
  await preflight(ctx);
  await prepareFilesystem(ctx);
  await writeFile(path.join(ctx.rootDir, "ray.php"), "custom Ray settings");
  ctx.settings.ddev.spatieRay = true;
  await prepareFilesystem(ctx);
  assert.equal(await readFile(path.join(ctx.rootDir, "ray.php"), "utf8"), "custom Ray settings");
  assert.ok(!(await readdir(path.join(ctx.rootDir, "wp-content"))).includes("logs"));
  const rootLogs = await context(t, { wordpress: { debugLogPath: "/wp-errors.log" } });
  await preflight(rootLogs);
  await prepareFilesystem(rootLogs);
});

test("Composer merges existing settings and installs from the lock on reruns", async (t) => {
  const ctx = await context(t);

  const existing = {
    name: "user/project",
    require: { "roots/wordpress": "^6.0", "some/package": "^1" },
    extra: { custom: "keep" },
    config: { "allow-plugins": { "other/plugin": true } },
    scripts: { custom: "echo keep" },
  };

  await writeFile(path.join(ctx.rootDir, "composer.json"), JSON.stringify(existing));
  await preflight(ctx);
  await prepareComposer(ctx);
  const composer = JSON.parse(await readFile(path.join(ctx.rootDir, "composer.json"), "utf8"));

  assert.deepEqual(composer.require, existing.require);
  assert.deepEqual(composer.scripts, existing.scripts);
  assert.equal(composer.extra.custom, "keep");
  assert.equal(composer.extra["wordpress-install-dir"], "wordpress");
  assert.equal(composer.config["allow-plugins"]["other/plugin"], true);
  assert.ok(ctx.calls.some(({ command, args }) => command === "composer" && args[0] === "install"));
  assert.ok(!ctx.calls.some(({ args }) => args[0] === "require"));
});

test("templates escape PHP literals and serialize unusual core paths", () => {
  const coreDir = "core's $directory";
  assert.match(renderIndex(coreDir), /core\\'s \$directory/);
  assert.match(renderRay("/Users/Jacob's project"), /Jacob\\'s project/);
  assert.ok(renderWpCli(coreDir).includes(coreDir));
});
