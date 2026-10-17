/**
 * Template Helpers
 * @file Shared encoding helpers for generated project templates.
 */

/**
 * Encode a value as a single-quoted PHP string literal.
 *
 * @param {*} value Value to stringify for PHP source.
 * @returns {string} Escaped PHP string literal including quote delimiters.
 */
export function phpString(value) {
  return `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}
