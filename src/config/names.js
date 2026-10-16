import path from "node:path";

/**
 * Convert a human-readable name to a PascalCase PHP namespace suffix.
 *
 * @param {string} name Input name supplied by the user.
 * @returns {string} Namespace-safe suffix without a vendor prefix.
 */
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

/**
 * Derive a display name from a directory name, omitting its first period suffix.
 *
 * @param {string} rootDir Absolute or relative project directory path.
 * @returns {string} Title-cased name derived from the directory basename.
 */
export function generateProjectNameFromDir(rootDir) {
  const directoryName = path.basename(rootDir).replace(/\..*$/, "");
  const projectSlug = generateSlugFromName(directoryName).replace(/^-+/, "");

  return generateTitleFromSlug(projectSlug);
}

/**
 * Convert a name to a lowercase, dash-separated project slug.
 *
 * @param {string} name Human-readable name to normalize.
 * @returns {string} Slug containing lowercase ASCII letters, digits, and dashes.
 */
export function generateSlugFromName(name) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "");
}

/**
 * Convert a project slug to a title-cased display name.
 *
 * @param {string} slug Dash- or underscore-separated project name.
 * @returns {string} Display name with each word capitalized.
 */
export function generateTitleFromSlug(slug) {
  return slug
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
