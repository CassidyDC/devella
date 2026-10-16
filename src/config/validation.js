import { projectRelativePath } from "../system/paths.js";

export const validateString = (value) =>
  (typeof value === "string" && value.trim().length > 0) || "At least one character is required.";

export const validateSlug = (value) =>
  (typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim())) ||
  "Use lowercase letters, digits, and single dashes between words.";

export const validateWPAdminEmail = (value) =>
  (typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) || "Enter a valid email address.";

export const validateWPAdminPassword = (value) =>
  (typeof value === "string" && value.length >= 5) || "Password must contain at least 5 characters.";

export const validateWPAdminUsername = (value) =>
  (typeof value === "string" && /^[a-z0-9 _.@-]{1,60}$/i.test(value.trim())) ||
  "Use 1–60 letters, numbers, spaces, _, ., -, or @.";

export const validateNamespace = (value) =>
  (typeof value === "string" &&
    /^[A-Z][a-z0-9_]*(?:\\[A-Z][a-z0-9_]*)*$/i.test(value.trim()) &&
    /^[A-Z]/.test(value.trim())) ||
  "Enter a PHP namespace starting with a capital letter.";

export const validateExecInstaller = (value) =>
  (typeof value === "string" && ["run", "exit"].includes(value.trim().toLowerCase())) || 'Type "run" or "exit".';

export function validateWPCoreDir(value) {
  try {
    if (typeof value !== "string" || !value.startsWith("/")) return 'Path must start with a "/".';
    const relative = projectRelativePath(value);
    if (["wp-content", ".ddev", ".git", "vendor", "node_modules"].includes(relative.split("/")[0]))
      return "Choose a separate WordPress core directory.";
    return true;
  } catch (error) {
    return error.message;
  }
}

export function validateLogPath(value) {
  try {
    if (typeof value !== "string" || !value.startsWith("/") || !value.endsWith(".log"))
      return "Use a project-relative /path/file.log.";
    projectRelativePath(value);
    return true;
  } catch (error) {
    return error.message;
  }
}

/** Use the same checks for saved settings and interactive answers. */
export function validateField(field, value) {
  if (field.type === "confirm") return typeof value === "boolean" || "Choose yes or no.";
  if (typeof value !== "string") return "Enter a text value.";
  if (/[\0\r\n]/.test(value)) return "Use a single line without control characters.";
  if (field.choices && !field.choices.includes(value)) return `Choose one of: ${field.choices.join(", ")}.`;
  return field.validate ? field.validate(value) : true;
}
