/**
 * Configuration Store Tests
 * @file Verify saved settings, backups, and malformed configuration handling.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { configFilename, parseConfig, readConfigText, saveConfig } from "../../src/config/store.js";
import { temporaryProject, savedSettings } from "../fixtures/project.js";

test("saved JSON retains unknown and deferred keys without administrator passwords", async (t) => {
  const root = await temporaryProject(t);
  const settings = { ...savedSettings({ devConfig: { git: true } }), futureSection: { enabled: true } };
  await saveConfig(root, settings);
  const saved = parseConfig(await readConfigText(root));
  assert.equal(saved.wordpress.adminPassword, undefined);
  assert.equal(settings.wordpress.adminPassword, "test-password");
  assert.equal(saved.devConfig.git, true);
  assert.deepEqual(saved.futureSection, { enabled: true });
  await saveConfig(root, settings);
  assert.deepEqual(await readdir(root), [configFilename]);
});

test("restart preserves the old config with monotonically numbered backups", async (t) => {
  const root = await temporaryProject(t);
  await writeFile(path.join(root, configFilename), "broken JSON");
  await writeFile(path.join(root, "ddev-local-wp-setup-config_009.bak"), "old backup");
  await saveConfig(root, savedSettings(), { restart: true });
  assert.equal(await readFile(path.join(root, "ddev-local-wp-setup-config_010.bak"), "utf8"), "broken JSON");
  assert.equal(parseConfig(await readConfigText(root)).ddev.projectName, "test-site");
});

test("malformed saved configs fail clearly and are not silently replaced", async (t) => {
  for (const text of ["{", "null", "[]", '{"wordpress": null}', '{"ddev": []}']) assert.throws(() => parseConfig(text));
  const root = await temporaryProject(t);
  await writeFile(path.join(root, configFilename), "bad");
  await assert.rejects(saveConfig(root, savedSettings()), /invalid JSON/);
  assert.equal(await readConfigText(root), "bad");
});
