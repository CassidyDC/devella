/**
 * Composer Setup
 *
 * @file Prepare project Composer settings and dependencies for WordPress.
 */

import { writeFile } from "node:fs/promises";
import { assertProjectPath } from "../system/paths.js";
import { readOptionalFile } from "./filesystem.js";
import { renderComposer } from "./templates/composer.js";

/**
 * Parse Composer JSON and validate the object fields managed by the installer.
 *
 * @param {string} text Existing `composer.json` contents.
 * @returns {object} Parsed manifest with object-shaped managed sections.
 * @throws {Error} If the JSON or a managed section has an invalid type.
 */
export function readComposer(text) {
  let composer;

  try {
    composer = JSON.parse(text);
  } catch {
    throw new Error("composer.json contains invalid JSON. Fix it before installing.");
  }

  if (!composer || typeof composer !== "object" || Array.isArray(composer))
    throw new Error("composer.json must contain an object.");

  for (const key of ["extra", "require", "require-dev", "config"]) {
    if (
      composer[key] !== undefined &&
      (!composer[key] || typeof composer[key] !== "object" || Array.isArray(composer[key]))
    ) {
      throw new Error(`composer.json ${key} must be an object.`);
    }
  }

  const plugins = composer.config?.["allow-plugins"];

  if (
    plugins !== undefined &&
    plugins !== true &&
    plugins !== false &&
    (!plugins || typeof plugins !== "object" || Array.isArray(plugins))
  ) {
    throw new Error("composer.json config.allow-plugins must be an object or boolean.");
  }

  return composer;
}

/**
 * Merge required WordPress Composer settings and install project dependencies.
 *
 * @param {import("./run.js").InstallContext} context Project root, normalized settings, runner, and reporter.
 * @returns {Promise<void>} Resolves when Composer has installed WordPress dependencies.
 * @throws {Error} If the manifest is invalid or Composer exits unsuccessfully.
 */
export async function prepareComposer({ rootDir, settings, runCommand, reporter }) {
  reporter.heading("Preparing Composer and WordPress Core Files");
  const filename = await assertProjectPath(rootDir, "composer.json");
  const previous = await readOptionalFile(filename);
  const composer = readComposer(previous ?? renderComposer(settings.wordpress.coreDir));

  composer.extra = { ...composer.extra, "wordpress-install-dir": settings.wordpress.coreDir };
  const plugins = composer.config?.["allow-plugins"];

  if (plugins === false)
    throw new Error(
      "Composer plugins are explicitly disabled. Allow roots/wordpress-core-installer before installing.",
    );

  composer.config = {
    ...composer.config,
    "allow-plugins": plugins === true ? true : { ...plugins, "roots/wordpress-core-installer": true },
  };

  const content = JSON.stringify(composer, null, 2) + "\n";

  if (content !== previous) await writeFile(filename, content);

  if (composer.require?.["roots/wordpress"] || composer["require-dev"]?.["roots/wordpress"]) {
    await runCommand("composer", ["install", "--no-interaction"], { cwd: rootDir });
  } else {
    await runCommand("composer", ["require", "--dev", "--no-interaction", "roots/wordpress"], { cwd: rootDir });
  }
}
