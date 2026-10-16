# CLI reference

## Commands and flags

| Argument      | Alias | Behavior                                                       |
| ------------- | ----- | -------------------------------------------------------------- |
| `install`     | `i`   | Run the interactive installation wizard.                       |
| `--help`      | `-h`  | Display usage, commands, flags, and examples.                  |
| `--version`   | `-v`  | Print only the package version.                                |
| `--debug`     | `-d`  | Display package, project directory, command, and flag details. |
| `--no-clear`  | `-nc` | Keep existing terminal output.                                 |
| `--no-header` | `-nh` | Suppress the CLI header.                                       |

Arguments are validated before dispatch. Unknown arguments or multiple commands fail, even when combined with an informational flag. For valid input, help takes precedence over version, version over debug, and debug over installation. No command defaults to help. Suppression flags alone also display help.

Successful actions and explicit `exit` cancellation return status 0. Invalid arguments and installation failures return status 1. Ctrl+C during prompting or subprocess execution returns status 130. Colors are enabled when output is a terminal; set `FORCE_COLOR=1` to enable them in other environments or `NO_COLOR=1` to disable them. `FORCE_COLOR=0` disables colors.

## Installation flow

1. Show the target directory and warn that the installer will create files and configure a DDEV WordPress project there.
2. Offer to reuse an existing configuration or start from scratch.
3. Collect missing or invalid enabled settings. Always request the administrator password.
4. Ask for `run` or `exit` confirmation.
5. Check project paths, file compatibility, dependencies, Docker availability, and DDEV project registration.
6. Save settings, excluding the password. Back up a replaced configuration when restarting.
7. Create missing project files and directories, then install WordPress core dependencies through Composer.
8. Configure DDEV, update managed WordPress hooks and upload directories, and start the server.
9. Check whether WordPress is installed, install it if necessary, apply supported settings, and open the admin dashboard.

Preflight performs no project writes. A failed later stage stops subsequent stages and leaves already completed external operations in place. Fix the reported problem and rerun; the installer does not provide transactional rollback or a persisted resume checkpoint.

## Settings compatibility

The saved filename remains `ddev-local-wp-setup-config.json`, with the existing `ddev`, `wordpress`, `plugin`, `theme`, and `devConfig` sections. Missing sections are collected normally; sections present with invalid shapes, or invalid JSON, must be corrected or replaced by choosing to start from scratch.

Unknown and deferred keys are preserved when continuing, but only enabled, known fields enter execution settings. Disabled custom theme/plugin fields and debug paths do not trigger filesystem creation. Disabling logging sets `WP_DEBUG_LOG` to false.

Saved core and log paths retain their leading-slash convention, such as `/wordpress` and `/wp-content/logs/wp-errors.log`. These are relative to the project, not your computer's filesystem root. Traversal segments and symlinks leading outside the project are rejected.

Restart backups use names such as `ddev-local-wp-setup-config_000.bak`, incrementing beyond existing numbered backups. A restart resets saved choices; the original configuration, including unknown keys, remains available in its backup.

## Files and existing projects

Default output includes:

```text
.ddev/config.yaml             # DDEV configuration and post-start hooks
wordpress/                   # Composer-installed core; directory is configurable
wp-content/
  plugins/
  themes/
  logs/                      # When debug logging uses the default path
  docs/dev/                  # Optional
  docs/reference/            # Optional
composer.json
composer.lock
ddev-local-wp-setup-config.json
index.php
wp-cli.yml
wp-config.php                # Managed by DDEV
wp-config-ddev.php            # Managed by DDEV
```

Ray adds `.ddev/php/php-ray.ini`, `.ddev/web-build/Dockerfile`, and `ray.php`. Custom theme and plugin choices create their directories; they do not install starter files. Documentation choices create directories, not document templates.

Existing files are not regenerated. `index.php`, `wp-cli.yml`, and Composer's WordPress install directory must agree with the selected core path. Custom bootstraps must be reviewed and aligned manually. DDEV must use the WordPress project type and project-root docroot, and its name must match the wizard setting. A project name already registered to another directory cannot be reused.

Composer settings are merged without removing unrelated dependencies, scripts, or extra fields. Existing `roots/wordpress` constraints are retained and installed with `composer install`; new projects add it with `composer require --dev`. Explicitly disabled Composer plugin permission must be resolved before installation.

YAML editing preserves unrelated configuration and comments, although serialization may normalize formatting. The installer manages `use_dns_when_possible`, its WordPress constant-setting post-start hooks, and required upload directories. Hooks setting those same managed constants are replaced; other hooks are retained.

On an existing site, administrator credentials, posts, comments, active themes, and configured static front pages are preserved. Selecting a default theme ensures it exists as a fallback. Cleanup of default posts, bundled plugins, and dashboard widgets runs only immediately after a fresh core installation.
