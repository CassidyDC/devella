import assert from "node:assert/strict";
import test from "node:test";
import { setupWordPress } from "../../src/install/wordpress.js";
import { normalizeSettings } from "../../src/config/normalize.js";
import { savedSettings, commandRunner, recordingReporter } from "../fixtures/project.js";
import { wordpressSimulation } from "../fixtures/wordpress.js";

/**
 * Combine a WP-CLI simulation with the installer dependencies used by tests.
 *
 * @param {{state: object, handle: Function}} simulation Simulated WordPress state and command handler.
 * @returns {object} WordPress setup context with reporter and command runner.
 */
function context(simulation) {
  return {
    rootDir: "/tmp/test-site",
    settings: normalizeSettings(savedSettings(), "/tmp/test-site"),
    reporter: recordingReporter().reporter,
    ...commandRunner((command, args) => {
      assert.equal(command, "ddev");
      return simulation.handle(args);
    }),
  };
}

test("a fresh install cleans defaults once and a rerun preserves all content", async () => {
  const simulation = wordpressSimulation();
  const ctx = context(simulation);
  assert.deepEqual(await setupWordPress(ctx), { freshInstall: true });
  assert.deepEqual(simulation.state.posts, ["10"]);
  assert.equal(simulation.state.options.page_on_front, "10");
  assert.equal(simulation.state.options.show_on_front, "page");
  assert.equal(simulation.state.plugins.find(({ name }) => name === "all-in-one-wp-migration").status, "active");
  ctx.calls.length = 0;
  simulation.state.posts.push("1", "2", "3", "99");
  assert.deepEqual(await setupWordPress(ctx), { freshInstall: false });
  assert.deepEqual(simulation.state.posts, ["10", "1", "2", "3", "99"]);
  assert.ok(!ctx.calls.some(({ args }) => ["install", "delete", "create", "eval"].includes(args[2])));
  assert.ok(!ctx.calls.some(({ args }) => args[1] === "eval" && args[2].includes("update_user_meta")));
});

test("reruns preserve the active custom theme and front page", async () => {
  const simulation = wordpressSimulation({ installed: true, themes: [{ name: "custom-theme", status: "active" }] });
  simulation.state.options.show_on_front = "page";
  simulation.state.options.page_on_front = "42";
  const ctx = context(simulation);
  await setupWordPress(ctx);
  assert.equal(simulation.state.options.page_on_front, "42");
  const installation = ctx.calls.find(({ args }) => args[1] === "theme" && args[2] === "install");
  assert.ok(!installation.args.includes("--activate"));
  assert.ok(!ctx.calls.some(({ args }) => args[1] === "theme" && args[2] === "activate"));
});

test("partial homepage setup reuses the page and enables it without duplication", async () => {
  const simulation = wordpressSimulation({ installed: true, homepage: "27" });
  const ctx = context(simulation);
  await setupWordPress(ctx);
  assert.equal(simulation.state.options.page_on_front, "27");
  assert.ok(!ctx.calls.some(({ args }) => args[1] === "post" && args[2] === "create"));
});

test("WordPress or database probe errors do not trigger core installation", async () => {
  const ctx = context(wordpressSimulation());
  const { calls, runCommand } = commandRunner(() => ({ exitCode: 1, stderr: "Error: database connection failed" }));
  await assert.rejects(setupWordPress({ ...ctx, runCommand }), /installation status/);
  assert.equal(calls.length, 1);
});
