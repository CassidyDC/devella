import { readFile } from "node:fs/promises";
import { parseArguments } from "./arguments.js";
import { createReporter } from "./ui/reporter.js";
import { CancelledError } from "./wizard.js";

/**
 * Run the CLI action and translate user cancellation or failures into exit codes.
 * Importing this module never parses arguments or starts installation.
 *
 * @param {string[]} argv Arguments following the executable name.
 * @param {object} [dependencies={}] Injectable runtime dependencies for the CLI.
 * @returns {Promise<number>} Process status code for the requested action.
 */
export async function runCli(argv, dependencies = {}) {
  const rootDir = dependencies.rootDir ?? process.cwd();
  const reporter = dependencies.reporter ?? createReporter(dependencies);

  try {
    const args = parseArguments(argv);

    if (args.errors.length) {
      for (const error of args.errors) reporter.error(error);
      return 1;
    }

    const pkg = dependencies.pkg ?? JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));

    const action = args.flags.has("help")
      ? "help"
      : args.flags.has("version")
        ? "version"
        : args.flags.has("debug")
          ? "debug"
          : (args.command ?? "help");

    if (action !== "version") {
      if (!args.flags.has("no-clear")) reporter.clear();
      if (!args.flags.has("no-header")) reporter.header(pkg);
    }

    if (action === "help") reporter.help(pkg);
    else if (action === "version") reporter.info(`v${pkg.version}`);
    else if (action === "debug") reporter.debug(pkg, rootDir);
    else {
      const install =
        dependencies.install ?? (await import(new URL("../install/run.js", import.meta.url))).runInstaller;
      await install({ ...dependencies, rootDir, reporter });
    }

    return 0;
  } catch (error) {
    if (error instanceof CancelledError) {
      reporter.info(error.message);
      return error.exitCode;
    }

    if (error?.signal === "SIGINT") {
      reporter.info("Installation cancelled.");
      return 130;
    }

    reporter.error(error instanceof Error ? error.message : "Installation failed.");

    return 1;
  }
}
