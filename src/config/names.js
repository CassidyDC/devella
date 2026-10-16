import path from "node:path";

export function generateNamespaceFromName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("");
}

export function generateProjectNameFromDir(rootDir) {
  return generateTitleFromSlug(
    path
      .basename(rootDir)
      .replace(/^[^a-z0-9]+/i, "")
      .replace(/\.ddev\.site$/i, ""),
  );
}

export function generateSlugFromName(name) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "");
}

export function generateTitleFromSlug(slug) {
  return slug
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
