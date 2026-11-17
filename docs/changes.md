# Changes in the Refactored CLI

This document summarizes the user visible changes introduced by the v3 refactor.

## Wizard questions and wording

- The wizard begins with a two-line warning showing the current project path and reminding users that files and DDEV configuration will be created there. A blank line separates it from the continue/exit prompt.
- Section headings now use capitalized names, such as `Installation Wizard`, `DDEV Settings`, and `WordPress Settings`.
- Prompt hints explain defaults and the effect of choices. Hints remain visible beside prefilled answers.
- The project type question is a working selection menu for Theme, Plugin, or Both.
- The permalink question refers to using the postname slug.
- When creating a custom theme or plugin directory, the wizard asks whether to use official PHP namespacing style. The default is yes. It then asks for either a namespace or a function prefix, depending on that choice.
- The documentation question asks whether to add `wp-content/docs` with a `TODO.md` file. The default is yes.

## Generated project content

- WordPress core is installed by Composer in its own directory, defaulting to `wordpress`; the root bootstrap and WP-CLI configuration point to it while `wp-content` remains at the project root.
- The wizard can create custom theme and plugin directories, `wp-content/docs/TODO.md`, and optional Spatie Ray connection files.
- Custom theme and plugin starter code is not generated. The namespace and function prefix answers are collected for the custom build configuration.
- Existing generated files are preserved. Reruns skip WordPress core installation and new-install cleanup, preserve existing content and credentials, and avoid duplicate managed DDEV hooks.
- Git initialization, development toolsets, and VS Code setup remain deferred. Their old saved configuration keys are preserved when continuing an existing configuration.

## Color and terminal output

- The package header text, wizard headings, warnings, and errors use color when color output is enabled. The package header border remains plain.
- Colors are detected from terminal output. `FORCE_COLOR=1` can enable them when output is not detected as a terminal; `NO_COLOR=1` disables automatic color detection.
- Clear-screen behavior is limited to terminal output and can be disabled with `--no-clear`.

## Installation workflow

- Before showing setup questions, the CLI checks Docker and asks the user to start the provider and retry if it is unavailable.
- The final `run` confirmation saves the collected settings before preflight checks. The config omits the administrator password, so a rerun can reuse other answers after a missing Docker or other preflight requirement is fixed.
- Existing configurations can be continued or replaced. Continuing validates known values and asks again for missing or invalid settings; the password is always requested again.
- Preflight checks project paths, existing files, Composer and DDEV configuration, required commands, Docker availability, and project registration before generated setup files or external setup commands are changed.
- The installer then prepares project files, Composer dependencies, DDEV, and WordPress in sequence. A failed step stops later work; completed external operations are not automatically rolled back.

## CLI and package structure

- The executable is `devella install`, implemented as a native JavaScript ESM package with separate CLI, configuration, installation, template, and system modules.
- Help, version, debug, and installation actions are parsed explicitly. Invalid arguments and failed installation steps return nonzero exit codes; Ctrl+C returns status 130.
- Subprocesses run with explicit working directories and argument arrays instead of shell-built commands. Informational commands do not load the installer.
