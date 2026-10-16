import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { assertProjectPath } from "../system/paths.js";
import { renderIndex, renderWpCli } from "./templates/bootstrap.js";
import { rayDockerfile, rayIni, renderRay } from "./templates/ray.js";

/**
 * Build the map of generated project file paths and contents.
 *
 * @param {import("./run.js").InstallContext} context Project root and normalized settings.
 * @returns {Record<string, string>} Relative file paths mapped to their initial contents.
 */
export function projectFiles({ rootDir, settings }) {
  const files = {
    "index.php": renderIndex(settings.wordpress.coreDir),
    "wp-cli.yml": renderWpCli(settings.wordpress.coreDir),
  };

  if (settings.ddev.spatieRay)
    Object.assign(files, {
      ".ddev/web-build/Dockerfile": rayDockerfile,
      ".ddev/php/php-ray.ini": rayIni,
      "ray.php": renderRay(rootDir),
    });

  if (settings.devConfig.docs) files["wp-content/docs/TODO.md"] = "# TODO\n";

  return files;
}

/**
 * List directories that must exist for the selected project settings.
 *
 * @param {import("./run.js").InstallContext} context Normalized WordPress, theme, and plugin settings.
 * @returns {string[]} Project-relative directories to create recursively.
 */
export function projectDirectories({ settings }) {
  const directories = [settings.wordpress.coreDir, "wp-content/plugins", "wp-content/themes"];

  if (settings.plugin.custom) directories.push(`wp-content/plugins/${settings.plugin.customSlug}`);

  if (settings.theme.custom) directories.push(`wp-content/themes/${settings.theme.customSlug}`);

  if (settings.wordpress.debugLog && path.posix.dirname(settings.wordpress.debugLogPath) !== ".") {
    directories.push(path.posix.dirname(settings.wordpress.debugLogPath));
  }

  if (settings.devConfig.docs) directories.push("wp-content/docs");

  return directories;
}

/**
 * Read a file as UTF-8, returning null when it is absent.
 *
 * @param {string} filename Absolute file path to read.
 * @returns {Promise<string|null>} File contents, or null when the path does not exist.
 */
export async function readOptionalFile(filename) {
  try {
    return await readFile(filename, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Create required project directories and files without overwriting existing files.
 *
 * @param {import("./run.js").InstallContext} context Project root, settings, and reporter.
 * @returns {Promise<void>} Resolves after all missing directories and files are prepared.
 * @throws {Error} If a path is unsafe or a filesystem operation fails.
 */
export async function prepareFilesystem(context) {
  const { rootDir, reporter } = context;

  reporter.heading("Preparing Project Files");

  for (const relative of projectDirectories(context)) {
    await mkdir(await assertProjectPath(rootDir, relative), { recursive: true });
  }

  for (const [relative, content] of Object.entries(projectFiles(context))) {
    const filename = await assertProjectPath(rootDir, relative);

    await mkdir(path.dirname(filename), { recursive: true });

    try {
      await writeFile(filename, content, { flag: "wx" });
      reporter.success(`Created ${relative}.`);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      reporter.dim(`Preserved existing ${relative}.`);
    }
  }
}
