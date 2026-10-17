/**
 * WordPress Templates
 * @file Render the WordPress entry point, WP-CLI configuration, and escaped PHP literals.
 */

import { stringify } from "yaml";
import { phpString } from "./helpers.js";

/**
 * Render the root bootstrap that loads WordPress from its configured directory.
 *
 * @param {string} coreDir Project-relative WordPress core directory.
 * @returns {string} PHP source for the project's root `index.php`.
 */
export function renderIndex(coreDir) {
  return `<?php\n\nrequire_once __DIR__ . ${phpString(`/${coreDir}/index.php`)};\n`;
}

/**
 * Render the WP-CLI configuration pointing to the WordPress core directory.
 *
 * @param {string} coreDir Project-relative WordPress core directory.
 * @returns {string} YAML contents for `wp-cli.yml`.
 */
export function renderWpCli(coreDir) {
  return stringify({ path: coreDir });
}
