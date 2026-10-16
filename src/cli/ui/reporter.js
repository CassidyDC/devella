import stringWidth from "string-width";
import { createStyles } from "./styles.js";
import { commands, flags } from "../definition.js";

export function createReporter({ stdout = process.stdout, stderr = process.stderr, env = process.env } = {}) {
  const colorEnabled = env.FORCE_COLOR === "0" ? false : env.FORCE_COLOR != null || (!env.NO_COLOR && !!stdout.isTTY);
  const c = createStyles(colorEnabled);
  const line = (value = "") => stdout.write(`${value}\n`);
  return {
    info: line,
    success: (message) => line(c.green(message)),
    warn: (message) => line(c.yellow(message)),
    dim: (message) => line(c.gray.dim(message)),
    error: (message) => stderr.write(`${c.red(message)}\n`),
    heading: (message) => line(`\n${c.bgBlue.bold(` ${message} `)}\n`),
    clear: () => {
      if (stdout.isTTY) stdout.write("\u001b[2J\u001b[H");
    },
    header(pkg) {
      const lines = [`${pkg.displayName} v${pkg.version}`, `By ${pkg.author.name} (${pkg.author.url})`];
      const width = Math.max(...lines.map(stringWidth));
      line(`┌${"─".repeat(width + 2)}┐`);
      line(`│ ${c.bold(lines[0])}${" ".repeat(width - stringWidth(lines[0]))} │`);
      line(`│ ${c.dim(lines[1])}${" ".repeat(width - stringWidth(lines[1]))} │`);
      line(`└${"─".repeat(width + 2)}┘`);
    },
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
