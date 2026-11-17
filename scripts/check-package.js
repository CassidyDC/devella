/**
 * Package Validation
 * @file Validate the packed npm artifact and its executable contents.
 */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), "devella package-"));
const npmCli = process.env.npm_execpath;

assert.ok(npmCli, "Run this check with npm run test:package.");

/**
 * Run the active npm CLI with the given arguments in a working directory.
 *
 * @param {string[]} args Arguments to pass to npm.
 * @param {string} cwd Directory in which npm should run.
 * @returns {Promise<{stdout: string, stderr: string}>} Captured npm output.
 */
const npm = (args, cwd) => exec(process.execPath, [npmCli, ...args], { cwd });

try {
  const { stdout } = await npm(["pack", "--json", "--ignore-scripts", "--pack-destination", temporary], root);
  const result = JSON.parse(stdout);
  // npm 12 keys pack results by package name; earlier npm versions return an array.
  const packed = Array.isArray(result) ? result[0] : Object.values(result)[0];
  const published = new Set(packed.files.map(({ path: filename }) => filename));

  for (const filename of [
    "package.json",
    "bin/devella.js",
    "src/cli/run.js",
    "src/install/run.js",
    "src/install/templates/wordpress.js",
  ])
    assert.ok(published.has(filename), `Missing published file: ${filename}`);

  assert.ok(![...published].some((filename) => /^(tests|docs|src\/js)\//.test(filename)));
  const consumer = path.join(temporary, "consumer project");

  await mkdir(consumer);
  await writeFile(
    path.join(consumer, "package.json"),
    JSON.stringify({ name: "devella-package-check", private: true }),
  );

  await npm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--fetch-retries=0",
      "--fetch-timeout=15000",
      path.join(temporary, packed.filename),
    ],
    consumer,
  );

  const installed = path.join(consumer, "node_modules", "devella");
  const pkg = JSON.parse(await readFile(path.join(installed, "package.json"), "utf8"));
  const bin = path.join(consumer, "node_modules", ".bin", "devella");
  const version = await exec(bin, ["--version"], { cwd: consumer });

  assert.equal(version.stdout, `v${pkg.version}\n`);
  const help = await exec(bin, ["-h", "-nh", "-nc"], { cwd: consumer });

  assert.match(help.stdout, /devella <command>/);
  assert.ok(!help.stdout.includes("┌"));
  const entry = pathToFileURL(path.join(installed, pkg.main)).href;

  const imported = await exec(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(entry)})`, "install"],
    { cwd: consumer },
  );

  assert.equal(imported.stdout, "");
  assert.equal(imported.stderr, "");
  // Check every shipped module resolves using only the installed runtime dependencies.
  const modules = [...published].filter((filename) => filename.startsWith("src/") && filename.endsWith(".js"));
  const imports = modules
    .map((filename) => `await import(${JSON.stringify(pathToFileURL(path.join(installed, filename)).href)});`)
    .join("\n");
  const allModules = await exec(process.execPath, ["--input-type=module", "-e", imports], { cwd: consumer });

  assert.equal(allModules.stdout, "");
  assert.equal(allModules.stderr, "");
  console.log(`Packed CLI passed: ${modules.length} modules, installed executable, help, version, and import safety.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
