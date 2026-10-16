import { stringify } from "yaml";

export function phpString(value) {
  return `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

export function renderIndex(coreDir) {
  return `<?php\n\nrequire_once __DIR__ . ${phpString(`/${coreDir}/index.php`)};\n`;
}

export function renderWpCli(coreDir) {
  return stringify({ path: coreDir });
}
