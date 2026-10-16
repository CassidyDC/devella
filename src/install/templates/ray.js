import { phpString } from "./bootstrap.js";

export const rayDockerfile =
  "# Install Global Ray\nENV COMPOSER_HOME=/usr/local/composer/\nRUN composer global require spatie/global-ray\n";
export const rayIni =
  "auto_prepend_file = '/usr/local/composer/vendor/spatie/global-ray/src/scripts/global-ray-loader.php'\n";

export function renderRay(rootDir) {
  return `<?php\n\nreturn [\n    'enable' => true,\n    'host' => 'host.docker.internal',\n    'port' => 23517,\n    'remote_path' => '/var/www/html',\n    'local_path' => ${phpString(rootDir)},\n];\n`;
}
