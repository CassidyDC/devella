import { CancelledError, createPrompt, runWizard } from "../cli/wizard.js";
import { normalizeSettings } from "../config/normalize.js";
import { saveConfig } from "../config/store.js";
import { runCommand as execute } from "../system/process.js";
import { preflight } from "./preflight.js";
import { prepareFilesystem } from "./filesystem.js";
import { prepareComposer } from "./composer.js";
import { setupDdev } from "./ddev.js";
import { setupWordPress } from "./wordpress.js";

/**
 * @typedef {object} InstallContext
 * @property {string} rootDir Absolute project directory.
 * @property {import('../config/normalize.js').InstallSettings} settings Validated execution settings.
 * @property {typeof execute} runCommand Subprocess adapter.
 * @property {ReturnType<import('../cli/ui/reporter.js').createReporter>} reporter Terminal adapter.
 * @property {{registeredProject: boolean}} [facts] Read-only preflight results.
 */

export async function runInstaller({ rootDir, reporter, prompt, runCommand = execute }) {
  const ask = prompt ?? (await createPrompt());
  await ensureDockerProvider({ rootDir, reporter, prompt: ask, runCommand });

  const result = await runWizard({ rootDir, reporter, prompt: ask });
  const settings = normalizeSettings(result.settings, rootDir);
  const context = { rootDir, settings, runCommand, reporter };
  await saveConfig(rootDir, result.settings, { restart: result.restart });
  context.facts = await preflight(context);
  await prepareFilesystem(context);
  await prepareComposer(context);
  await setupDdev(context);
  const outcome = await setupWordPress(context);
  reporter.info("WordPress setup complete.");
  return outcome;
}

async function ensureDockerProvider({ rootDir, reporter, prompt, runCommand }) {
  while (true) {
    try {
      await runCommand("docker", ["info"], { cwd: rootDir, output: "capture" });
      return;
    } catch (error) {
      if (error?.signal === "SIGINT") throw new CancelledError(130);

      reporter.warn("Docker is not available. Start your Docker provider before continuing the wizard.");
      const { dockerProvider } = await prompt({
        type: "input",
        name: "dockerProvider",
        message: 'Start Docker, then press Enter to check again, or type "exit" to quit:',
        validate: (answer) =>
          answer.trim() === "" || answer.trim().toLowerCase() === "exit" || 'Press Enter to retry or type "exit".',
      });
      if (dockerProvider?.trim().toLowerCase() === "exit") throw new CancelledError();
    }
  }
}
