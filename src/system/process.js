import { spawn } from "node:child_process";

/**
 * @typedef {object} CommandResult Captured subprocess result.
 * @property {string} stdout Text written to standard output.
 * @property {string} stderr Text written to standard error.
 * @property {number|null} exitCode Numeric exit code, or null when the process was signaled.
 * @property {string|null} signal Signal that interrupted the process, if any.
 */

/**
 * @typedef {object} CommandOptions Subprocess behavior and output routing.
 * @property {string} cwd Working directory required for process execution.
 * @property {"stream"|"capture"|"silent"} [output="stream"] Whether output is forwarded, captured, or discarded.
 * @property {boolean} [allowFailure=false] Resolve nonzero exits instead of rejecting.
 * @property {NodeJS.WritableStream} [stdout=process.stdout] Destination for streamed standard output.
 * @property {NodeJS.WritableStream} [stderr=process.stderr] Destination for streamed standard error.
 */

/**
 * Represent a subprocess launch failure, interruption, or nonzero exit.
 *
 * @extends Error
 */
export class CommandError extends Error {
  /**
   * Create a command error and retain captured subprocess details.
   *
   * @param {string} command Executable name that was run.
   * @param {CommandResult} result Captured output, exit code, and signal.
   * @param {Error} [cause] Underlying process launch error, if spawning failed.
   */
  constructor(command, result, cause) {
    const detail =
      cause?.code === "ENOENT"
        ? "is not installed or is not on PATH"
        : result.signal
          ? `was interrupted by ${result.signal}`
          : `exited with code ${result.exitCode}`;
    super(`${command} ${detail}.`, { cause });
    this.name = "CommandError";
    Object.assign(this, result);
  }
}

/**
 * Execute a dependency operation without a shell and reject spawn or exit failures.
 *
 * @param {string} command Executable name; it is never interpreted by a shell.
 * @param {string[]} args Separate arguments passed to the executable, including values with spaces.
 * @param {CommandOptions} [options={}] Working directory, output routing, and exit handling.
 * @returns {Promise<CommandResult>} Captured output and process completion status.
 * @throws {CommandError} If the process cannot start, is interrupted, or exits unsuccessfully.
 */
export function runCommand(
  command,
  args,
  {
    cwd,
    output = "stream",
    allowFailure = false,
    stdout: outputStream = process.stdout,
    stderr: errorStream = process.stderr,
  } = {},
) {
  if (!cwd) throw new Error("Subprocess working directory is required.");
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ["inherit", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      if (output !== "silent") stdout += chunk;
      if (output === "stream") outputStream.write(chunk);
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      if (output !== "silent") stderr += chunk;
      if (output === "stream") errorStream.write(chunk);
    });
    child.once("error", (cause) =>
      reject(new CommandError(command, { stdout, stderr, exitCode: null, signal: null }, cause)),
    );
    child.once("close", (exitCode, signal) => {
      const result = { stdout, stderr, exitCode, signal };
      if (signal || (exitCode !== 0 && !allowFailure)) reject(new CommandError(command, result));
      else resolve(result);
    });
  });
}
