import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { assertProjectPath } from "../system/paths.js";
import { renderIndex, renderWpCli } from "./templates/bootstrap.js";
import { rayDockerfile, rayIni, renderRay } from "./templates/ray.js";

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

export async function readOptionalFile(filename) {
  try {
    return await readFile(filename, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/** Create missing files exclusively; never overwrite a user's existing files. */
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
      reporter.info(`Created ${relative}.`);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      reporter.info(`Preserved existing ${relative}.`);
    }
  }
}
