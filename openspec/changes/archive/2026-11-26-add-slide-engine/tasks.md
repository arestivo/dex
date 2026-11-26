# Tasks

## 1. Project setup

- [x] 1.1 Create `package.json` (pnpm, `"type": "module"`, Node ≥ 24) with scripts `dev`, `build`, `preview`, `check:decks`, `check:fit`, `typecheck`, `lint`, `format`, `test`, `test:e2e`, `verify`; verify `pnpm install` succeeds
- [x] 1.2 Add `tsconfig.json` (shared), `tsconfig.node.json` and `tsconfig.client.json`, `biome.json` (excluding `*.md` and `*.svg`), `vitest.config.ts` (projects `unit` and `e2e`), `.gitignore`, `.editorconfig` and `flake.nix`; verify `pnpm typecheck` and `pnpm lint` pass and `flake.nix` parses

## 2. Core: deck parsing

- [x] 2.1 Implement the diagnostics model and formatter (`src/core/diagnostics.ts`); verify `tests/core/diagnostics.test.ts` covers the `<file>:<line> <severity> [<id>] <message>` format
- [x] 2.2 Implement front matter parsing and validation (`src/core/parse/front-matter.ts`); verify `tests/core/front-matter.test.ts` covers minimal, missing title, unknown key and invalid YAML
- [x] 2.3 Implement fence-aware slide splitting with line offsets (`src/core/parse/split.ts`); verify `tests/core/split.test.ts` covers separators inside code fences
- [x] 2.4 Implement the slide declaration and id rules (`src/core/parse/slide.ts`, `src/core/compile.ts`); verify `tests/core/slides.test.ts` covers missing declaration, bad id, duplicate id, unknown attribute and stable ids on reorder

## 3. Core: Markdown rendering and directives

- [x] 3.1 Build the Markdown pipeline with GFM, directives, raw HTML (keeping source positions) and Shiki dual themes (`src/core/markdown/`); verify `tests/core/markdown.test.ts` covers highlighted and unknown-language code
- [x] 3.2 Implement the directives callouts, `div`, `span`, `toc` and `slot`, bare-text-directive restoration and the unknown-directive error; verify a test per directive in `tests/core/markdown.test.ts`
- [x] 3.3 Implement asset and internal-link resolution with diagnostics; verify tests for missing assets, paths escaping the deck, root-relative warnings and broken `#id` links

## 4. Layouts

- [x] 4.1 Implement layout discovery, template parsing, slot filling (with fallback and the automatic title slot) and variables (`src/core/layouts/`); verify `tests/core/layouts.test.ts` covers each `slide-layouts` scenario
- [x] 4.2 Implement scoped layout CSS generation and the `@import`/`@layer` check; verify a test asserts the `@layer layouts { @scope (...) }` wrapper
- [x] 4.3 Create the built-in layouts `default`, `title`, `section`, `center` and `two-columns`, each with `template.html` and `style.css`; verify `pnpm check:decks` lists all five

## 5. Page rendering and build tooling

- [x] 5.1 Render the deck page, the index page and the dev error page with relative URLs (`src/core/render/`); verify `tests/core/render.test.ts` asserts structure (sections, ids, aria labels, relative URLs)
- [x] 5.2 Implement the `check:decks` CLI (`src/cli/check.ts`); verify `tests/core/workspace.test.ts` checks exit codes on the `clean` and `broken` fixtures and single-deck checks
- [x] 5.3 Implement the Vite plugin (virtual layouts CSS, dev middleware with reload and error page, CSS HMR, build emission of pages and only the referenced assets, preview directory index); verify `pnpm build` produces the expected `dist/` tree and the dev server passes manual reload, HMR and error-page checks
- [x] 5.4 Implement the `check:fit` CLI (`src/cli/fit.ts`, `src/cli/browser.ts`); verify it reports a deliberately overflowing slide with its source line and exits 0 on the HTTP deck

## 6. Styles

- [x] 6.1 Create `styles/` with the layer order, tokens (light/dark via `light-dark()`), reset, base, viewer (deck stage, chrome), components (slide, callout, code, table, toc, site index, diagnostics) and utilities; verify Biome lints the CSS cleanly and screenshots show both themes correctly
- [x] 6.2 Add the print stylesheet (one slide per page, no chrome); verify the e2e print test counts one PDF page per slide

## 7. Client runtime

- [x] 7.1 Implement the router, keyboard, touch, chrome (counter, progress, prev/next, copy link, toast, live region), idle, theme and viewer modules in `src/client/`; verify `tests/client/` covers the router and keyboard rules
- [x] 7.2 Add `tests/e2e/viewer.test.ts` (deep links, keyboard bounds, fragment without history entries, Back after a link, positional links, swipe, copy link, theme persistence, no-JS document view, print); verify `pnpm test:e2e` passes

## 8. Documentation and agent support

- [x] 8.1 Write `docs/authoring.md` (complete DSL reference) and `docs/layouts.md` (how to add a layout); verify the complete example, the nesting example and the `quote` layout example pass `pnpm check:decks`
- [x] 8.2 Write the agent skill `.agents/skills/migrate-remark-deck/SKILL.md` (symlinked into `.claude/skills/`) with the remark.js → DSL mapping table and procedure
- [x] 8.3 Write `AGENTS.md` (purpose, OpenSpec workflow, structure, commands, safety notes, conventions), `CLAUDE.md` importing it, and `README.md`

## 9. Reference deck and integration

- [x] 9.1 Recreate the HTTP deck in `decks/http/` following the skill, with its assets; verify `pnpm check:decks http` and `pnpm check:fit http` are clean
- [x] 9.2 Run `pnpm verify`, `pnpm check:fit` and `pnpm test:e2e` and verify that they all pass

## Workflow follow-up

- Archive the change with `openspec archive add-slide-engine`, so the specs become the source of truth.
