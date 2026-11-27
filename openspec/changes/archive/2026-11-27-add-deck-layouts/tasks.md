# Tasks

## 1. Loading deck layouts (core)

- [x] 1.1 Add the `'deck'` origin and an optional `deck` slug to `Layout` (`src/core/model.ts`), and an optional deck slug to `scopeLayoutCss` that scopes the CSS to `.deck[data-deck="<slug>"] .slide[data-layout="<name>"]`. Verify with a unit test in `tests/core/layouts.test.ts` that the CSS is scoped and that a layout without a deck keeps today's output.
- [x] 1.2 Add `extendLayoutSet(root, base, { dir, origin: 'deck', deck })` to `src/core/layouts/load.ts`. It reuses the per-folder loading and checks of `loadLayoutSet` (name pattern, missing template, `layout.md` warnings, unsupported CSS) and reports a collision according to the existing layout's origin (built-in or local), at the deck layout's template. Extend `tests/fixtures/local-layouts` (which must stay error-free) with two decks that each have a deck layout `example` with different styles. Verify with `tests/core/layout-sources.test.ts`, using temporary folders for the error cases, that collisions with a local and with a built-in name are reported, that the same name in two decks is allowed, and that base diagnostics are not repeated.
- [x] 1.3 Add `loadDeckLayouts(workspace, location)` in `src/core/workspace.ts`. Make `compileWorkspace` load the base set once and compile each deck with its extended set, reporting deck-layout diagnostics only for the decks being compiled. Verify with `tests/core/workspace.test.ts` that a deck uses its own layout, that another deck reports it as unknown (the message lists only the layouts available to that deck), that `compileWorkspace(…, ['one-deck'])` skips other decks' layout errors, and that files in `decks/<slug>/layouts/` are not reported as unused assets.

## 2. Build and dev server

- [x] 2.1 Make `virtual:layouts.css` in `src/build/vite-plugin.ts` include every deck's layouts (decks in slug order) after the base set, add their `style.css` files to the watched files, and compile dev pages with `loadDeckLayouts`. Verify with a unit test that the generated CSS contains both decks' scoped `example` rules, and by building `tests/fixtures/local-layouts` and finding them in the emitted CSS.
- [x] 2.2 In `hotUpdate`, treat files under `decks/<slug>/layouts/` as layout files: `style.css` hot-swaps the CSS module, and other files invalidate it and reload the page. Verify by hand with `pnpm dev` on a fixture copy: editing a deck layout's `style.css` restyles the slide without a reload, and editing its template reloads the page.
- [x] 2.3 Add a deck layout to the `tests/fixtures/viewer` deck and a slide that uses it, plus a second deck with a same-named deck layout styled differently. Verify with an e2e test in `tests/e2e/viewer.test.ts` that each deck's slide gets only its own style. Also run `pnpm test:e2e`.

## 3. CLI

- [x] 3.1 Add a `--deck <slug>` option to `src/cli/main.ts` (usage text included) that only `new layout` and `docs layouts` accept. Any other command errors and prints the usage. Verify with `tests/core/cli.test.ts`.
- [x] 3.2 Make `dex new layout <name> --deck <slug>` create `decks/<slug>/layouts/<name>/` from `scaffold/layout/`. It refuses an unknown deck, invalid names, built-in and local names, and existing deck layouts, writing nothing. Make `dex new layout <name>` refuse names used by a deck layout, naming the decks. Verify with CLI tests for each case, and that a deck using the new deck layout passes `dex check` apart from the description warning.
- [x] 3.3 Make `renderLayoutsReference` take an optional deck. With a deck, it lists built-in, local and deck layouts (origin `deck`). Without one, it adds a line naming the decks with their own layouts and how to list them. `dex docs layouts --deck nope` errors. Verify with the `dex docs` tests in `tests/core/cli.test.ts`.

## 4. Documentation and agent instructions

- [x] 4.1 Update `docs/layouts.md`:
  - the three places, with when to use a local layout (consistency across decks) and when to use a deck layout (one talk, or a deck that should be easy to move);
  - the collision rule;
  - deck-scoped styles;
  - `--deck`.

  Update `docs/authoring.md` (the "Layouts and slots" pointer). Verify that `dex docs layouts --folder tests/fixtures/local-layouts --deck <slug>` reads correctly from a content folder.
- [x] 4.2 Update `scaffold/AGENTS.block.md` (folder tree, the layouts rule, `dex new layout <name> [--deck <slug>]`, `dex docs layouts --deck`) and `scaffold/skills/author-layout/SKILL.md` (choosing local or deck, and creating either kind). Verify with `tests/core/scaffold.test.ts` that the rendered block mentions `decks/<slug>/layouts/` and `--deck`.
- [x] 4.3 Update the repository map and architecture notes in the engine's `AGENTS.md` where they describe layout sources (`loadLayoutSet` and local layouts). Verify by reading the result.

## 5. Integration

- [x] 5.1 Run `pnpm verify` and `pnpm test:e2e` (both green), and `openspec validate add-deck-layouts --strict`. If a real content folder is available, run `dex check` and `dex fit` on it and confirm they are still clean.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review, syncing the delta specs.
- Commit only when asked: one commit with the implementation, the change artifacts and the archive.
