/**
 * Validation Tests
 *
 * @file Verify input validation for slugs, credentials, and WordPress paths.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  validateSlug,
  validateWPAdminEmail,
  validateWPAdminPassword,
  validateWPAdminUsername,
  validateWPCoreDir,
} from "../../src/config/validation.js";

test("slugs reject spaces and non-domain characters", () => {
  assert.equal(validateSlug("my-project"), true);

  for (const value of ["", "My Site", "site.ddev.site", "../site"]) {
    assert.equal(typeof validateSlug(value), "string");
  }
});

test("administrator fields reject invalid credentials", () => {
  assert.equal(validateWPAdminUsername("site.admin"), true);
  assert.equal(validateWPAdminEmail("admin@example.test"), true);
  assert.equal(validateWPAdminPassword("a-password"), true);
  assert.notEqual(validateWPAdminUsername("admin!"), true);
  assert.notEqual(validateWPAdminEmail("admin"), true);
  assert.notEqual(validateWPAdminPassword("1234"), true);
});

test("WordPress core requires a subdirectory", () => {
  assert.equal(validateWPCoreDir("/wordpress"), true);
  assert.notEqual(validateWPCoreDir("/"), true);
});
