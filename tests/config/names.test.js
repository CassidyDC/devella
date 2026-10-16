import assert from "node:assert/strict";
import test from "node:test";
import {
  generateNamespaceFromName,
  generateSlugFromName,
  generateTitleFromSlug,
} from "../../src/js/modules/utils/helpers/generate.js";

test("project names produce stable slugs, titles, and PHP namespaces", () => {
  assert.equal(generateSlugFromName("Cassidy's New Site!"), "cassidys-new-site");
  assert.equal(generateTitleFromSlug("my-new_site"), "My New Site");
  assert.equal(generateNamespaceFromName("Cassidy's block-theme"), "CassidysBlockTheme");
});
