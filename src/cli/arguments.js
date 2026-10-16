import { commands, flags } from "./definition.js";

/**
 * Parse user arguments, resolving command and flag aliases from the CLI definition.
 * @param {string[]} argv Arguments following the executable name.
 * @returns {{command: string|null, flags: Set<string>, errors: string[]}} Parsed action flags and input errors.
 */
export function parseArguments(argv) {
  const parsed = { command: null, flags: new Set(), errors: [] };
  let commandCount = 0;
  for (const argument of argv) {
    if (argument.startsWith("-")) {
      const match = Object.entries(flags).find(
        ([name, { alias }]) => argument === `--${name}` || argument === `-${alias}`,
      );
      if (match) parsed.flags.add(match[0]);
      else parsed.errors.push(`Unknown flag: ${argument}. Use --help to see available flags.`);
    } else {
      commandCount++;
      const match = Object.entries(commands).find(([name, { alias }]) => argument === name || argument === alias);
      if (match) parsed.command = match[0];
      else parsed.errors.push(`Unknown command: ${argument}. Use --help to see available commands.`);
    }
  }
  if (commandCount > 1) parsed.errors.push("Only one command can be used at a time.");
  return parsed;
}
