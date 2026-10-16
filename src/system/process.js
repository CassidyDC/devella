import { spawn } from "node:child_process";

export class CommandError extends Error {
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
 * @param {string} command Executable name; never interpreted by a shell.
 * @param {string[]} args Separate arguments, including any values with spaces.
 * @param {{cwd: string, output?: "stream"|"capture"|"silent", allowFailure?: boolean,
 * stdout?: NodeJS.WritableStream, stderr?: NodeJS.WritableStream}} options
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number|null, signal: string|null}>}
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
