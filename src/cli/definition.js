/**
 * CLI Definition
 *
 * @file Available CLI commands, aliases, flags, and help descriptions.
 */

export const commands = {
  install: { alias: "i", description: "Run the WordPress installation wizard" },
};

export const flags = {
  debug: { alias: "d", description: "Display CLI diagnostic information" },
  help: { alias: "h", description: "Display commands, flags, and examples" },
  "no-clear": { alias: "nc", description: "Keep existing terminal output" },
  "no-header": { alias: "nh", description: "Skip the CLI header" },
  version: { alias: "v", description: "Display the version without the header" },
};
