/**
 * CLI Argument Tests
 *
 * @file Verify CLI argument parsing, dispatch, output flags, and cancellation.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { parseArguments } from "../../src/cli/arguments.js";
import { runCli } from "../../src/cli/run.js";
import { CancelledError } from "../../src/cli/wizard.js";
import { recordingReporter } from "../fixtures/project.js";

const pkg = { name: "test-cli", displayName: "Test CLI", version: "1.0.0" };

test("normalize command aliases and all long and short flags", () => {
  const aliases = { debug: "d", help: "h", version: "v", "no-clear": "nc", "no-header": "nh" };

  for (const [name, alias] of Object.entries(aliases)) {
    for (const flag of [`--${name}`, `-${alias}`]) {
      const args = parseArguments(["i", flag]);
      assert.equal(args.command, "install");
      assert.deepEqual([...args.flags], [name]);
      assert.deepEqual(args.errors, []);
    }
  }
});

test("reject multiple commands, unknown flags, and arguments previously skipped", () => {
  for (const args of [["install", "i"], ["wat"], ["--wat"], ["/some/path"], ["123"], ["-"], ["--help=x"]]) {
    assert.ok(parseArguments(args).errors.length, args.join(" "));
  }
});

test("help, version, and debug take precedence over installation", async () => {
  for (const [argv, expected] of [
    [[], "help"],
    [["install", "--help", "--version"], "help"],
    [["install", "--version", "--debug"], "info"],
    [["install", "--debug"], "debug"],
  ]) {
    const { reporter, events } = recordingReporter();
    const status = await runCli(argv, { pkg, reporter, install: () => assert.fail("Installer must not load") });
    assert.equal(status, 0);
    assert.ok(events.some(([name]) => name === expected));
  }
});

test("suppression flags prevent terminal clearing and header output", async () => {
  for (const argv of [["--help", "--no-header", "--no-clear"], ["-h", "-nh", "-nc"], ["--version"]]) {
    const { reporter, events } = recordingReporter();
    assert.equal(await runCli(argv, { pkg, reporter }), 0);
    assert.ok(!events.some(([name]) => ["header", "clear"].includes(name)));
  }
});

test("invalid input and execution errors return nonzero, cancellation is handled", async () => {
  const { reporter, events } = recordingReporter();

  assert.equal(await runCli(["--bad", "--help"], { pkg, reporter }), 1);
  assert.equal(events[0][0], "error");

  for (const [error, status] of [
    [new Error("DDEV failed"), 1],
    [new CancelledError(), 0],
    [new CancelledError(130), 130],
  ]) {
    assert.equal(
      await runCli(["install"], {
        pkg,
        reporter,
        install: async () => {
          throw error;
        },
      }),
      status,
    );
  }
});
