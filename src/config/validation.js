/**
 * Settings Validation
 *
 * @file Validate installation settings and report field-specific errors.
 */

import { projectRelativePath } from "../system/paths.js";

/**
 * Require a non-empty string.
 *
 * @param {*} value Candidate field value.
 * @returns {true|string} True when non-empty, otherwise a validation message.
 */
export const validateString = (value) =>
  (typeof value === "string" && value.trim().length > 0) || "At least one character is required.";

/**
 * Require a lowercase domain-safe slug with single internal dashes.
 *
 * @param {*} value Candidate project or directory slug.
 * @returns {true|string} True when valid, otherwise a validation message.
 */
export const validateSlug = (value) =>
  (typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim())) ||
  "Use lowercase letters, digits, and single dashes between words.";

/**
 * Validate an email address for the initial WordPress administrator.
 *
 * @param {*} value Candidate email address.
 * @returns {true|string} True when valid, otherwise a validation message.
 */
export const validateWPAdminEmail = (value) =>
  (typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) || "Enter a valid email address.";

/**
 * Require the minimum password length accepted by the installer.
 *
 * @param {*} value Candidate administrator password.
 * @returns {true|string} True when valid, otherwise a validation message.
 */
export const validateWPAdminPassword = (value) =>
  (typeof value === "string" && value.length >= 5) || "Password must contain at least 5 characters.";

/**
 * Validate the characters and length of a WordPress username.
 *
 * @param {*} value Candidate administrator username.
 * @returns {true|string} True when valid, otherwise a validation message.
 */
export const validateWPAdminUsername = (value) =>
  (typeof value === "string" && /^[a-z0-9 _.@-]{1,60}$/i.test(value.trim())) ||
  "Use 1–60 letters, numbers, spaces, _, ., -, or @.";

/**
 * Validate a PHP namespace beginning with a capitalized component.
 *
 * @param {*} value Candidate namespace.
 * @returns {true|string} True when valid, otherwise a validation message.
 */
export const validateNamespace = (value) =>
  (typeof value === "string" &&
    /^[A-Z][a-z0-9_]*(?:\\[A-Z][a-z0-9_]*)*$/i.test(value.trim()) &&
    /^[A-Z]/.test(value.trim())) ||
  "Enter a PHP namespace starting with a capital letter.";

/**
 * Validate a lowercase PHP function prefix ending in an underscore.
 *
 * @param {*} value Candidate function prefix.
 * @returns {true|string} True when valid, otherwise a validation message.
 */
export const validateFunctionPrefix = (value) =>
  (typeof value === "string" && /^[a-z][a-z0-9_]*_$/.test(value.trim())) ||
  "Use lowercase letters, digits, and underscores, ending with an underscore.";

/**
 * Accept only the wizard's run and exit commands.
 *
 * @param {*} value Candidate confirmation response.
 * @returns {true|string} True when recognized, otherwise a usage message.
 */
export const validateExecInstaller = (value) =>
  (typeof value === "string" && ["run", "exit"].includes(value.trim().toLowerCase())) || 'Type "run" or "exit".';

/**
 * Validate a WordPress core directory located outside reserved project paths.
 *
 * @param {*} value Candidate core directory path.
 * @returns {true|string} True when valid, otherwise a validation message.
 */
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

/**
 * Validate a project-relative log path ending in `.log`.
 *
 * @param {*} value Candidate debug log path.
 * @returns {true|string} True when valid, otherwise a validation message.
 */
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

/**
 * Use the same checks for saved settings and interactive answers.
 *
 * @param {object} field Prompt metadata containing type, choices, and an optional validator.
 * @param {*} value Candidate saved or prompted value.
 * @returns {true|string} True when valid, otherwise the first validation message.
 */
export function validateField(field, value) {
  if (field.type === "confirm") return typeof value === "boolean" || "Choose yes or no.";
  if (typeof value !== "string") return "Enter a text value.";
  if (/[\0\r\n]/.test(value)) return "Use a single line without control characters.";
  if (field.choices && !field.choices.includes(value)) return `Choose one of: ${field.choices.join(", ")}.`;
  return field.validate ? field.validate(value) : true;
}
