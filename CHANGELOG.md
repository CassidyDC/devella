# Changelog for `ddev-local-wp-setup`

## [Unreleased]

### Added

- Check for a running Docker provider before opening the installation wizard, with retry and exit options.
- Added a user facing summary of the refactor changes in `docs/changes.md`.
- Added automated CLI and configuration regression tests with Node's built-in test runner.
- Added isolated npm package verification and CI checks on Node 22.13 and Node 24.

### Changed

- Reorganized the CLI into explicit command, configuration, installation, template, and system modules using native JavaScript ESM.
- Replaced shared mutable installation settings and circular helper imports with explicit inputs and a shared subprocess runner.
- Hide unfinished Git, toolset, and VS Code options while preserving their saved configuration keys.
- Updated the package executable, declared supported Node versions, and removed the unused spinner dependency.
- Replaced shell-era usage instructions with current CLI and architecture documentation, and archived historical material.

### Fixed

- Add a blank line before and after the WordPress constant success messages in the Configuring DDEV output.
- Add a blank line after the final WordPress setup completion message.
- Restore the original startup directory note, capitalize wizard section headers, and show prompt hints.
- Save settings before preflight so answers survive missing Docker or other requirements.
- Add conditional PHP namespace/function-prefix choices and create the requested documentation TODO file.
- Handle Enquirer's Ctrl+C readline cleanup safely on Node 24+.
- Corrected informational flag precedence, header suppression, and error exit codes.
- Keep select choice metadata intact during interactive validation and warn users to check the target directory before continuing.
- Restore colored CLI headers and support `FORCE_COLOR` for terminals that do not report TTY output.
- Validate reused settings and disable debug paths consistently when logging is off.
- Preserve existing WordPress content and credentials on reruns and avoid duplicate setup records and hooks.

## [2.4.0] - 2026-07-25

### Changed

- Updated name from `ddev-wp-local-setup` to `ddev-local-wp-setup`.
- Updated name of `cassidydc-toolset` to `toolset-dev-wp`.

## [2.3.0] - 2026-03-20

### Added

- Added root `composer.json` file for copying.

### Changed

- Moved project repo from `https://github.com/jacobcassidy` to `https://github.com/CassidyDC`.
- Refactored package structure.
- Renamed package from `ddev-local-wordpress-script` to `ddev-local-wp-setup`.
- Updated the install script to create project config files in the `/wp-content` directory, instead of the server root.

## [2.2.4] - 2025-10-19

- Added NPM install.
- Added missing slash in directory path.
- Added new lines for CLI spacing.
- Refactored Git install.
- Removed `ddev wp core is-installed` conditional check.
- Updated `cp` command to include dot files.
- Updated dev toolset installation with error handling.

## [2.2.3] - 2025-10-18

- Replaced `ddev-wp-setup-script` text with `ddev-local-wp-setup`

## [2.2.2] - 2025-10-18

- Added CassidyDC Development Toolset install option.
- Added missing `SLEEP_HOOK` echo.
- Moved scripts into scripts directory and files under directories named after packages.
- Removed `.gitignore.txt` and `.editorconfig` files.
- Updated README instructions.

## [2.2.1] - 2025-08-20

- Added conditional rule for updating gitignore with custom theme slug.
- Added additional dev files and directories to `.gitignore`.

## [2.2.0] - 2025-08-01

- Refactored settings.

## [2.1.1] - 2025-07-22

- Added missing custom WP table prefix variable name.

## [2.1.0] - 2025-07-22

- Added setting and post-start hook for custom WP table prefix.

## [2.0.0] - 2025-07-21

This version refactors the install setup to separate WordPress Core files from the rest of the files, including wp-content.

- Replaced the default WordPress install with the `roots/wordpress` composer package for installing core files in the `wordpress` directory.
- Added a root `index.php` file to point to the WP Core `wordpress/index.php` file.
- Added a root `wp-cli.yml` file to point the WP CLI path to the `wordpress` directory.
- Refactored `.gitignore` file and renamed it to `gitignore.txt` since it's a template and not suppose to act as a real .gitignore file in this repo.
- Refactored and rename the `wp-starter-setup-module.sh` to `wp-install-module.sh`.
- Refactored DDEV post-start hooks install order so they get added to wp-config.php on the first start (previously they were only added after a restart).
- Renamed `wp-debug-log-setup-module.sh` to `ddev-post-start-hooks-module.sh`.

## [1.6.2] - 2025-04-02

- Fixed typos.
- Removed all development configuration files. (These files are now part of a separate repo located at `https://github.com/jacobcassidy/wp-dev-config-files`)
- Renamed `config.sh` to `settings.sh`
- Replaced `array()` with short syntax `[]`
- Restructured file organization to simplify setup.
- Updated AIO unlimited extension version.
- Updated README.md content for file restructure.
- Updated the default value for the local AIOMUE plugin to `false` since it's a paid plugin that needs a local file source.

## [1.6.1] - 2024-12-04

- Added 2s sleep timing to post-start hooks to allow system to finalize before execution.

## [1.6.0] - 2024-11-29

- Added check that email address is valid before running install script.
- Separated WP download and install processes and included relevant messages.
- Updated custom yellow terminal messages with black.

## [1.5.0] - 2024-11-28

- Added `$HIDE_DASHBOARD_WIDGETS` setting to remove default WordPress dashboard widgets and welcome panel.
- Updated `README.md` content for clarity.

## [1.4.1] - 2024-11-27

- Updated configuration file to have individual controls for WP debugging and env settings.
- Updated log directory creation logic to be dynamic.

## [1.4.0] - 2024-11-27

- Added `SCRIPT_DEBUG` to setup.

## [1.3.4] - 2024-11-25

- Fixed broken AIOMUE plugin unzip path.
- Updated README with note on Query Monitor plugin installation option
- Updated `$WP_SITE_TITLE` with default name and override option.

## [1.3.3] - 2024-11-25

- Added installation option for Query Monitor plugin and AIOMUE local path variable.

## [1.3.2] - 2024-11-24

- Added boolean install options for default and starter themes.
- Fixed the `$PROJECT_TITLE` value by using `awk` for capitalizing the first letter of each word.
- Updated the README to improve ability to quickly scan for the commands.

## [1.3.1] - 2024-11-24

- Added the `$PROJECT_TITLE` variable.
- Updated `$WP_SITE_TITLE` to use `$PROJECT_TITLE` variable.

## [1.3.0] - 2024-11-24

- Added the `PROJECT_NAME_SLUG` variable for the ddev project name, which replaces whitespaces with dashes and uppercase letters with lowercase letters in the `$PROJECT_NAME` variable.
- Updated `$WP_SITE_TITLE` to use `$PROJECT_NAME` variable.
- Updated `DEFAULT_WP_THEME_SLUG` value to `twentytwentyfive`.
- Updated `PROJECT_NAME` logic to remove any leading symbols.
- Updated cloned git removal message.

## [1.2.0] - 2024-11-11

- Added `.dev-assets`, `.env` and `vendor` to .gitignore list.
- Moved `constants.sh` inside `/modules`.

## [1.1.0] - 2024-10-06

- Fixed WP debugging config settings getting overwritten when restarting DDEV with the addition of `wp-debug-log-setup-module.sh`.
- Added boolean option for installing WP Debug.
- Refactored order script are run in.
- Added `CHANGELOG.md` file.
- Updated terminal colors used for various messages.
- Updated the `files/vscode-settings.json` file's CSS and HTML settings for formatting to WordPress Code Standard
- Renamed and moved `./scripts/script-variables.sh` to `./constants.sh`.
