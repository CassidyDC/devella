import path from "node:path";
import { lstat, realpath } from "node:fs/promises";

/** Legacy leading slashes denote paths relative to the project, not the host. */
export function projectRelativePath(value) {
  if (typeof value !== "string" || /[\0\r\n\\]/.test(value) || /^[a-z]:/i.test(value)) {
    throw new Error("Use a project-relative path with forward slashes.");
  }
  const relative = value.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!relative || relative.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Paths must name a location inside the project without traversal segments.");
  }
  return relative;
}

export function resolveProjectPath(rootDir, relative) {
  return path.resolve(rootDir, projectRelativePath(relative));
}

/** Reject existing symlinks that would redirect a project write outside its root. */
export async function assertProjectPath(rootDir, relative) {
  const target = resolveProjectPath(rootDir, relative);
  const root = await realpath(rootDir);
  let ancestor = target;
  while (true) {
    try {
      const resolved = await realpath(ancestor);
      const difference = path.relative(root, resolved);
      if (difference === ".." || difference.startsWith(`..${path.sep}`) || path.isAbsolute(difference)) {
        throw new Error(`Path leaves the project through a symlink: ${relative}`);
      }
      return target;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      try {
        if ((await lstat(ancestor)).isSymbolicLink())
          throw new Error(`Unresolved symlink in project path: ${relative}`, { cause: error });
      } catch (entryError) {
        if (entryError.code !== "ENOENT") throw entryError;
      }
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
    }
  }
}
