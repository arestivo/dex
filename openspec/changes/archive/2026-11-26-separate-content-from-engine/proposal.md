# Proposal

## Why

This repository should contain only the slide engine. Deck sources and built sites are content with their own lifecycle (and possibly their own repository), so they must not be committed here. The engine therefore has to work on content that lives elsewhere, and its tests must stop depending on a real deck.

## What Changes

- A single `decks` command (`dev`, `build`, `preview`, `check`, `fit`) works on a **content folder**: by default the current folder, which contains `decks/`. `--folder <dir>` selects another content folder and `--dist <dir>` another output folder (default `<folder>/dist`).
- Layouts, styles and the viewer stay in the engine and are found next to the engine's code, wherever the command runs.
- Inside the engine repository, the `pnpm` scripts run the same command on the repository folder, so local, uncommitted `decks/` keep working for testing.
- `decks/` and `dist/` are ignored by git.
- The e2e viewer tests build a small committed fixture deck into a temporary folder instead of using the HTTP deck.
- **BREAKING** (developer workflow only): `vite.config.ts` is removed. The Vite configuration is assembled by the engine for each command.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `deck-format`: decks live in the content folder's `decks/`, not in the engine repository.
- `deck-build`: commands take the content folder from the working directory or `--folder`, and the output folder from `--dist`.

## Out of Scope

- A configuration file. Two path options don't need one.
- Per-deck or content-folder layouts. Layouts stay in the engine.
- Publishing the engine as an npm package.

## Impact

- New `src/core/config.ts`, `src/cli/main.ts` and `src/build/site.ts`; changes to `src/core/workspace.ts`, `src/core/layouts/load.ts`, `src/build/vite-plugin.ts` and `src/cli/{check,fit}.ts`. `vite.config.ts` is removed.
- `package.json` (scripts, `bin`), `.gitignore`, `tests/` (a new `tests/fixtures/viewer/`, an e2e setup that builds it, CLI tests).
- `AGENTS.md`, `README.md`, `docs/authoring.md`, the migration skill.
