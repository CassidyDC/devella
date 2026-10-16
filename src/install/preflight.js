import { constants } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { parseDocument, isMap } from "yaml";
import { assertProjectPath, projectRelativePath } from "../system/paths.js";
import { configFilename } from "../config/store.js";
import { projectDirectories, projectFiles, readOptionalFile } from "./filesystem.js";
import { renderIndex } from "./templates/bootstrap.js";
import { updateDdevConfig } from "./ddev.js";
import { readComposer } from "./composer.js";

/** Inspect project paths and existing bootstrap files without changing them. */
export async function inspectProject(context) {
  const { rootDir, settings } = context;
  const root = await stat(rootDir);
  if (!root.isDirectory()) throw new Error("The project path must be a directory.");
  await access(rootDir, constants.R_OK | constants.W_OK | constants.X_OK);
  const directories = projectDirectories(context);
  const fileNames = [
    ...Object.keys(projectFiles(context)),
    configFilename,
    "composer.json",
    ".ddev/config.yaml",
    "wp-config.php",
    "wp-config-ddev.php",
  ];
  for (const relative of [...directories, ...fileNames]) {
    const filename = await assertProjectPath(rootDir, relative);
    try {
      const entry = await stat(filename);
      if (directories.includes(relative) ? !entry.isDirectory() : !entry.isFile())
        throw new Error(`Existing ${relative} has the wrong file type.`);
      await access(filename, constants.R_OK | constants.W_OK);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const composerText = await readOptionalFile(await assertProjectPath(rootDir, "composer.json"));
  const composer = composerText === null ? null : readComposer(composerText);
  const installDir = composer?.extra?.["wordpress-install-dir"];
  if (
    composer?.config?.["allow-plugins"] === false ||
    composer?.config?.["allow-plugins"]?.["roots/wordpress-core-installer"] === false
  ) {
    throw new Error("Composer explicitly disables roots/wordpress-core-installer. Allow it before installing.");
  }
  if (installDir !== undefined && projectRelativePath(installDir) !== settings.wordpress.coreDir) {
    throw new Error(
      "composer.json points to a different WordPress core directory. Align it with the wizard settings before installing.",
    );
  }
  const wpCliText = await readOptionalFile(await assertProjectPath(rootDir, "wp-cli.yml"));
  if (wpCliText !== null) {
    const document = parseDocument(wpCliText);
    if (document.errors.length || !isMap(document.contents))
      throw new Error("wp-cli.yml must contain a valid YAML mapping.");
    const core = document.get("path");
    if (typeof core !== "string" || projectRelativePath(core) !== settings.wordpress.coreDir) {
      throw new Error(
        "wp-cli.yml points to a different WordPress core directory. Align it with the wizard settings before installing.",
      );
    }
  }
  const index = await readOptionalFile(await assertProjectPath(rootDir, "index.php"));
  if (index !== null) {
    const expected = renderIndex(settings.wordpress.coreDir);
    // Recognize the old generated bootstrap too. Custom bootstraps require manual alignment.
    const legacy = `require_once __DIR__ . '/${settings.wordpress.coreDir}/index.php';`;
    if (index.trim() !== expected.trim() && !index.trim().endsWith(legacy)) {
      throw new Error(
        "Existing index.php is not a compatible WordPress bootstrap. Review it and align it with the selected core directory before installing.",
      );
    }
  }
  return { composer };
}

export async function preflight(context) {
  const facts = await inspectProject(context);
  const { rootDir, runCommand, reporter } = context;
  reporter.heading("Checking Installation Requirements");
  for (const command of ["ddev", "composer", "docker"]) {
    await runCommand(command, ["--version"], { cwd: rootDir, output: "capture" });
  }
  try {
    await runCommand("docker", ["info"], { cwd: rootDir, output: "capture" });
  } catch (error) {
    throw new Error("Docker is unavailable. Start your Docker provider, then rerun the installer.", { cause: error });
  }
  const { stdout } = await runCommand("ddev", ["list", "--json-output"], { cwd: rootDir, output: "capture" });
  let projects;
  try {
    projects = JSON.parse(stdout).raw;
  } catch (error) {
    throw new Error("Could not read the registered DDEV projects. Resolve the DDEV list error before retrying.", {
      cause: error,
    });
  }
  if (!Array.isArray(projects)) throw new Error("DDEV list did not return a project list.");
  const registered = projects.find((project) => project?.name === context.settings.ddev.projectName);
  if (registered) {
    if (typeof registered.approot !== "string" || (await realpath(registered.approot)) !== (await realpath(rootDir))) {
      throw new Error(
        "This DDEV project name is registered to a different directory. Choose another name before installing.",
      );
    }
  }
  const config = await readOptionalFile(await assertProjectPath(rootDir, ".ddev/config.yaml"));
  if (config !== null) {
    // Validate before Composer or filesystem writes; the DDEV stage performs the same validation.
    updateDdevConfig(config, context.settings);
  }
  return { ...facts, registeredProject: !!registered };
}
