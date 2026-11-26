# Tasks

## 1. Layout loading from two sources

- [x] 1.1 Replace `loadLayouts` with `loadLayoutSet(root, sources)` (ordered built-in then local, `origin` on each layout, a collision is an error at the local template, missing local folder is silent); verify unit tests for a local layout, a collision with `default`, an invalid local name, and no local folder
- [x] 1.2 Read `layout.md` (front matter `description`, body as notes) into each layout and warn when it is missing or its description is empty; verify unit tests for all three cases
- [x] 1.3 Add `localLayoutsDir` (default `<root>/layouts`) to `WorkspaceOptions` and use both sources in `compileWorkspace`; verify a workspace fixture with a local layout compiles a deck using it, and that an unknown-layout error lists local layouts too

## 2. Built-in layout notes and docs

- [x] 2.1 Write `layout.md` for `default`, `title`, `section`, `center` and `two-columns` (description, when to use, slots, example); verify a unit test that every built-in layout has a non-empty description and `dex check` reports no notes warnings
- [x] 2.2 Turn `docs/layouts.md` into the "making layouts" guide only (remove the table; local layouts in the content folder's `layouts/`), and update `docs/authoring.md` where it says layouts belong to the engine; verify the old drift test is replaced and no doc says layouts can only come from the engine

## 3. Generated `dex docs layouts`

- [x] 3.1 Make docs topics functions of the content folder, and render `layouts` as intro, table (name, origin, description, slots), per-layout notes ("undocumented" when missing), then the guide; verify CLI tests: built-in only, with a documented local layout, with an undocumented one, and `--folder`

## 4. `dex new layout`

- [x] 4.1 Add `scaffold/layout/` starter files and `src/cli/new.ts` (`dex new layout <name>`: validate, refuse built-in and existing names, write three files); verify CLI tests for creation, a built-in name, an existing layout, an invalid name, an unknown kind, and that a deck using the new layout passes `dex check` with only the description warning
- [x] 4.2 Add `new` to the usage text and dispatch in `src/cli/main.ts`; verify the `--help` test lists `new`

## 5. Dev server and build

- [x] 5.1 Make the Vite plugin load both layout sources for the virtual CSS and page rendering, watch the local layouts folder, HMR local `style.css` and reload on other local layout changes; verify `dex build` bundles a local layout's CSS (built output contains its `@scope` rule) and a manual dev-server check of the HMR and reload behaviour
- [x] 5.2 Add a local layout to the e2e fixture (`tests/fixtures/viewer/layouts/`) used by one slide; verify an e2e test that the slide renders with the local template and its scoped style

## 6. Agent material

- [x] 6.1 Write `scaffold/skills/author-layout/SKILL.md` (with `metadata.generatedBy: dex`); verify `dex init` in a scratch folder installs it and lists it in the managed block
- [x] 6.2 Update `scaffold/AGENTS.block.md` (`layouts/<name>/`, `dex new layout`, `dex docs layouts`) and the `author-deck` and `migrate-remark-deck` skills to point to local layouts; verify the scaffold tests and the content-of-instructions requirement
- [x] 6.3 Update README and the engine AGENTS.md (local layouts, `dex new layout`, `layout.md` for built-ins); verify no doc says layouts can only be added in the engine

## 7. Integration

- [x] 7.1 In a scratch content folder: `dex init`, `dex new layout quote`, fill in `layout.md`, use it in a deck, `dex check`, `dex fit`, `dex docs layouts`, `dex build`; verify each step's output
- [x] 7.2 Run `pnpm verify` and `pnpm test:e2e`; verify both pass

## Workflow follow-up

- Archive the change once implemented and reviewed.
- Commit following AGENTS.md: `feat(layouts): support content-folder layouts`.
