import {
  generateNamespaceFromName,
  generateProjectNameFromDir,
  generateSlugFromName,
  generateTitleFromSlug,
} from "./names.js";
import {
  validateLogPath,
  validateNamespace,
  validateSlug,
  validateString,
  validateWPAdminEmail,
  validateWPAdminPassword,
  validateWPAdminUsername,
  validateWPCoreDir,
} from "./validation.js";

const input = (message, options = {}) => ({ type: "input", message, ...options });
const confirm = (message, options = {}) => ({ type: "confirm", message, initial: true, ...options });
const select = (message, choices) => ({ type: "select", message, choices, initial: choices[0] });

/** Plain field metadata. No environment reads, prompt library, or terminal styling. */
export function createSettingsSchema(rootDir) {
  const customFields = (kind) => ({
    custom: confirm(`Create a new custom ${kind} directory?`, {
      initial: false,
      enabled: ({ wordpress }) => [kind === "theme" ? "Theme" : "Plugin", "Both"].includes(wordpress.projectType),
    }),
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
      enabled: (settings) => settings[kind].custom,
    }),
  });
  return {
    ddev: {
      projectName: input("DDEV project name:", {
        initial: generateSlugFromName(generateProjectNameFromDir(rootDir)),
        validate: validateSlug,
      }),
      localhost: confirm("Use localhost to resolve your DDEV domain?", {
        hint: "Using localhost may require permission to update your hosts file.",
      }),
      spatieRay: confirm("Add Spatie Ray connection files for DDEV?"),
    },
    wordpress: {
      adminUsername: input("WP Admin Username:", { validate: validateWPAdminUsername }),
      adminPassword: {
        type: "password",
        message: "WP Admin Password:",
        secret: true,
        validate: validateWPAdminPassword,
      },
      adminEmail: input("WP Admin Email:", { validate: validateWPAdminEmail }),
      siteTitle: input("Site Title:", {
        initial: ({ ddev }) => generateTitleFromSlug(ddev.projectName),
        validate: validateString,
      }),
      siteTagline: input("Site Tagline:", { initial: "", hint: "Leave blank if no tagline is desired." }),
      coreDir: input("WordPress Core Directory:", {
        initial: "/wordpress",
        validate: validateWPCoreDir,
        hint: "wp-content stays outside the core directory.",
      }),
      cleanState: confirm("Remove default content when installing a new WordPress site?"),
      postnamePermalinks: confirm("Use /%postname% for WordPress permalinks?"),
      homepage: confirm("Add a non-blog homepage if no static front page is configured?"),
      debug: confirm("Enable WordPress debugging?"),
      debugScript: confirm("Enable script debugging?", { enabled: ({ wordpress }) => wordpress.debug }),
      debugDisplayHidden: confirm("Hide the frontend debugging display?", {
        enabled: ({ wordpress }) => wordpress.debug,
      }),
      debugLog: confirm("Enable debug logging?", { enabled: ({ wordpress }) => wordpress.debug }),
      debugLogPath: input("Debug Log Path:", {
        initial: "/wp-content/logs/wp-errors.log",
        validate: validateLogPath,
        enabled: ({ wordpress }) => wordpress.debug && wordpress.debugLog,
      }),
      projectType: select("What are you developing?", ["Theme", "Plugin", "Both"]),
      wpDevMode: select("Set WP_DEVELOPMENT_MODE:", ["Theme", "Plugin", "Core", "All"]),
      wpEnvType: select("Set WP_ENVIRONMENT_TYPE:", ["Local", "Development", "Staging", "Production"]),
    },
    plugin: { ...customFields("plugin"), ai1wm: confirm("Install the All-in-One WP Migration plugin?") },
    theme: { ...customFields("theme"), defaultTheme: confirm("Include the default WordPress theme as a fallback?") },
    devConfig: { docs: confirm("Add wp-content/docs/dev and wp-content/docs/reference directories?") },
  };
}
