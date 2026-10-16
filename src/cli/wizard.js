import { createSettingsSchema } from "../config/settings.js";
import { validateExecInstaller, validateField } from "../config/validation.js";
import { configFilename, parseConfig, readConfigText } from "../config/store.js";

const sectionLabels = {
  ddev: "DDEV",
  wordpress: "WordPress",
  plugin: "Plugin",
  theme: "Theme",
  devConfig: "Development Config",
};

export class CancelledError extends Error {
  constructor(exitCode = 0) {
    super("Installation cancelled.");
    this.name = "CancelledError";
    this.exitCode = exitCode;
  }
}

/** Enquirer rejects without an Error when the user presses Ctrl+C. */
export async function createPrompt() {
  const { default: enquirer } = await import("enquirer");
  return async (options) => {
    try {
      const promptOptions =
        options.type === "input" && options.hint && options.initial
          ? { ...options, message: `${options.message} (${options.hint})`, hint: undefined }
          : options;
      return await enquirer.prompt(promptOptions);
    } catch (error) {
      if (!(error instanceof Error)) throw new CancelledError(130);
      throw error;
    }
  };
}

/** Return fresh settings, retaining saved unknown fields without executing them. */
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

export async function runWizard({ rootDir, prompt, reporter }) {
  reporter.heading("Installation Wizard");
  reporter.warn(
    `Note: make sure you are running this wizard from the directory you want to install your local DDEV server in. (You are currently in ${rootDir}). If that is not where you want to be, type "exit" then press enter, and restart the wizard from the correct directory.`,
  );
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
  reporter.info("All settings have been collected. The administrator password will not be saved.");
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
