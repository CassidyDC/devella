/**
 * Composer Template
 *
 * @file Render the initial Composer manifest for a WordPress project.
 */

/**
 * Render the initial Composer manifest for the WordPress project.
 *
 * @param {string} coreDir Project-relative WordPress installation directory.
 * @returns {string} Pretty-printed Composer JSON ending in a newline.
 */
export function renderComposer(coreDir) {
  return (
    JSON.stringify(
      {
        name: "cassidydc/ddev-local-wp-setup",
        description: "Local WordPress development server with DDEV.",
        license: "MIT",
        require: { php: ">=8.4" },
        extra: { "wordpress-install-dir": coreDir },
      },
      null,
      2,
    ) + "\n"
  );
}
