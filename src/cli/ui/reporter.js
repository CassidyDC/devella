import stringWidth from "string-width";
import { createStyles } from "./styles.js";
import { commands, flags } from "../definition.js";

/**
 * Create terminal output methods with color detection and injectable streams.
 *
 * @param {{stdout?: NodeJS.WritableStream, stderr?: NodeJS.WritableStream, env?: NodeJS.ProcessEnv}} [options={}] Output streams and environment used for color detection.
 * @returns {object} Reporter methods for messages, headings, terminal control, and help output.
 */
export function createReporter({ stdout = process.stdout, stderr = process.stderr, env = process.env } = {}) {
  const colorEnabled = env.FORCE_COLOR === "0" ? false : env.FORCE_COLOR != null || (!env.NO_COLOR && !!stdout.isTTY);
  const c = createStyles(colorEnabled);

  /**
   * Write one line to standard output.
   *
   * @param {string} [value=""] Text to write before the newline.
   * @returns {boolean} Whether the stream accepted the write immediately.
   */
  const line = (value = "") => stdout.write(`${value}\n`);

  return {
    /**
     * Write plain informational output.
     *
     * @param {string} message Text to display.
     * @returns {boolean} Whether standard output accepted the write immediately.
     */
    info: line,

    /**
     * Write a green success message.
     *
     * @param {string} message Success text to display.
     * @returns {boolean} Whether standard output accepted the write immediately.
     */
    success: (message) => line(c.green(message)),

    /**
     * Write a yellow warning message.
     *
     * @param {string} message Warning text to display.
     * @returns {boolean} Whether standard output accepted the write immediately.
     */
    warn: (message) => line(c.yellow(message)),

    /**
     * Write dim gray informational output.
     *
     * @param {string} message Text to display with muted styling.
     * @returns {boolean} Whether standard output accepted the write immediately.
     */
    dim: (message) => line(c.gray.dim(message)),

    /**
     * Write a red error message to standard error.
     *
     * @param {string} message Error text to display.
     * @returns {boolean} Whether standard error accepted the write immediately.
     */
    error: (message) => stderr.write(`${c.red(message)}\n`),

    /**
     * Write a highlighted section heading.
     *
     * @param {string} message Heading text.
     * @returns {boolean} Whether standard output accepted the write immediately.
     */
    heading: (message) => line(`\n${c.bgBlue.bold(` ${message} `)}\n`),

    /**
     * Clear the screen when standard output is a terminal.
     *
     * @returns {void}
     */
    clear: () => {
      if (stdout.isTTY) stdout.write("\u001b[2J\u001b[H");
    },

    /**
     * Render the package name and author header.
     *
     * @param {object} pkg Package metadata containing displayName, version, and author.
     * @returns {void}
     */
    header(pkg) {
      const lines = [`${pkg.displayName} v${pkg.version}`, `By ${pkg.author.name} (${pkg.author.url})`];
      const width = Math.max(...lines.map(stringWidth));
      line(`┌${"─".repeat(width + 2)}┐`);
      line(`│ ${c.bold(lines[0])}${" ".repeat(width - stringWidth(lines[0]))} │`);
      line(`│ ${c.dim(lines[1])}${" ".repeat(width - stringWidth(lines[1]))} │`);
      line(`└${"─".repeat(width + 2)}┘`);
    },

    /**
     * Render command and flag usage information.
     *
     * @param {object} pkg Package metadata containing the CLI description.
     * @returns {void}
     */
    help(pkg) {
      line(`${pkg.description}\n\nUsage:\n  ddev-wp <command> [flags]\n\nCommands:`);

      for (const [name, { alias, description }] of Object.entries(commands))
        line(`  ${alias}, ${name}  ${description}`);

      line("\nFlags:");

      for (const [name, { alias, description }] of Object.entries(flags))
        line(`  -${alias}, --${name}  ${description}`);

      line(
        "\nExamples:\n  ddev-wp install\n  ddev-wp --version\n  npm exec --package=ddev-local-wp-setup -- ddev-wp install\n",
      );
    },

    /**
     * Render CLI diagnostics for the current project directory.
     *
     * @param {object} pkg Package metadata containing the package name.
     * @param {string} rootDir Current project directory.
     * @returns {void}
     */
    debug(pkg, rootDir) {
      line(`CLI: ${pkg.name} v${pkg.version}\nProject directory: ${rootDir}`);
      line(`Commands: ${Object.keys(commands).join(", ")}`);
      line(
        `Flags: ${Object.keys(flags)
          .map((name) => `--${name}`)
          .join(", ")}`,
      );
    },
  };
}
