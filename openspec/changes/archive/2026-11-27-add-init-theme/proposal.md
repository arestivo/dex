# Proposal

## Why

A content folder picks its default theme in `dex.yaml`, but `dex init` never writes that file, so authors don't learn that folder settings exist unless they read the docs. A starter `dex.yaml`, written by `dex init` and explained by its comments, makes the settings visible from the start. A `--theme` option sets the theme in the same step.

## What Changes

- `dex init` creates a starter `dex.yaml` when the folder has none: `theme: default`, with comments that say what the setting does and how to list the themes (`dex docs themes`).
- An existing `dex.yaml` belongs to the author: `dex init` never changes it (it is reported as unchanged), and it is not part of the "instructions out of date" warning.
- `dex init --theme <name>` writes that theme instead:
  - into the starter file, when there is no `dex.yaml`;
  - into an existing `dex.yaml`, setting `theme` and keeping its comments and other keys. It is reported as updated, or unchanged when the file already has that theme;
  - the name must be a built-in or local theme. An unknown name is an error that lists the available themes, and nothing is written;
  - an existing `dex.yaml` that is not a valid YAML mapping is an error, and nothing is written.
- `--theme` is accepted only by `init`; other commands reject it, as they do `--deck`.
- `dex --help`, the README, `docs/themes.md` and the managed `AGENTS.md` block mention the starter file and the option.

Existing content folders get a `dex.yaml` with `theme: default` on their next `dex init`, which changes nothing: it is the same theme they already use.

This change depends on `add-themes` (which introduces themes and `dex.yaml`); archive that one first.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `content-folder-setup`: `dex init` also creates a starter `dex.yaml`, and gains an optional `--theme` that writes the folder's default theme into it.

## Impact

- `src/cli/main.ts` (the `--theme` option and its guard), `src/cli/scaffold.ts` (a planned `dex.yaml` change), `src/cli/init.ts`, a starter `scaffold/dex.yaml`.
- Reuses the theme loader of `src/core/workspace.ts` to know which themes exist, and the `yaml` package's document API to edit the file without losing comments.
- Tests in `tests/core/scaffold.test.ts` and `tests/core/cli.test.ts`. Docs: README, `docs/themes.md`, `scaffold/AGENTS.block.md`.
