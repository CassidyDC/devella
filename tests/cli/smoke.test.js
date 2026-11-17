/**
 * CLI Smoke Tests
 * @file Exercise the executable through help, version, error, and import flows.
 */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const exec = promisify(execFile);
const entry = new URL("../../bin/devella.js", import.meta.url);

test("help advertises the existing executable, install command, and aliases", async () => {
  const { stdout } = await exec(process.execPath, [fileURLToPath(entry), "--help"]);
  assert.match(stdout, /devella/);
  assert.match(stdout, /install/);
  for (const flag of ["--help", "--version", "--debug", "-nc", "-nh"]) assert.ok(stdout.includes(flag));
});

test("the executable prints only its version and returns failure for unknown commands", async () => {
  const { stdout } = await exec(process.execPath, [fileURLToPath(entry), "--version"]);

  assert.match(stdout, /^v\d+\.\d+\.\d+\n$/);
  await assert.rejects(exec(process.execPath, [fileURLToPath(entry), "unknown"]), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /Unknown command/);
    return true;
  });
});

test("importing the CLI with install in argv has no side effects", async () => {
  const moduleUrl = new URL("../../src/cli/run.js", import.meta.url).href;

  const { stdout, stderr } = await exec(process.execPath, [
    "--input-type=module",
    "-e",
    `await import(${JSON.stringify(moduleUrl)})`,
    "install",
  ]);

  assert.equal(stdout, "");
  assert.equal(stderr, "");
});
