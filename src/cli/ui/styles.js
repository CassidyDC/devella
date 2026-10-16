/**
 * Terminal Styles
 * @file Create ANSI color helpers for enabled or plain terminal output.
 */

import colors from "ansi-colors";

/**
 * Create ANSI color helpers with output enabled or disabled.
 *
 * @param {boolean} enabled Whether style methods should emit ANSI codes.
 * @returns {object} Configured ANSI color styling functions.
 */
export function createStyles(enabled) {
  const c = colors.create();
  c.enabled = enabled;
  return c;
}
