# Architecture

The project uses native JavaScript ESM with no compilation step. The package exposes the `ddev-wp` executable. Its import-safe main module supports internal testing; its functions are not a versioned public library API.

## Module ownership

| Location                   | Responsibility                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `bin/ddev-wp.js`           | Read process arguments and the project directory, await the CLI, and set the process exit code.                           |
| `src/cli`                  | Parse aliases, choose an action, drive the wizard, and render terminal output. Command metadata does not import handlers. |
| `src/config`               | Define fields, validate answers and saved values, normalize execution settings, and persist configuration.                |
| `src/install`              | Run the ordered installation stages and implement project, Composer, DDEV, and WordPress behavior.                        |
| `src/install/templates`    | Render generated files from explicit inputs, with appropriate PHP, JSON, and YAML serialization.                          |
| `src/system`               | Run external processes and resolve project paths, including existing symlink checks.                                      |
| `tests`                    | Exercise contracts with temporary projects, fixture YAML, real harmless subprocesses, and simulated installer commands.   |
| `scripts/check-package.js` | Install an actual package tarball outside the checkout and verify its executable and runtime imports.                     |

Use direct imports. Configuration metadata does not import terminal components or executable handlers. Installation stages receive their state rather than importing a singleton. Informational CLI actions do not load installation handlers or Enquirer.

## Data and control flow

`runCli(argv, dependencies)` parses an explicit argument array, validates it, and returns an exit code. The executable wrapper is the only place that reads `process.argv` and sets `process.exitCode`.

The wizard clones reusable saved settings, validates known enabled fields, and returns new raw settings. Unknown and deferred values remain in this raw representation for persistence. Passwords are always recollected. Enquirer cancellation is translated to `CancelledError`; helpers never terminate the process.

`normalizeSettings` projects raw settings into a fresh execution object containing only enabled, known, valid fields. It converts paths to project-relative paths, normalizes environment/development modes, and resolves debug dependencies. This object is never saved over the original representation.

The installer passes `{ rootDir, settings, runCommand, reporter }` to its stages. Preflight adds registration facts used to recover a project whose DDEV configuration was removed. Stages run sequentially because each requires prior effects; a failure prevents later stages from running.

## External effects

The shared runner requires `cwd`, passes arguments directly to `spawn` with `shell: false`, and provides stream, capture, or silent output. It returns stdout, stderr, exit code, and termination signal. `allowFailure` permits normal nonzero probe results; it never suppresses missing executables or termination signals.

WordPress status probes use DDEV's quiet raw-exec mode to retain WP-CLI diagnostics without DDEV's generic nonzero-exit wrapper. Only a silent exit code 1 means WordPress is not installed; other failures stop setup. Shell commands in DDEV hooks separately quote PHP expressions because those hooks run inside a container shell.

Generated project files use exclusive creation. Configuration saves use a temporary file and rename; restart backups preserve the previous file. Composer and DDEV updates target owned settings while retaining unrelated configuration. These are local safeguards, not an external-operation rollback mechanism.

## Validation

`npm test` runs the Node test suite without Docker. The suite covers parsing and dispatch, cancellation, import safety, settings validation and persistence, path containment, generated content, YAML preservation, subprocess modes, installation ordering, failure propagation, and reruns.

`npm run test:package` verifies the actual npm tarball with runtime dependencies installed in a temporary consumer directory. CI runs tests, strict script linting, Markdown linting, formatting checks, and package checks on Node 22.13 and Node 24.

Live DDEV installation also depends on the host's Docker provider, Composer/PHP platform, DDEV version, and network access. Simulated integration tests do not replace a live smoke install when those tools are available.
