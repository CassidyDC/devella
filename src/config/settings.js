/**
 * Settings Schema
 * @file Define ordered installation wizard sections, fields, defaults, and hints.
 */

import {
  generateNamespaceFromName,
  generateProjectNameFromDir,
  generateSlugFromName,
  generateTitleFromSlug,
} from "./names.js";
import {
  validateLogPath,
  validateNamespace,
  validateFunctionPrefix,
  validateSlug,
  validateString,
  validateWPAdminEmail,
  validateWPAdminPassword,
  validateWPAdminUsername,
  validateWPCoreDir,
} from "./validation.js";

/**
 * Create an input prompt definition with optional field metadata.
 *
 * @param {string} message Prompt label.
 * @param {object} [options={}] Initial value, validation, hint, and conditional metadata.
 * @returns {object} Enquirer input prompt definition.
 */
const input = (message, options = {}) => ({ type: "input", message, ...options });

/**
 * Create a yes/no prompt definition that defaults to yes.
 *
 * @param {string} message Prompt label.
 * @param {object} [options={}] Additional prompt metadata, including an optional default override.
 * @returns {object} Enquirer confirmation prompt definition.
 */
const confirm = (message, options = {}) => ({ type: "confirm", message, initial: true, ...options });

/**
 * Create a selection prompt definition that defaults to its first choice.
 *
 * @param {string} message Prompt label.
 * @param {Array<string|object>} choices Available prompt choices.
 * @returns {object} Enquirer selection prompt definition.
 */
const select = (message, choices) => ({ type: "select", message, choices, initial: choices[0] });

/**
 * Build the declarative wizard fields for a project directory.
 * The schema contains plain metadata and does not read environment state or render prompts.
 *
 * @param {string} rootDir Project directory used to derive default names and paths.
 * @returns {object} Ordered wizard sections and their field definitions.
 */
export function createSettingsSchema(rootDir) {
  /**
   * Build the conditional fields shared by custom theme and plugin settings.
   *
   * @param {"theme"|"plugin"} kind Custom directory type to describe.
   * @returns {object} Prompt definitions for custom name, slug, namespace, and prefix.
   */
  const customFields = (kind) => ({
    custom: confirm(`Create a new custom ${kind} directory?`, {
      initial: false,
      hint: "Creates the directory only; starter files are not included.",
      enabled: ({ wordpress }) => [kind === "theme" ? "Theme" : "Plugin", "Both"].includes(wordpress.projectType),
    }),
    useNamespace: confirm(
      `Use official PHP namespacing style instead of the WordPress PHP function naming scheme for this custom ${kind}?`,
      {
        initial: true,
        enabled: (settings) => settings[kind].custom,
      },
    ),
    customName: input(`Custom ${kind} name:`, {
      validate: validateString,
      enabled: (settings) => settings[kind].custom,
    }),
    customSlug: input(`Custom ${kind} directory slug:`, {
      validate: validateSlug,
      initial: (settings) => generateSlugFromName(settings[kind].customName),
      enabled: (settings) => settings[kind].custom,
    }),
    customNamespace: input(`Custom ${kind} namespace:`, {
      validate: validateNamespace,
      initial: (settings) => `CassidyDC\\${generateNamespaceFromName(settings[kind].customName)}`,
      hint: "Use a PHP namespace beginning with a capitalized vendor name.",
      enabled: (settings) => settings[kind].custom && settings[kind].useNamespace,
    }),
    customFunctionPrefix: input(`Custom ${kind} function prefix:`, {
      validate: validateFunctionPrefix,
      initial: (settings) => `${generateSlugFromName(settings[kind].customName).replaceAll("-", "_")}_`,
      hint: "Use lowercase letters, digits, and underscores, ending with an underscore.",
      enabled: (settings) => settings[kind].custom && settings[kind].useNamespace === false,
    }),
  });

  return {
    ddev: {
      projectName: input("DDEV project name:", {
        initial: generateSlugFromName(generateProjectNameFromDir(rootDir)),
        validate: validateSlug,
        hint: "Defaults to the current directory name, without leading non-alphanumeric characters or characters after a period.",
      }),
      localhost: confirm("Use localhost to resolve your DDEV domain?", {
        hint: "Using localhost may require permission to update your hosts file.",
      }),
      spatieRay: confirm("Add Spatie Ray connection files for DDEV?", {
        hint: "Connects the DDEV project to the Spatie Ray debugging app.",
      }),
    },
    wordpress: {
      adminUsername: input("WP Admin Username:", {
        validate: validateWPAdminUsername,
        hint: "Used for the initial WordPress administrator account.",
      }),
      adminPassword: {
        type: "password",
        message: "WP Admin Password:",
        secret: true,
        validate: validateWPAdminPassword,
        hint: "At least five characters. This password is requested again each time the installer runs.",
      },
      adminEmail: input("WP Admin Email:", {
        validate: validateWPAdminEmail,
        hint: "Used for the initial WordPress administrator account.",
      }),
      siteTitle: input("Site Title:", {
        initial: ({ ddev }) => generateTitleFromSlug(ddev.projectName),
        validate: validateString,
        hint: "Defaults to a formatted version of the DDEV project name.",
      }),
      siteTagline: input("Site Tagline:", { initial: "", hint: "Leave blank if no tagline is desired." }),
      coreDir: input("WordPress Core Directory:", {
        initial: "/wordpress",
        validate: validateWPCoreDir,
        hint: "wp-content stays outside this core directory.",
      }),
      cleanState: confirm("Remove default content when installing a new WordPress site?", {
        hint: "Only applies to a fresh installation; reruns preserve existing content.",
      }),
      postnamePermalinks: confirm("Use the postname slug for WordPress permalinks?", {
        hint: "Produces readable URLs based on each post or page title.",
      }),
      homepage: confirm("Add a non-blog homepage if no static front page is configured?", {
        hint: "An existing static front page is preserved.",
      }),
      debug: confirm("Enable WordPress debugging?", {
        hint: "Enables WP_DEBUG and the related debugging settings below.",
      }),
      debugScript: confirm("Enable script debugging?", {
        hint: "Enables SCRIPT_DEBUG for WordPress scripts and stylesheets.",
        enabled: ({ wordpress }) => wordpress.debug,
      }),
      debugDisplayHidden: confirm("Hide the frontend debugging display?", {
        hint: "Prevents errors and notices from appearing on the public site.",
        enabled: ({ wordpress }) => wordpress.debug,
      }),
      debugLog: confirm("Enable debug logging?", {
        hint: "If yes, the path will be prompted next.",
        enabled: ({ wordpress }) => wordpress.debug,
      }),
      debugLogPath: input("Debug Log Path:", {
        initial: "/wp-content/logs/wp-errors.log",
        validate: validateLogPath,
        hint: "Use a path relative to the project root, beginning with /.",
        enabled: ({ wordpress }) => wordpress.debug && wordpress.debugLog,
      }),
      projectType: {
        ...select("What are you developing?", ["Theme", "Plugin", "Both"]),
        hint: "Controls which custom theme and plugin options are offered.",
      },
      wpDevMode: {
        ...select("Set WP_DEVELOPMENT_MODE:", ["Theme", "Plugin", "Core", "All"]),
        hint: "Choose the part of WordPress you are actively developing.",
      },
      wpEnvType: {
        ...select("Set WP_ENVIRONMENT_TYPE:", ["Local", "Development", "Staging", "Production"]),
        hint: "Local is the recommended setting for a DDEV project.",
      },
    },
    plugin: {
      ...customFields("plugin"),
      ai1wm: confirm("Install the All-in-One WP Migration plugin?", {
        hint: "Installs and activates the migration plugin.",
      }),
    },
    theme: {
      ...customFields("theme"),
      defaultTheme: confirm("Include the default WordPress theme as a fallback?", {
        hint: "Keeps a stock theme available if a custom theme has an error.",
      }),
    },
    devConfig: {
      docs: confirm("Add a `wp-content/docs` directory with a `TODO.md` file?", {
        hint: "Creates wp-content/docs/TODO.md for project-specific development notes.",
      }),
    },
  };
}
