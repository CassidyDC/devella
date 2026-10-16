import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const exec = promisify(execFile);
const entry = new URL("../../src/js/init.js", import.meta.url);

test("help advertises the existing executable, install command, and aliases", async () => {
  const { stdout } = await exec(process.execPath, [fileURLToPath(entry), "--help"]);
  assert.match(stdout, /ddev-wp/);
  assert.match(stdout, /install/);
  for (const flag of ["--help", "--version", "--debug", "-nc", "-nh"]) assert.ok(stdout.includes(flag));
});
