# Proposal

## Why

Today a layout lives either in the engine (built-in) or in the content folder's `layouts/` (local), so every layout is visible to every deck in the folder. Some layouts only make sense for one talk, such as a slide arrangement for one case study. Putting those in `layouts/` clutters every other deck's list of layouts, and the deck folder can't be moved to another content folder without them.

## What Changes

- A deck can have its own layouts in `decks/<slug>/layouts/<name>/`. They use the same files as other layouts (`template.html`, optional `style.css`, `layout.md`) and only that deck can use them.
- Layouts now come from three places, from widest to narrowest: built-in, local (the content folder's `layouts/`) and deck.
- A deck layout whose name matches a built-in or local layout is an error, reported at the deck layout's template, and the wider layout is used instead. This extends the existing "local layouts cannot replace built-in layouts" rule. Different decks may have deck layouts with the same name.
- A deck layout's CSS applies only to slides of that layout in that deck. All layout CSS still ships in the one site-wide stylesheet.
- `dex new layout <name> --deck <slug>` creates a deck layout. `dex new layout <name>` (a local layout) refuses names that a deck already uses for its own layout, because creating it would break that deck.
- `dex docs layouts --deck <slug>` lists the built-in, local and deck layouts that the deck can use. Without `--deck` it lists built-in and local layouts and names the decks that have their own.
- `dex check` checks each deck's layouts along with the deck. `dex dev` updates open pages when a deck layout changes, and a stylesheet edit applies without reloading the page.
- The docs, the `author-layout` skill and the managed `AGENTS.md` block explain when to use each kind. Use a local layout for consistency across decks, and a deck layout for something one talk needs or for a deck that should be easy to move.
- No breaking changes: existing local layouts behave as before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `slide-layouts`: layout folders gain the deck level. The collision rule covers deck layouts. Styles of deck layouts are scoped to their deck. Scaffolding gains `--deck`.
- `deck-format`: a deck folder may contain `layouts/`.
- `authoring-reference`: `dex docs layouts` gains `--deck` and mentions decks with their own layouts.
- `deck-build`: the content folder requirement covers deck layouts, and the dev server watches them.
- `content-folder-setup`: the managed block describes deck layouts and `dex new layout --deck`.

## Impact

- **Core:**
  - `src/core/model.ts`: a new layout origin, `deck`, and the deck a layout belongs to;
  - `src/core/layouts/load.ts` and `css.ts`: loading a deck's layouts on top of the shared set, collision messages for each origin, and deck-scoped CSS;
  - `src/core/workspace.ts`: per-deck layout sets in `compileWorkspace` and `compileDeckAt`;
  - `src/core/compile.ts`: the unknown-layout message lists the deck's layouts.
- **Build:** `src/build/vite-plugin.ts` adds every deck's layouts to `virtual:layouts.css`, watches and hot-swaps deck layout styles, and compiles dev pages with the deck's layout set.
- **CLI:**
  - `src/cli/main.ts`: a `--deck` option;
  - `src/cli/new.ts`: deck target and collision checks;
  - `src/cli/docs.ts`: deck-aware layouts reference.
- **Docs and scaffold:** `docs/layouts.md`, `docs/authoring.md`, `scaffold/AGENTS.block.md` and `scaffold/skills/author-layout/SKILL.md`.
- **Tests:** unit tests for loading, collisions, scoping, `new` and `docs`. A deck layout is added to the `viewer` e2e fixture.
- No new dependencies.
