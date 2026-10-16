import { constants } from "node:fs";
import { copyFile, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { assertProjectPath } from "../system/paths.js";

export const configFilename = "ddev-local-wp-setup-config.json";

export async function readConfigText(rootDir) {
  const filename = await assertProjectPath(rootDir, configFilename);
  try {
    return await readFile(filename, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export function parseConfig(text) {
  let config;
  try {
    config = JSON.parse(text);
  } catch {
    throw new Error(`Cannot read ${configFilename}: invalid JSON. Fix the file or restart the wizard from scratch.`);
  }
  if (!config || typeof config !== "object" || Array.isArray(config))
    throw new Error("Saved configuration must be a JSON object.");
  for (const section of ["ddev", "wordpress", "plugin", "theme", "devConfig"]) {
    if (
      Object.hasOwn(config, section) &&
      (!config[section] || typeof config[section] !== "object" || Array.isArray(config[section]))
    ) {
      throw new Error(`Saved configuration section ${section} must be an object.`);
    }
  }
  return config;
}

/** Save raw wizard settings, retaining deferred keys but never the administrator password. */
export async function saveConfig(rootDir, settings, { restart = false } = {}) {
  const filename = await assertProjectPath(rootDir, configFilename);
  const config = structuredClone(settings);
  if (config.wordpress) delete config.wordpress.adminPassword;
  const previous = await readConfigText(rootDir);
  if (previous !== null && !restart) {
    if (isDeepStrictEqual(parseConfig(previous), config)) return;
  }
  if (previous !== null && restart) {
    const matches = (await readdir(rootDir))
      .map((name) => name.match(/^ddev-local-wp-setup-config(?:_(\d+))?\.bak$/))
      .filter(Boolean);
    const number = Math.max(-1, ...matches.map((match) => Number(match[1] ?? 0))) + 1;
    const backup = await assertProjectPath(
      rootDir,
      `ddev-local-wp-setup-config_${String(number).padStart(3, "0")}.bak`,
    );
    await copyFile(filename, backup, constants.COPYFILE_EXCL);
  }
  const temporary = await assertProjectPath(rootDir, `.ddev-wp-config-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify(config, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    await rename(temporary, filename);
  } finally {
    await rm(temporary, { force: true });
  }
}
