# Proposal

## Why

The engine gets a product name, **Dex**, distinct from the content it works on (decks). A command called `decks` was easy to confuse with the `decks/` folder and with decks themselves.

## What Changes

- **BREAKING**: the command is `dex` (`dex dev|build|preview|check|fit`) instead of `decks`. The package and its `bin` are `dex`.
- The product is called Dex in docs, the README and the tooling (Vite plugin name, theme storage key `dex:theme`).
- Unchanged: the `decks/` folder in content folders, the word "deck" for a presentation, the `pnpm` script names, and the site's default title.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `deck-build`: the command is named `dex`.

## Impact

- `package.json`, `src/cli/*`, `src/build/*`, `src/shared/constants.ts`, tests, `flake.nix`, `README.md`, `AGENTS.md`, `docs/`, the migration skill, `openspec/config.yaml`.
- Readers' stored theme preference (`decks:theme`) is not carried over; they'll see their OS theme until they toggle it again. Nothing is published yet, so no migration is needed.
