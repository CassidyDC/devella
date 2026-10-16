/** Configure an installed site; destructive defaults cleanup is limited to a new installation. */
export async function setupWordPress({ rootDir, settings, runCommand, reporter }) {
  const wp = (args, options = {}) =>
    runCommand("ddev", ["wp", ...args], { cwd: rootDir, output: "capture", ...options });
  const capture = async (args) => (await wp(args)).stdout.replace(/\r?\n$/, "");
  // Suppress DDEV's generic failure wrapper, retaining WP-CLI diagnostics so an
  // expected status 1 (not installed/not present) cannot mask an infrastructure error.
  const probe = (args) =>
    runCommand(
      "ddev",
      ["exec", "--quiet", "--raw", "--", "wp", `--path=/var/www/html/${settings.wordpress.coreDir}`, ...args],
      { cwd: rootDir, output: "capture", allowFailure: true },
    );
  const updateOption = async (name, value) => {
    if ((await capture(["option", "get", name])) !== value) await wp(["option", "update", name, value]);
  };
  const { wordpress: options } = settings;
  reporter.heading("Setting Up WordPress");
  const installed = await probe(["core", "is-installed"]);
  const freshInstall = installed.exitCode === 1 && !installed.stderr.trim() && !installed.stdout.trim();
  if (installed.exitCode !== 0 && !freshInstall) {
    throw new Error(
      `Could not determine WordPress installation status. Resolve the DDEV or database error before retrying. ${installed.stderr || installed.stdout}`.trim(),
    );
  }
  if (freshInstall) {
    const { stdout } = await runCommand("ddev", ["exec", "printenv", "DDEV_PRIMARY_URL"], {
      cwd: rootDir,
      output: "capture",
    });
    const url = stdout.trim();
    if (!/^https?:\/\/[^\s]+$/.test(url)) throw new Error("DDEV did not provide a valid primary project URL.");
    await wp(
      [
        "core",
        "install",
        `--url=${url}`,
        `--title=${options.siteTitle}`,
        `--admin_user=${options.adminUsername}`,
        `--admin_password=${options.adminPassword}`,
        `--admin_email=${options.adminEmail}`,
      ],
      { output: "stream" },
    );
    if (options.cleanState) {
      reporter.heading("Removing New-Install Defaults");
      const adminId = await capture(["user", "get", options.adminUsername, "--field=ID"]);
      if (!/^\d+$/.test(adminId)) throw new Error("Could not determine the new administrator's user ID.");
      await wp([
        "eval",
        `update_user_meta(${adminId}, 'metaboxhidden_dashboard', array('dashboard_right_now', 'dashboard_activity', 'dashboard_site_health', 'dashboard_quick_press', 'dashboard_primary')); update_user_meta(${adminId}, 'show_welcome_panel', 0);`,
      ]);
      // Only posts created by core installation, never IDs from an existing site.
      for (const id of ["1", "2", "3"]) {
        const exists = await probe(["post", "exists", id]);
        if (exists.exitCode === 0) await wp(["post", "delete", id, "--force"]);
        else if (exists.exitCode !== 1 || exists.stderr.trim() || exists.stdout.trim())
          throw new Error(`Could not inspect default post ${id}. ${exists.stderr}`);
      }
      const plugins = JSON.parse(await capture(["plugin", "list", "--format=json"]));
      for (const plugin of plugins)
        if (["hello", "akismet"].includes(plugin.name)) await wp(["plugin", "delete", plugin.name]);
    }
  } else reporter.dim("WordPress is already installed; preserving content and administrator credentials.");

  await updateOption("blogname", options.siteTitle);
  await updateOption("blogdescription", options.siteTagline);
  if (options.postnamePermalinks && (await capture(["option", "get", "permalink_structure"])) !== "/%postname%") {
    await wp(["rewrite", "structure", "/%postname%"]);
  }
  if (options.homepage) {
    const front = await capture(["option", "get", "show_on_front"]);
    const frontId = front === "page" ? await capture(["option", "get", "page_on_front"]) : "0";
    if (front !== "page" || !/^[1-9]\d*$/.test(frontId)) {
      // Reuse a page left by a partial run instead of creating another one.
      const existing = await capture([
        "post",
        "list",
        "--post_type=page",
        "--post_status=publish",
        "--name=homepage",
        "--field=ID",
      ]);
      let homepageId = existing.trim().split(/\s+/)[0];
      if (!homepageId)
        homepageId = (
          await capture([
            "post",
            "create",
            "--post_type=page",
            "--post_name=homepage",
            "--post_title=Homepage",
            "--post_status=publish",
            "--post_content=<!-- wp:paragraph --><p>This is the homepage.</p><!-- /wp:paragraph -->",
            "--porcelain",
          ])
        ).trim();
      if (!/^[1-9]\d*$/.test(homepageId)) throw new Error("Could not determine the homepage ID.");
      await wp(["option", "update", "page_on_front", homepageId]);
      await wp(["option", "update", "show_on_front", "page"]);
    }
  }
  if (settings.theme.defaultTheme) {
    const slug = (
      await capture([
        "eval",
        'echo array_key_last((new ReflectionClass("WP_Theme"))->getStaticPropertyValue("default_themes"));',
      ])
    ).trim();
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Could not determine the latest official default theme.");
    const themes = JSON.parse(await capture(["theme", "list", "--format=json"]));
    const hasActiveTheme = themes.some((theme) => theme.status === "active");
    if (!themes.some((theme) => theme.name === slug)) {
      await wp(["theme", "install", slug, ...(hasActiveTheme ? [] : ["--activate"])], { output: "stream" });
    } else if (!hasActiveTheme) await wp(["theme", "activate", slug]);
  }
  if (settings.plugin.ai1wm) {
    const plugins = JSON.parse(await capture(["plugin", "list", "--format=json"]));
    const plugin = plugins.find((entry) => entry.name === "all-in-one-wp-migration");
    if (!plugin) await wp(["plugin", "install", "all-in-one-wp-migration", "--activate"], { output: "stream" });
    else if (!["active", "active-network"].includes(plugin.status)) await wp(["plugin", "activate", plugin.name]);
  }
  reporter.info("Opening the WordPress admin dashboard...");
  await runCommand("ddev", ["launch", "wp-admin/"], { cwd: rootDir });
  return { freshInstall };
}
