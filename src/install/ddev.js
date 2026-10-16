import { readFile, writeFile } from "node:fs/promises";
import { isMap, isSeq, parseDocument } from "yaml";
import { assertProjectPath } from "../system/paths.js";
import { readOptionalFile } from "./filesystem.js";
import { phpString } from "./templates/bootstrap.js";

const shellQuote = (value) =>
  `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("$", "\\$").replaceAll("`", "\\`")}"`;

export function wordpressConstants({ wordpress: wp }) {
  return {
    WP_CONTENT_DIR: `__DIR__ . '/wp-content'`,
    WP_CONTENT_URL: `getenv('DDEV_PRIMARY_URL') . '/wp-content'`,
    WP_DEBUG: String(wp.debug),
    WP_DEBUG_DISPLAY: String(wp.debug && !wp.debugDisplayHidden),
    WP_DEBUG_LOG: wp.debugLog ? `__DIR__ . ${phpString(`/${wp.debugLogPath}`)}` : "false",
    SCRIPT_DEBUG: String(wp.debugScript),
    WP_DEVELOPMENT_MODE: phpString(wp.wpDevMode),
    WP_ENVIRONMENT_TYPE: phpString(wp.wpEnvType),
  };
}

/** Update owned YAML fields while keeping unrelated nodes, hooks, and comments. */
export function updateDdevConfig(content, settings) {
  const document = parseDocument(content);
  if (document.errors.length || !isMap(document.contents))
    throw new Error(".ddev/config.yaml must contain a valid YAML mapping.");
  const name = document.get("name");
  if (name !== undefined && name !== settings.ddev.projectName)
    throw new Error("Existing DDEV project name differs from the wizard settings. Align the names before installing.");
  const type = document.get("type");
  if (type !== undefined && type !== "wordpress")
    throw new Error("Existing DDEV project is not configured for WordPress.");
  const docroot = document.get("docroot");
  if (docroot !== undefined && docroot !== "" && docroot !== ".")
    throw new Error("DDEV docroot must be the project root for this WordPress layout.");
  if (name === undefined) document.set("name", settings.ddev.projectName);
  if (type === undefined) document.set("type", "wordpress");
  const constants = wordpressConstants(settings);
  let hooks = document.get("hooks", true);
  if (!hooks) {
    document.set("hooks", document.createNode({}));
    hooks = document.get("hooks", true);
  }
  if (!isMap(hooks)) throw new Error("DDEV hooks must be a YAML mapping.");
  let postStart = hooks.get("post-start", true);
  if (!postStart) {
    hooks.set("post-start", document.createNode([]));
    postStart = hooks.get("post-start", true);
  }
  if (!isSeq(postStart)) throw new Error("DDEV post-start hooks must be a YAML sequence.");
  postStart.items = postStart.items.filter((node) => {
    const command = isMap(node) ? node.get("exec") : null;
    const key = typeof command === "string" ? command.match(/^wp config set ([A-Z_]+)\s/)?.[1] : null;
    return !key || !Object.hasOwn(constants, key);
  });
  for (const [key, value] of Object.entries(constants))
    postStart.add(document.createNode({ exec: `wp config set ${key} ${shellQuote(value)} --raw` }));
  let uploads = document.get("upload_dirs", true);
  if (!uploads) {
    document.set("upload_dirs", document.createNode([]));
    uploads = document.get("upload_dirs", true);
  }
  if (!isSeq(uploads) || uploads.toJSON().some((item) => typeof item !== "string"))
    throw new Error("DDEV upload_dirs must be a list of paths.");
  const required = ["wp-content/uploads", ...(settings.plugin.ai1wm ? ["wp-content/ai1wm-backups"] : [])];
  const existing = new Set(uploads.toJSON());
  for (const directory of required) if (!existing.has(directory)) uploads.add(directory);
  document.set("use_dns_when_possible", !settings.ddev.localhost);
  const result = document.toString({ lineWidth: 0 });
  return content.includes("\r\n") ? result.replaceAll("\n", "\r\n") : result;
}

export async function setupDdev({ rootDir, settings, runCommand, reporter, facts }) {
  reporter.heading("Configuring DDEV");
  const filename = await assertProjectPath(rootDir, ".ddev/config.yaml");
  if ((await readOptionalFile(filename)) === null) {
    // A deleted configuration can leave a registered project behind.
    if (facts?.registeredProject) {
      await runCommand("ddev", ["stop", settings.ddev.projectName], { cwd: rootDir });
    }
    await runCommand("ddev", ["config", "--project-type=wordpress", `--project-name=${settings.ddev.projectName}`], {
      cwd: rootDir,
    });
  }
  const content = await readFile(filename, "utf8");
  const updated = updateDdevConfig(content, settings);
  if (content !== updated) await writeFile(filename, updated);
  await runCommand("ddev", ["start"], { cwd: rootDir });
}
