# Devella

An interactive JavaScript CLI for creating a local WordPress development site with DDEV. WordPress core lives in its own directory, while themes, plugins, and uploads stay in the project's `wp-content` directory.

## Requirements

- Node.js 22.13+ within Node 22, or Node.js 24+.
- [DDEV](https://ddev.com/) and a running Docker provider, such as OrbStack or Docker Desktop.
- [Composer](https://getcomposer.org/) with PHP 8.4+ available on your host.

## Quick start

Run the CLI from the directory where you want the project installed:

```sh
npm exec --package=devella -- ddev-wp install
```

Alternatively, install the package globally and run `ddev-wp install`.

To use this checkout before publishing, install its dependencies with `npm ci`, then run its executable from your project's directory:

```sh
node /absolute/path/to/devella/bin/ddev-wp.js install
```

The CLI checks that a Docker provider is running before showing setup questions. If it is unavailable, start the provider and press Enter to retry, or type `exit` to quit. The wizard collects DDEV, WordPress, theme, plugin, and documentation settings. Type `run` at the final confirmation to check requirements and begin installation. Type `exit` at either exit prompt to cancel without changing the project.

## Supported setup

- Configure and start DDEV with a WordPress site.
- Install WordPress core through Composer, outside `wp-content`.
- Configure debugging, environment and development modes, the site title and tagline, and optional post-name permalinks.
- Optionally remove default content from a newly installed site and create a static homepage.
- Optionally install an official default theme and All-in-One WP Migration.
- Optionally create custom theme and plugin directories, `wp-content/docs/TODO.md`, and Spatie Ray connection files.

Git initialization, development toolsets, starter theme/plugin files, and VS Code files are deferred. The wizard does not offer inactive features. Their existing saved configuration keys are retained when continuing with an existing config, but do not trigger installation work.

## Saved settings and reruns

Settings are saved to `devella-config.json` after you confirm `run` and before preflight checks. If a requirement such as Docker is unavailable, rerun the wizard and continue with the saved answers. The administrator password is never saved and is requested again on each run; credentials are applied only when installing a new site.

When a saved configuration exists, choose to continue with it or start from scratch. Continuing validates known values and prompts for missing or invalid answers. Starting from scratch saves a numbered `.bak` copy when installation begins.

Reruns skip WordPress core installation and destructive content cleanup on existing sites. They preserve an existing active theme and static front page, reuse a homepage left by a partial run, and avoid duplicate generated hooks and upload directory entries. Supported settings such as the title, tagline, debugging, and requested plugin activation are still applied.

Existing generated files are preserved. Incompatible core paths, custom bootstrap files, invalid configuration, and DDEV names registered to other directories stop installation with an explanation. External operations are not automatically rolled back after a failure.

## Commands and development

```sh
ddev-wp --help
ddev-wp --version
ddev-wp install --no-header --no-clear
```

From this checkout:

```sh
npm ci
npm test
npm run lint:scripts
npm run lint:docs
npm run check
npm run test:package
```

Tests use temporary projects and simulated external commands, so they do not require Docker. The package check packs and installs the CLI in a temporary consumer project; it may access the npm registry for runtime dependencies. CI runs these checks on Node 22.13 and Node 24.

See the [CLI reference](docs/cli.md), [refactor changes](docs/changes.md), [architecture](docs/architecture.md), and [refactor plan](docs/plans/refactor-plan.md). Historical shell scripts and early CLI design notes are kept in [the archive](docs/archive/README.md).

Report issues in the [GitHub repository](https://github.com/CassidyDC/devella/issues).
