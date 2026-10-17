/**
 * PHP Source Helpers
 * @file Provide shared PHP string encoding for generated installation files.
 */

/**
 * Encode a value as a PHP single-quoted string literal, escaping backslashes and apostrophes.
 * PHP single-quoted strings require these characters to be escaped so generated source preserves the value.
 *
 * @param {*} value Value converted to a string before PHP escaping.
 * @returns {string} PHP single-quoted string literal with backslashes and apostrophes escaped.
 */
export function phpString(value) {
  return `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}
