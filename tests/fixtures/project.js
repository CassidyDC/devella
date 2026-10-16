import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Create a temporary project directory that is removed with the current test.
 *
 * @param {import("node:test").TestContext} t Active test context for cleanup registration.
 * @returns {Promise<string>} Absolute path to the temporary project directory.
 */
export async function temporaryProject(t) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "ddev-wp tests-"));
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  return rootDir;
}

/**
 * Build a complete test settings object with optional section overrides.
 *
 * @param {object} [overrides={}] Per-section values to merge over the standard fixture.
 * @returns {object} Complete wizard settings suitable for normalization or installation tests.
 */
export function savedSettings(overrides = {}) {
  const settings = {
    ddev: { projectName: "test-site", localhost: true, spatieRay: false },
    wordpress: {
      adminUsername: "admin",
      adminPassword: "test-password",
      adminEmail: "admin@example.test",
      siteTitle: "Test Site",
      siteTagline: "",
      coreDir: "/wordpress",
      cleanState: true,
      postnamePermalinks: true,
      homepage: true,
      debug: true,
      debugScript: true,
      debugDisplayHidden: true,
      debugLog: true,
      debugLogPath: "/wp-content/logs/wp-errors.log",
      projectType: "Theme",
      wpDevMode: "Theme",
      wpEnvType: "Local",
    },
    plugin: { ai1wm: true },
    theme: { custom: false, defaultTheme: true },
    devConfig: { docs: true },
  };

  for (const [section, values] of Object.entries(overrides)) settings[section] = { ...settings[section], ...values };

  return settings;
}

/**
 * Create a reporter stub that records calls as named events.
 *
 * @returns {{events: Array<Array<*>>, reporter: object}} Reporter adapter and its recorded calls.
 */
export function recordingReporter() {
  const events = [];

  const reporter = Object.fromEntries(
    ["info", "success", "warn", "dim", "error", "heading", "clear", "header", "help", "debug"].map((name) => [
      name,
      (...args) => events.push([name, ...args]),
    ]),
  );
  return { events, reporter };
}

/**
 * Create a subprocess stub that records calls and delegates results to a handler.
 *
 * @param {(command: string, args: string[], options: object) => object} [handler] Function returning a simulated process result.
 * @returns {{calls: Array<object>, runCommand: Function}} Recorded calls and the runner adapter.
 */
export function commandRunner(
  handler = (command, args) => (command === "ddev" && args[0] === "list" ? { stdout: '{"raw":[]}' } : {}),
) {
  const calls = [];

  /**
   * Record a simulated subprocess call and return its handler's result.
   *
   * @param {string} command Executable name.
   * @param {string[]} args Arguments supplied to the executable.
   * @param {object} options Working directory and process options.
   * @returns {Promise<object>} Simulated process output and status.
   */
  const runCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    return { stdout: "", stderr: "", exitCode: 0, signal: null, ...(await handler(command, args, options)) };
  };
  return { calls, runCommand };
}
