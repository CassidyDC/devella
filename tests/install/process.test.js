/**
 * Process Execution Tests
 * @file Verify safe subprocess arguments, output modes, and failure reporting.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { Writable } from "node:stream";
import { runCommand, CommandError } from "../../src/system/process.js";
import { temporaryProject } from "../fixtures/project.js";

test("subprocesses use explicit cwd and preserve arguments containing shell characters", async (t) => {
  const cwd = await temporaryProject(t);
  const argument = "a path with spaces ' $HOME $(whoami)";

  const result = await runCommand(
    process.execPath,
    ["-e", "console.log(JSON.stringify({cwd:process.cwd(),arg:process.argv[1]}))", argument],
    { cwd, output: "capture" },
  );

  const captured = JSON.parse(result.stdout);

  assert.equal(captured.arg, argument);
  // macOS resolves the system temporary directory through /private.
  assert.ok(captured.cwd.endsWith(cwd.replace(/^\/private/, "")) || captured.cwd === cwd);
});

test("capture, stream, and silent modes share exit handling", async () => {
  let streamed = "";

  const sink = new Writable({
    write(chunk, encoding, callback) {
      streamed += chunk;
      callback();
    },
  });

  const args = ["-e", "process.stdout.write('out');process.stderr.write('err');process.exitCode=7"];

  for (const output of ["capture", "stream", "silent"]) {
    const result = await runCommand(process.execPath, args, {
      cwd: process.cwd(),
      output,
      stdout: sink,
      stderr: sink,
      allowFailure: true,
    });

    assert.equal(result.exitCode, 7);
    assert.equal(result.stdout, output === "silent" ? "" : "out");
    assert.equal(result.stderr, output === "silent" ? "" : "err");
  }

  assert.equal(streamed, "outerr");
  await assert.rejects(
    runCommand(process.execPath, args, { cwd: process.cwd(), output: "capture" }),
    (error) => error instanceof CommandError && error.exitCode === 7,
  );
});

test("missing binaries and signals are errors even for allowed unsuccessful probes", async () => {
  await assert.rejects(
    runCommand("devella-nonexistent-executable", [], { cwd: process.cwd(), allowFailure: true }),
    /not installed/,
  );

  await assert.rejects(
    runCommand(process.execPath, ["-e", "process.kill(process.pid, 'SIGTERM')"], {
      cwd: process.cwd(),
      allowFailure: true,
    }),
    (error) => error.signal === "SIGTERM",
  );

  assert.throws(() => runCommand("echo", []), /working directory/);
});
