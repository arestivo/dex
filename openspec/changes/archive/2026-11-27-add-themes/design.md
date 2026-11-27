# Design

## Context

How colours work today:

- **Tokens:** every colour is a custom property in `styles/tokens.css`, inside `@layer tokens` on `:root`, written as `light-dark(#light, #dark)` or a single hex.
- **Light/dark:**
  - by default, `color-scheme: light dark` follows the OS;
  - the viewer's override sets `<html data-theme="light|dark">`, saved under `localStorage['dex:theme']`;
  - an inline script applies the saved value before first paint (`src/core/render/html.ts`).
- **Diagrams:** palettes are built from the same file. `createTexRenderer` parses `tokens.css` once, writes a light and a dark `\definecolor` palette, and includes both palettes in every cache key.
- **Layouts:** already a model for loading something from the engine and from the content folder (`loadLayoutSet`). Their CSS goes through a virtual module.

The proposal (see "Why") makes a theme a set of colour-token values and moves light/dark to the word "mode".

## Goals / Non-Goals

**Goals:**
- A theme changes only token values, so layouts, components and diagrams follow it with no code of their own.
- Upgrading Dex changes nothing for existing decks: `default` is exactly today's colours, and cached diagrams stay valid.
- Every theme is machine-checkable (known tokens, readable values, contrast), so agents can make one and verify it.

**Non-Goals:**
- **Per-slide themes** (`::slide{theme=…}`): slide emphasis is a job for layouts and classes, and per-slide themes would complicate diagram palettes and the page background. This could be added later without breaking anything.
- **Deck-level theme folders** (`decks/<slug>/themes/`): a deck picks a theme, and themes live at the folder level.
- **Fonts, spacing, radii and syntax-highlighting colours:** Shiki's themes are separate.
- **Restyling the viewer chrome:** its colours come from tokens it shares with slides, but `--chrome-*` is not themeable.

## Decisions

### 1. Rename light/dark to mode first

- **Attribute and storage key:** `data-color-mode="light|dark"` and `localStorage['dex:mode']`. The attribute is not `data-mode`, because the viewer already sets `data-mode="present"` on `.deck`.
- **Old saved choices:** the bootstrap script reads `dex:mode`, falls back to `dex:theme` when its value is `light` or `dark`, copies that value to the new key and removes the old one.
- **Code:** `src/client/theme.ts` becomes `mode.ts`, and the control's accessible name becomes "Dark mode". `DiagramTheme` and `DIAGRAM_THEMES` become `Mode` and `MODES`.
- **CSS:** `tokens.css`, `components/diagram.css` and `print.css` switch to `[data-color-mode]`.
- **File names:** `.dex/cache/…<hash>.light.svg` and `dex shot` image names keep `light`/`dark`, so the cache doesn't change.

This frees `data-theme` for the colour theme (decision 3). It lands as its own task group, so the build stays green before themes exist.

### 2. Themes are loaded like layouts

`src/core/themes/load.ts` reads theme folders from a list of sources, built-in first and then local, the same way `loadLayoutSet` reads layouts:

- the name pattern is checked;
- a name collision is an error at the local `theme.css`;
- a missing `theme.md` or empty `description` is a warning;
- engine and content folders that resolve to the same place are skipped.

The shared folder-walking code (the name check, the collision message, reading the `.md` front matter) moves into a small helper used by both loaders. The message texts stay as they are.

### 3. Theme CSS is one rule, rewritten under `:root[data-theme]`

- **File format:** a `theme.css` contains one `:root { … }` rule. Authors write normal CSS that editors understand.
- **Parser:** a small pure function reads it, skipping comments and recording line numbers. It accepts only `--<token>: light-dark(#rrggbb, #rrggbb);` or `--<token>: #rrggbb;`.
- **Themeable tokens:** the `--color-*`, `--tone-*` and `--code-*` tokens of `tokens.css`. That file stays the single source of the defaults and of this list, so there is no second list to keep in sync.
- **Output:** the parsed declarations are emitted as `@layer themes { :root[data-theme="<name>"] { … } }`.
- **Cascade:** a new `themes` layer goes between `tokens` and `base` in `styles/index.css`. Theme values beat the defaults, and nothing else changes order.
- **Bundling:** all themes go into a `virtual:themes.css` module, like `virtual:layouts.css`. The stylesheet stays one cached file, and a theme is a few hundred bytes.
- **Pages:** every page gets `<html data-theme="<name>">` at build time, so the right colours apply before any script runs, including without JavaScript and in print.
- **`default`:** its `theme.css` sets no tokens, so `default` is exactly `tokens.css`.

*Alternative:* scope themes to `.deck[data-theme]`. That was rejected because `--color-page` and the chrome sit outside `.deck`, and `:root` works for the index page too.

*Alternative:* parse with lightningcss. That was rejected to keep `src/core` free of build tooling. The format is small enough to check by hand, with exact line numbers.

### 4. Resolving a deck's theme

- **Order:** the front matter `theme` wins, then `dex.yaml`'s `theme`, then `default`.
- **Reading `dex.yaml`:** `src/core/settings.ts` validates it as a pure function (text in, settings and diagnostics out). `workspace.ts` reads the file.
- **Checking the name:** `compileDeck` receives the available theme names, like it receives layouts. It reports an unknown front-matter theme at the front matter's line and stores the resolved name on `CompiledDeck`.
- **Folder-level problems:** an unknown `dex.yaml` theme is reported once, at `dex.yaml`, and its decks fall back to `default`.
- **Index page:** uses the folder theme.

### 5. Diagram palettes per theme

`createTexRenderer` currently takes `tokensCss`. It will instead take the base tokens and compute palettes per theme on demand, memoised by theme name: the base colour tokens merged with the theme's overrides.

The renderer's signature becomes `(deck: { slug, theme }, sources)`. The palettes are already part of the cache key, so:

- a deck on `default` gets the same keys as today, and existing caches remain hits;
- a deck that switches theme misses only its own diagrams;
- editing a theme invalidates only the decks that use it.

### 6. The contrast check

The check is a pure function, using the WCAG 2 relative luminance and contrast ratio, run once per theme on the merged colours (base plus overrides), in each mode. It warns below 4.5:1 for these pairs:

- text, muted text and links on the background;
- inverse text on the inverse background;
- each tone on its soft background.

The warning is reported at the theme's `theme.css` (at the line of the foreground token when the theme sets it) and gives the ratio. `default` must pass, and a unit test runs the check on every built-in theme. If a current default colour fails, it is fixed in `tokens.css` as part of this change, which would invalidate that colour's cached diagrams.

### 7. CLI and agent guidance

- **`dex new theme <name>`:** writes `scaffold/theme/theme.md` and a generated `theme.css` listing every themeable token at its default value. Tokens whose default is `var(…)`, such as `--color-link`, are written as comments, because they follow another token unless set.
- **`dex docs themes`:**
  - a table of themes (origin, description, background/text/accent hex values in each mode);
  - the folder default and where it comes from;
  - each theme's notes;
  - `docs/themes.md`, the guide, including a token table generated from `tokens.css` with a one-line meaning for each token.
- **Agent rules:**
  - a new `scaffold/skills/author-theme/SKILL.md`;
  - one rule in `scaffold/AGENTS.block.md`, "the theme is the author's choice";
  - a line in `author-deck` and `migrate-remark-deck`: keep `theme:` as found, and don't add one.
- **Built-in themes:** `slate`, `forest`, `ember` and `high-contrast`. Their exact values are chosen during implementation and must pass the contrast check in both modes.

### 8. The dev server

`virtual:themes.css` adds every `theme.css` to the watched files. In `hotUpdate`:

- a `theme.css` change hot-swaps the CSS module;
- adding or removing a theme folder, or a change to `theme.md` or `dex.yaml`, invalidates the module and fully reloads the page.

Theme names are read again for each page, as layouts are.

## Risks / Trade-offs

- **[Old saved light/dark choices are lost when the key changes]** → The bootstrap reads `dex:theme` and copies it to `dex:mode` (decision 1). An e2e test sets the old key and checks that the mode is kept.
- **[Some default colours may fail the contrast check]** → The default colours are fixed in `tokens.css` before the check becomes mandatory. Diagrams that use the changed colours re-render once, with TeX.
- **[Switching a deck's theme re-renders its diagrams, which needs TeX]** → The cache key is per palette, so it happens once per theme, and the "not rendered yet" error explains it. The `author-theme` skill tells agents to expect it.
- **[Themes override `:root` tokens globally]** → Only one deck is shown per page, so nothing leaks between decks.
- **[Reusing `data-theme` with a new meaning could confuse old custom CSS]** → Dex has no external CSS hooks yet, and the rename is called out as breaking.
- **[A hand-written parser could reject valid CSS such as `!important` or multi-line values]** → The format is deliberately narrow. Every rejection names the line and the accepted forms.

## Migration Plan

- Rebuilding a site applies the new attributes, and readers' saved light/dark choices carry over.
- Content folders need no changes. Decks without `theme` and folders without `dex.yaml` look exactly as before, and their diagram caches stay valid.
- `dex init` installs `author-theme` and the new block text. `dex check` already warns about out-of-date instructions.
