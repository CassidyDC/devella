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
  const directoryName = path.basename(rootDir).replace(/\.ddev\.site$/i, "");
  const projectSlug = generateSlugFromName(directoryName).replace(/^-+/, "");

  return generateTitleFromSlug(projectSlug);
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
