# Tasks

## 1. Rename light/dark to "mode"

- [x] 1.1 Rename `THEME_STORAGE_KEY`/`THEME_ATTRIBUTE` to `MODE_STORAGE_KEY` (`dex:mode`) and `MODE_ATTRIBUTE` (`data-color-mode`) in `src/shared/constants.ts`. Rename `src/client/theme.ts` to `mode.ts` (and `toggle-theme` to `toggle-mode`). Label the control "Dark mode". Update the first-paint script in `src/core/render/html.ts` to read the old `dex:theme` value, move it to `dex:mode` and remove the old key. Verify with client unit tests for the migration.
- [x] 1.2 Switch `styles/tokens.css`, `styles/components/diagram.css`, `styles/print.css` and `src/cli/shot.ts` to `data-color-mode` and the new key. Rename `DiagramTheme`/`DIAGRAM_THEMES` to `Mode`/`MODES` in `src/core/diagrams/`, without changing cache file names or cache keys. Verify that the committed `tests/fixtures/viewer/.dex/cache/` diagrams are still cache hits, and that `pnpm test:e2e` passes with the e2e tests updated to "mode", plus a test that a stored `dex:theme=dark` opens in dark mode.
- [x] 1.3 Replace light/dark "theme" wording with "mode" in `docs/authoring.md`, `docs/layouts.md`, the README, both `AGENTS.md` files (the engine's and `scaffold/AGENTS.block.md`), `scaffold/layout/style.css` and the skills. Verify that `grep -rni "theme" docs scaffold` shows no remaining light/dark use.

## 2. Loading and validating themes (core)

- [x] 2.1 Extract the folder-walking helper shared by layouts and themes (the name check, the collision message and the `.md` front matter) from `src/core/layouts/load.ts`, without changing any layout diagnostic. Verify that the existing layout tests pass unchanged.
- [x] 2.2 Add `src/core/themes/parse.ts`: the pure `theme.css` parser (one `:root` rule, the accepted value forms, line numbers) and the list of themeable tokens read from `tokens.css`. Verify with unit tests for a valid theme, a non-colour token, an unknown token, an unreadable value, extra rules and comments.
- [x] 2.3 Add `src/core/themes/load.ts`: built-in and local theme sources, collisions, `theme.md` warnings, and the scoped CSS (`@layer themes { :root[data-theme="…"] {…} }`). Add the `themes` layer to `styles/index.css` between `tokens` and `base`. Verify with unit tests over temporary folders and a `tests/fixtures/themes` content folder.
- [x] 2.4 Add `src/core/themes/contrast.ts` (WCAG relative luminance and ratio) and the pair checks per mode, on the merged colours, warning at the theme's `theme.css`. Verify with unit tests: known ratios, a low-contrast dark-mode pair, and the `default` colours passing (fix `tokens.css` if one fails, and note any diagrams this re-renders).

## 3. Choosing a theme and rendering it

- [x] 3.1 Add `src/core/settings.ts`, which validates `dex.yaml` (only `theme`; invalid YAML, a non-mapping and unknown keys are errors). Make `workspace.ts` read it. Verify with unit tests.
- [x] 3.2 Add `theme` to the front matter keys. Pass the available theme names to `compileDeck`, resolve each deck's theme (front matter, then `dex.yaml`, then `default`), report unknown names at the front matter or at `dex.yaml`, and store the name on `CompiledDeck`. Verify with unit tests for each precedence case and the unknown-theme messages.
- [x] 3.3 Render `<html data-theme="<name>">` on deck pages, and the folder theme on the index page and error pages. Verify with render unit tests.
- [x] 3.4 Build the diagram palettes per theme: the renderer gets `{ slug, theme }`, and the palettes merge the base tokens with the theme's overrides, memoised. Verify with `tests/core/diagram-cache.test.ts` that a `default` deck keeps today's keys, that a themed deck misses only its own diagrams, and that editing a theme invalidates only its decks.

## 4. Build, dev server and built-in themes

- [x] 4.1 Add `virtual:themes.css` to `src/build/vite-plugin.ts`, importing it next to the layouts CSS. Watch the `theme.css` files: a `theme.css` change hot-swaps the CSS, while theme folders, `theme.md` and `dex.yaml` changes reload the page. Verify with a build of `tests/fixtures/themes` (the CSS has every theme scoped) and by hand with `dex dev`: editing a theme restyles without reloading, and editing `dex.yaml` reloads.
- [x] 4.2 Create the engine's `themes/` folder: `default` (no overrides) and `slate`, `forest`, `ember` and `high-contrast`, each with `theme.md`. Verify with a unit test that every built-in theme loads with no diagnostics (including contrast) in both modes. Then look at a deck in each theme with `dex shot`, in both modes, including a diagram slide.
- [x] 4.3 Add a deck with `theme: forest` to `tests/fixtures/viewer`, plus a `dex.yaml`. Verify with e2e tests that the themed deck gets `forest`'s colours in light and dark mode (toggling), that other decks use the folder theme, and that print uses the light values. Run `pnpm test:e2e`.

## 5. CLI

- [x] 5.1 Add `dex new theme <name>`: a `theme.css` generated from the default tokens (`var()` defaults written as comments) and `theme.md` from `scaffold/theme/`. It refuses invalid, built-in and existing names, writing nothing. Verify with CLI tests that a deck using the new theme passes `dex check` apart from the description warning.
- [x] 5.2 Add the `themes` topic to `dex docs`: the theme table with main colours per mode, the folder default and its source, the notes, then `docs/themes.md` with the token table generated from `tokens.css`. Update the docs topic list and the unknown-topic example. Verify with CLI tests for built-in and local themes, the folder default, and `--list`.

## 6. Documentation and agent guidance

- [x] 6.1 Write `docs/themes.md`:
  - what a theme is (colours only), built-in and local themes;
  - choosing one (front matter, `dex.yaml`);
  - the `theme.css` format and accepted values, and both modes;
  - contrast, diagrams re-rendering, and a checklist.

  Add `theme` to the front matter section of `docs/authoring.md` and document `dex.yaml`. Verify that `dex docs themes` reads correctly from a content folder.
- [x] 6.2 Write `scaffold/skills/author-theme/SKILL.md`:
  - only when the user asks, and prefer an existing theme;
  - `dex new theme`, both modes, contrast, diagrams, `theme.md`;
  - select the theme only where the user asked;
  - verify with `dex check` and `dex shot` in both modes.

  Verify with `tests/core/scaffold.test.ts` that `dex init` installs it, and that its front matter parses.
- [x] 6.3 Add to `scaffold/AGENTS.block.md`: `themes/<name>/` and `dex.yaml` in the folder tree, `dex docs themes` and `dex new theme`, and the rule not to change a deck's theme, `dex.yaml` or themes unless the user asks. Add a matching line to `author-deck` and `migrate-remark-deck` (keep `theme:` as found, and don't add one). Verify with scaffold tests that the rendered block contains the rule and the commands.
- [x] 6.4 Update the engine's `AGENTS.md`: the repository map (`themes/`, `src/core/themes/`, `settings.ts`), the CSS layer list, the capability table (`deck-themes`), and the architecture notes on theme CSS and diagram palettes. Verify by reading the result.

## 7. Integration

- [x] 7.1 Run `pnpm verify` (inside `nix develop`, under the memory cap), `pnpm test:e2e` and `openspec validate add-themes --strict`. Run `dex check` and `dex fit` on the local `http` deck, which is on `default`: there should be no new diagnostics and no re-rendered diagrams.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review, syncing the delta specs.
- Commit only when asked. Suggested split, each commit green:
  1. the mode rename (group 1);
  2. the themes (groups 2 to 6), together with the archive.
