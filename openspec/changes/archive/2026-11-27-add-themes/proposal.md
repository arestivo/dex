# Proposal

## Why

Every deck currently has the same colours. Authors want decks for different courses or talks to look distinct, and agents need a safe, checkable way to build a new colour set that works in both light and dark modes and in diagrams. Colours already come entirely from design tokens, so a theme can be just a set of token values.

## What Changes

- **Themes are colour sets.** A theme is a folder with a `theme.css` that sets colour tokens, giving each one a light and a dark value, and a `theme.md` with a description and notes. It changes nothing but colours: fonts, spacing, layouts and syntax-highlighting colours are not part of a theme.
- **Built-in and local themes.** Dex ships a few themes in the engine's `themes/<name>/`: `default`, which is today's colours, and four others. A content folder can add its own in `themes/<name>/`, and these can't reuse a built-in name.
- **Choosing a theme:**
  - a deck's front matter `theme: <name>` wins;
  - otherwise the content folder's new configuration file, `dex.yaml` (`theme: <name>`), applies;
  - otherwise `default` is used.

  The site index uses the folder's theme. An unknown theme is an error that lists the available themes.
- **Checks:** `dex check` validates themes:
  - only known colour tokens may be set;
  - values must be colours it can read, with a light and a dark value;
  - text and background pairs that are hard to read raise a contrast warning.
- **Diagrams** use the deck's theme colours, so changing a deck's theme re-renders its diagrams. That needs TeX unless the renderings are cached.
- **Commands:**
  - `dex new theme <name>` creates a starter theme, pre-filled with every colour token at its current value;
  - `dex docs themes` lists the themes, with origin, description and main colours, followed by a guide to making one. It also says which theme the folder uses by default.
- **BREAKING: light/dark is renamed "mode", so "theme" can mean the colour set.**
  - The viewer's toggle, its `d` key, its saved choice, the `<html>` attribute (`data-color-mode`) and the docs now say "mode".
  - A saved light/dark choice is carried over from the old storage key, so readers don't lose it.
  - `dex shot` file names (`-light.png`, `-dark.png`) don't change.
- **Agent guidance:**
  - a new content skill, `author-theme`, explains how to create or change a theme;
  - the managed `AGENTS.md` block, `author-deck` and `migrate-remark-deck` tell agents not to change a deck's theme (front matter or `dex.yaml`), and not to create themes, unless the user asks.

## Capabilities

### New Capabilities

- `deck-themes`: theme folders (built-in and local), what a theme may contain and how it is validated, theme selection (front matter, `dex.yaml`, default), applying a theme to deck and index pages, the contrast check, and `dex new theme`.

### Modified Capabilities

- `deck-viewer`: "Light and dark themes" becomes "Light and dark modes", including the attribute and the saved choice.
- `deck-format`: the front matter gains an optional `theme`.
- `diagrams`:
  - the diagram palette comes from the deck's theme;
  - "Diagrams follow the theme" becomes "Diagrams follow the mode";
  - the rendering cache covers theme changes.
- `deck-build`:
  - the content folder holds `themes/` and `dex.yaml`;
  - a new requirement covers the configuration file;
  - the dev server updates pages when themes change;
  - `dex shot` wording changes from theme to mode.
- `authoring-reference`: a `themes` topic, generated for the content folder.
- `content-folder-setup`:
  - `dex init` installs the `author-theme` skill;
  - the managed block describes themes and the rule against changing them unasked.

## Impact

- **Code:**
  - `src/core/parse/front-matter.ts` gets the `theme` key;
  - a new `src/core/themes/` module loads and validates themes and generates their CSS;
  - a new config loader reads `dex.yaml`;
  - `src/core/workspace.ts` resolves each deck's theme;
  - `src/core/diagrams/` builds palettes per theme;
  - `src/core/render/` marks the theme on pages;
  - `src/build/vite-plugin.ts` adds `virtual:themes.css`;
  - in `src/client/`, `theme.ts` becomes `mode.ts`;
  - in the CLI, `new`, `docs` and `main.ts` change;
  - `src/shared/constants.ts` gets the storage key and its migration.
- **Styles:** a new `themes` cascade layer between `tokens` and `base`. `tokens.css` comments and the light/dark attribute (`data-color-mode`) change.
- **Content:** a new engine folder, `themes/`, with the built-in themes. New scaffold files: `scaffold/theme/` and `scaffold/skills/author-theme/`.
- **Docs:** `docs/themes.md` is new. `docs/authoring.md`, `docs/layouts.md`, the README, both `AGENTS.md` files and the skills switch to the theme/mode wording.
- **Tests:** unit tests for loading, validation, selection, contrast, the CLI and diagram palettes. An e2e test checks that a themed deck and the renamed mode toggle work.
- No new dependencies.
