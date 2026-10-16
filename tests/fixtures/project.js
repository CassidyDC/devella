import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function temporaryProject(t) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "ddev-wp tests-"));
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  return rootDir;
}

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

export function recordingReporter() {
  const events = [];
  const reporter = Object.fromEntries(
    ["info", "warn", "error", "heading", "clear", "header", "help", "debug"].map((name) => [
      name,
      (...args) => events.push([name, ...args]),
    ]),
  );
  return { events, reporter };
}

export function commandRunner(
  handler = (command, args) => (command === "ddev" && args[0] === "list" ? { stdout: '{"raw":[]}' } : {}),
) {
  const calls = [];
  const runCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    return { stdout: "", stderr: "", exitCode: 0, signal: null, ...(await handler(command, args, options)) };
  };
  return { calls, runCommand };
}
