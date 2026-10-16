#!/usr/bin/env node

import { runCli } from "../src/cli/run.js";

try {
  process.exitCode = await runCli(process.argv.slice(2), { rootDir: process.cwd() });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Installation failed.");
  process.exitCode = 1;
}
