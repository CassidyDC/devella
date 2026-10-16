import { createRequire } from "node:module";
import { createSettingsSchema } from "../config/settings.js";
import { validateExecInstaller, validateField } from "../config/validation.js";
import { configFilename, parseConfig, readConfigText } from "../config/store.js";

const require = createRequire(import.meta.url);

const closedReadlineGuard = Symbol("closedReadlineGuard");

const sectionLabels = {
  ddev: "DDEV",
  wordpress: "WordPress",
  plugin: "Plugin",
  theme: "Theme",
  devConfig: "Development Config",
};

// On Node 24+, readline may close itself on Ctrl+C before Enquirer runs its cleanup handler.
/**
 * Guard Enquirer's readline cleanup methods against an already-closed interface.
 *
 * @returns {void} Installs the guard once on Enquirer's keypress listener.
 */
function guardEnquirerReadlineCleanup() {
  const keypress = require("enquirer/lib/keypress.js");
  if (keypress.listen[closedReadlineGuard]) return;

  const listen = keypress.listen;
  /**
   * Apply the closed-readline guard before forwarding each keypress.
   *
   * @param {object} options Enquirer keypress listener options.
   * @param {Function} onKeypress Original keypress callback.
   * @returns {Function} Patched listener that protects readline cleanup.
   */
  const patchedListen = (options, onKeypress) =>
    listen(options, (buffer, key, readline) => {
      if (!readline[closedReadlineGuard]) {
        const pause = readline.pause;
        const close = readline.close;
        readline.pause = function (...args) {
          return this.closed ? this : pause.apply(this, args);
        };
        readline.close = function (...args) {
          return this.closed ? this : close.apply(this, args);
        };
        Object.defineProperty(readline, closedReadlineGuard, { value: true });
      }

      return onKeypress(buffer, key, readline);
    });
  Object.defineProperty(patchedListen, closedReadlineGuard, { value: true });
  keypress.listen = patchedListen;
}

/**
 * Represent an intentional wizard exit and its process status.
 *
 * @extends Error
 */
export class CancelledError extends Error {
  /**
   * Create a cancellation error with the requested process exit code.
   *
   * @param {number} [exitCode=0] Status to return when the user cancels.
   */
  constructor(exitCode = 0) {
    super("Installation cancelled.");
    this.name = "CancelledError";
    this.exitCode = exitCode;
  }
}

/**
 * Create an Enquirer prompt adapter that converts Ctrl+C into a cancellation error.
 * Enquirer can reject without an Error instance when the user presses Ctrl+C.
 *
 * @returns {Promise<(options: object) => Promise<object>>} Prompt function backed by Enquirer.
 */
export async function createPrompt() {
  guardEnquirerReadlineCleanup();

  const { default: enquirer } = await import("enquirer");
  return async (options) => {
    try {
      return await enquirer.prompt(options);
    } catch (error) {
      if (!(error instanceof Error)) throw new CancelledError(130);
      throw error;
    }
  };
}

/**
 * Collect and validate enabled wizard fields while retaining unknown saved keys.
 *
 * @param {string} rootDir Project directory used to derive prompt defaults.
 * @param {object} existing Previously saved wizard settings.
 * @param {{prompt: (options: object) => Promise<object>, reporter: object}} adapters Prompt and output adapters.
 * @returns {Promise<object>} Complete settings object with the administrator password collected anew.
 * @throws {CancelledError|Error} If prompting is cancelled or a prompt operation fails.
 */
export async function collectSettings(rootDir, existing, { prompt, reporter }) {
  const settings = structuredClone(existing);
  if (settings.wordpress) delete settings.wordpress.adminPassword;
  const schema = createSettingsSchema(rootDir);
  for (const section of Object.keys(schema)) settings[section] ??= {};
  for (const [section, fields] of Object.entries(schema)) {
    let headingShown = false;
    for (const [name, field] of Object.entries(fields)) {
      if (field.enabled && !field.enabled(settings)) continue;
      const saved = settings[section][name];
      if (Object.hasOwn(settings[section], name) && validateField(field, saved) === true) continue;
      if (!headingShown) {
        reporter.heading(`${sectionLabels[section]} Settings`);
        headingShown = true;
      }
      if (saved !== undefined) reporter.warn(`The saved value for ${section}.${name} is invalid; enter a replacement.`);
      const { enabled, initial, validate, ...options } = field;
      // All validation uses field metadata, including type checks for saved values.
      void enabled;
      void validate;
      const resolvedInitial = typeof initial === "function" ? initial(settings) : initial;
      if (field.choices) {
        options.choices = field.choices.map((choice) => (typeof choice === "object" ? { ...choice } : choice));
      }
      while (true) {
        const answer = await prompt({
          ...options,
          name,
          initial: resolvedInitial,
          validate: (value) => validateField(field, value),
        });
        const result = validateField(field, answer[name]);
        if (result !== true) {
          reporter.warn(result);
          continue;
        }
        settings[section][name] =
          typeof answer[name] === "string" && !field.secret ? answer[name].trim() : answer[name];
        break;
      }
    }
  }
  for (const kind of ["theme", "plugin"]) {
    if (!settings[kind].useNamespace) delete settings[kind].customNamespace;
    else delete settings[kind].customFunctionPrefix;
  }
  return settings;
}

/**
 * Show the setup warning, collect answers, and confirm whether to run.
 *
 * @param {{rootDir: string, prompt: (options: object) => Promise<object>, reporter: object}} options Wizard dependencies.
 * @returns {Promise<{settings: object, restart: boolean}>} Collected settings and config-restart choice.
 * @throws {CancelledError|Error} If the user exits or the saved config cannot be read.
 */
export async function runWizard({ rootDir, prompt, reporter }) {
  reporter.heading("Installation Wizard");
  reporter.warn(`Check the project directory before continuing: ${rootDir}`);
  reporter.warn("The installer will create files and configure this directory as a DDEV WordPress project.");
  reporter.info("");
  const { answer: continueAnswer } = await prompt({
    type: "input",
    name: "answer",
    message: 'Press Enter to continue, or type "exit" to quit:',
  });
  if (continueAnswer.trim().toLowerCase() === "exit") throw new CancelledError();
  const text = await readConfigText(rootDir);
  let existing = {};
  let restart = false;
  if (text !== null) {
    const { reuse } = await prompt({
      type: "select",
      name: "reuse",
      message: `Found ${configFilename}. How would you like to proceed?`,
      choices: ["Continue with existing config", "Start from scratch"],
    });
    restart = reuse === "Start from scratch";
    if (!restart) existing = parseConfig(text);
  }
  const settings = await collectSettings(rootDir, existing, { prompt, reporter });
  reporter.info("");
  reporter.warn("All settings have been collected. The administrator password will not be saved.");
  reporter.info("");
  const { answer } = await prompt({
    type: "input",
    name: "answer",
    message: 'Type "run" to start the installer, or "exit" to quit:',
    validate: validateExecInstaller,
  });
  if (answer.trim().toLowerCase() !== "run") throw new CancelledError();
  return { settings, restart };
}
