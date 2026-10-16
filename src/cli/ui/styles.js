import colors from "ansi-colors";

export function createStyles(enabled) {
  const c = colors.create();
  c.enabled = enabled;
  return c;
}
