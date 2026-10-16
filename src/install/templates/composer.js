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
