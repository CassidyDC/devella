import { createSettingsSchema } from "./settings.js";
import { validateField } from "./validation.js";
import { projectRelativePath } from "../system/paths.js";

/**
 * @typedef {object} InstallSettings
 * @property {{projectName: string, localhost: boolean, spatieRay: boolean}} ddev
 * @property {{adminUsername: string, adminPassword: string, adminEmail: string,
 * siteTitle: string, siteTagline: string, coreDir: string, cleanState: boolean,
 * postnamePermalinks: boolean, homepage: boolean, debug: boolean, debugScript: boolean,
 * debugDisplayHidden: boolean, debugLog: boolean, debugLogPath: string|null,
 * projectType: string, wpDevMode: string, wpEnvType: string}} wordpress
 * @property {{ai1wm: boolean, custom?: boolean, customName?: string, customSlug?: string, useNamespace?: boolean, customNamespace?: string, customFunctionPrefix?: string}} plugin
 * @property {{defaultTheme: boolean, custom?: boolean, customName?: string, customSlug?: string, useNamespace?: boolean, customNamespace?: string, customFunctionPrefix?: string}} theme
 * @property {{docs: boolean}} devConfig
 */

/** Project only enabled, validated fields into execution state. Never mutate saved input. */
export function normalizeSettings(raw, rootDir) {
  const schema = createSettingsSchema(rootDir);
  const settings = Object.fromEntries(Object.keys(schema).map((section) => [section, {}]));
  for (const [section, fields] of Object.entries(schema)) {
    for (const [name, field] of Object.entries(fields)) {
      if (field.enabled && !field.enabled(settings)) continue;
      const value = raw[section]?.[name];
      const valid = validateField(field, value);
      if (valid !== true) throw new Error(`${section}.${name}: ${valid}`);
      settings[section][name] = typeof value === "string" && !field.secret ? value.trim() : value;
    }
  }
  const wp = settings.wordpress;
  wp.coreDir = projectRelativePath(wp.coreDir);
  wp.debugLog = wp.debug && !!wp.debugLog;
  wp.debugScript = wp.debug && !!wp.debugScript;
  wp.debugDisplayHidden = !wp.debug || !!wp.debugDisplayHidden;
  wp.debugLogPath = wp.debugLog ? projectRelativePath(wp.debugLogPath) : null;
  wp.wpDevMode = wp.wpDevMode.toLowerCase();
  wp.wpEnvType = wp.wpEnvType.toLowerCase();
  return settings;
}
