import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { runInstaller } from "../../src/install/run.js";
import { configFilename, readConfigText, saveConfig } from "../../src/config/store.js";
import { CancelledError } from "../../src/cli/wizard.js";
import { temporaryProject, savedSettings, commandRunner, recordingReporter } from "../fixtures/project.js";
import { wordpressSimulation } from "../fixtures/wordpress.js";

/**
 * Return a prompt stub that supplies saved answers and run confirmation.
 * @param {object} settings Wizard settings to return for each prompt.
 * @param {{restart?: boolean, cancel?: boolean}} [options={}] Control config restart or final cancellation.
 * @returns {(options: object) => Promise<object>} Prompt adapter returning simulated answers.
 */
function promptFor(settings, { restart = false, cancel = false } = {}) {
  return async ({ name, initial }) => {
    if (name === "dockerProvider") return { dockerProvider: cancel ? "exit" : "" };
    if (name === "reuse") return { reuse: restart ? "Start from scratch" : "Continue with existing config" };
    if (name === "answer") return { answer: cancel ? "exit" : "run" };
    if (name === "adminPassword") return { adminPassword: settings.wordpress.adminPassword };
    const value = Object.values(settings).find((section) => Object.hasOwn(section, name))?.[name];
    return { [name]: value ?? initial };
  };
}

test("the full installer supports a fresh project, a rerun, and recovery from a partial homepage setup", async (t) => {
  const rootDir = await temporaryProject(t);
  const settings = savedSettings({ wordpress: { debug: false }, devConfig: { git: true, toolsetWPContent: true } });
  await saveConfig(rootDir, settings);
  const simulation = wordpressSimulation();
  const { calls, runCommand } = commandRunner(async (command, args) => {
    if (args[0] === "--version" || args[0] === "info" || command === "composer") return {};
    assert.equal(command, "ddev");
    if (args[0] === "list") return { stdout: '{"raw":[]}' };
    if (args[0] === "stop") return { exitCode: 1, stderr: "project not found" };
    if (args[0] === "config") {
      await mkdir(path.join(rootDir, ".ddev"), { recursive: true });
      await writeFile(path.join(rootDir, ".ddev/config.yaml"), "name: test-site\ntype: wordpress\n");
      return {};
    }
    if (args[0] === "start") return {};
    return simulation.handle(args);
  });
  const context = { rootDir, prompt: promptFor(settings), reporter: recordingReporter().reporter, runCommand };
  assert.deepEqual(await runInstaller(context), { freshInstall: true });
  const firstDdevConfig = await readFile(path.join(rootDir, ".ddev/config.yaml"), "utf8");
  const saved = JSON.parse(await readConfigText(rootDir));
  assert.equal(saved.wordpress.adminPassword, undefined);
  assert.equal(saved.devConfig.git, true);
  assert.equal(saved.devConfig.toolsetWPContent, true);
  assert.ok(!(await readdir(rootDir)).includes(".git"));
  assert.ok(!(await readdir(path.join(rootDir, "wp-content"))).includes("logs"));
  assert.ok(calls.every(({ options }) => options.cwd === rootDir));
  const dockerCheck = calls.findIndex(({ command, args }) => command === "docker" && args[0] === "info");
  const composerInstall = calls.findIndex(({ command, args }) => command === "composer" && args[0] !== "--version");
  const ddevStart = calls.findIndex(({ command, args }) => command === "ddev" && args[0] === "start");
  const wpInstall = calls.findIndex(({ args }) => args[0] === "wp" && args[1] === "core" && args[2] === "install");
  assert.ok(dockerCheck >= 0 && dockerCheck < composerInstall && composerInstall < ddevStart && ddevStart < wpInstall);
  calls.length = 0;
  simulation.state.options.show_on_front = "posts";
  simulation.state.options.page_on_front = "0";
  assert.deepEqual(await runInstaller(context), { freshInstall: false });
  assert.equal(simulation.state.options.page_on_front, "10");
  assert.equal(await readFile(path.join(rootDir, ".ddev/config.yaml"), "utf8"), firstDdevConfig);
  assert.ok(!calls.some(({ args }) => args[0] === "config" || args[0] === "stop"));
  assert.ok(!calls.some(({ args }) => args[1] === "core" && args[2] === "install"));
  assert.ok(!calls.some(({ args }) => args[1] === "post" && ["delete", "create"].includes(args[2])));
});

test("confirmation exit and Ctrl+C create no files or subprocesses", async (t) => {
  const settings = savedSettings();
  for (const interrupt of [false, true]) {
    const rootDir = await temporaryProject(t);
    const { calls, runCommand } = commandRunner();
    const prompt = interrupt
      ? async () => {
          throw new CancelledError(130);
        }
      : promptFor(settings, { cancel: true });
    await assert.rejects(
      runInstaller({ rootDir, prompt, reporter: recordingReporter().reporter, runCommand }),
      CancelledError,
    );
    assert.deepEqual(await readdir(rootDir), []);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, "docker");
    assert.deepEqual(calls[0].args, ["info"]);
  }
});

test("a preflight failure saves answers without the password and stops the full installer", async (t) => {
  const rootDir = await temporaryProject(t);
  const settings = savedSettings();
  await writeFile(path.join(rootDir, configFilename), "broken JSON");
  let dockerInfoChecks = 0;
  const { calls, runCommand } = commandRunner((command, args) => {
    if (command === "docker" && args[0] === "info" && [1, 3].includes(++dockerInfoChecks))
      throw new Error("Docker provider stopped after the startup check");
  });
  await assert.rejects(
    runInstaller({
      rootDir,
      prompt: promptFor(settings, { restart: true }),
      reporter: recordingReporter().reporter,
      runCommand,
    }),
    /Docker is unavailable/,
  );
  const saved = JSON.parse(await readConfigText(rootDir));
  assert.equal(saved.wordpress.adminUsername, settings.wordpress.adminUsername);
  assert.equal(saved.wordpress.adminPassword, undefined);
  assert.equal(await readFile(path.join(rootDir, "ddev-local-wp-setup-config_000.bak"), "utf8"), "broken JSON");
  assert.deepEqual((await readdir(rootDir)).sort(), [configFilename, "ddev-local-wp-setup-config_000.bak"]);
  assert.equal(calls.at(-1).command, "docker");
  assert.deepEqual(calls.at(-1).args, ["info"]);
});

test("a Composer failure prevents DDEV and WordPress execution", async (t) => {
  const rootDir = await temporaryProject(t);
  const settings = savedSettings();
  await saveConfig(rootDir, settings);
  const { calls, runCommand } = commandRunner((command, args) => {
    if (command === "composer" && args[0] !== "--version") throw new Error("Composer dependency resolution failed");
    if (command === "ddev" && args[0] === "list") return { stdout: '{"raw":[]}' };
  });
  await assert.rejects(
    runInstaller({ rootDir, prompt: promptFor(settings), reporter: recordingReporter().reporter, runCommand }),
    /dependency resolution failed/,
  );
  assert.ok(!calls.some(({ command, args }) => command === "ddev" && !["--version", "list"].includes(args[0])));
});
