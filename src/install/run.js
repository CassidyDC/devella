import { createPrompt, runWizard } from "../cli/wizard.js";
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
  const result = await runWizard({ rootDir, reporter, prompt: prompt ?? (await createPrompt()) });
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
