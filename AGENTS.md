# AGENTS.md

Instructions for AI agents (and humans) working on this repository.

## What we are building

**Dex** is a Markdown slide engine, built as a replacement for remark.js. Decks are written in Markdown, compiled at build time into static pages and hosted on any plain static server.

The two goals that drive every design decision:

1. **Every slide has a stable identity.** A slide is addressed as `(deck slug, slide id)`, e.g. `/http/#cors-preflight`. Ids are explicit in the source and never derived from position or content, so deep links survive reordering and edits.
2. **Per-slide discussion for readers** is the next major feature. It will attach to `(deck slug, slide id)`. Its design (backend, auth, moderation) **has not been decided yet**. Don't implement or pre-empt it without an approved OpenSpec change.

Current phase: the engine and the remark → new-format migration path. Existing remark decks are recreated by an agent following `.agents/skills/migrate-remark-deck/SKILL.md`. There is deliberately no automatic converter.

### Engine vs content

**This repository is only the engine.** Decks and built sites are content and are never committed here. The `dex` command works on a *content folder*:

```text
<content folder>/          the current folder, or --folder <dir>
  decks/<slug>/slides.md   deck sources
  decks/<slug>/assets/     their images and files
  dist/                    the built site (or --dist <dir>)
```

Layouts, styles and the viewer belong to the engine and are found next to its code, wherever the command runs. For local testing, the repository root can act as a content folder: `decks/` and `dist/` there are git-ignored. Automated tests must only use committed fixtures (`tests/fixtures/`), never real decks.

## Source of truth: OpenSpec

Behaviour is specified in `openspec/specs/<capability>/spec.md`:

| Capability | Covers |
| --- | --- |
| `deck-format` | the deck source format (front matter, slides, ids, directives, assets) |
| `slide-layouts` | layout folders, templates, slots, variables, scoped CSS |
| `deck-viewer` | browser behaviour: navigation, deep links, themes, a11y, no-JS, print |
| `deck-build` | the `dex` command, content/output folders, output layout, diagnostics |

Workflow for any change in behaviour:

1. **Propose**: `/opsx:propose <idea>` (or the `openspec-propose` skill) creates `openspec/changes/<name>/` with proposal, delta specs, design and tasks. Stop for review.
2. **Apply**: `/opsx:apply`. Implement the tasks, ticking them off in `tasks.md`.
3. **Archive**: `/opsx:archive` merges the delta specs into `openspec/specs/`.

Pure refactors, tooling and docs changes don't need a proposal. If code and spec disagree, raise it; don't silently pick one. `openspec validate --strict` must pass.

## Repository map

```text
layouts/<name>/            one folder per layout: template.html (+ style.css)
src/core/                  build-time engine: pure TypeScript, no Vite
  config.ts                  engine paths; content folder / --folder / --dist
  parse/                     front matter, slide splitting, slide declarations
  markdown/                  unified pipeline: directives, Shiki, links/assets
  layouts/                   layout loading, slot filling, CSS scoping
  render/                    HTML pages (deck, index, error)
  compile.ts                 one deck → rendered slides + diagnostics
  workspace.ts               file-system access: find + compile decks
src/build/vite-plugin.ts   Vite plugin: dev middleware, build emission, layouts CSS
src/build/site.ts          dev server / build / preview for a content folder
src/client/                browser viewer (framework-free TS modules)
src/cli/                   main.ts (the `dex` command), check.ts, fit.ts, browser.ts
src/shared/                constants used by both Node and browser code
styles/                    global CSS (see "CSS" below)
docs/                      authoring.md (the format), layouts.md (adding layouts)
tests/core, tests/client   unit tests (Vitest; client tests use happy-dom)
tests/e2e                  browser tests against the built site
tests/fixtures             committed content folders for tests (viewer/ feeds the e2e suite)
openspec/                  specs and changes (see above)
(decks/, dist/)            local test content: git-ignored, never committed
```

## Commands

Use the Nix dev shell (`nix develop`) for Node 24, pnpm and Chromium.

**The `dex` command** (`src/cli/main.ts`) runs on a content folder:

```sh
dex <dev|build|preview|check|fit> [--folder <dir>] [--dist <dir>] [--port <n>] [slug...]
```

From anywhere: `node <engine>/src/cli/main.ts …` (or an alias). In this repository, the `pnpm` scripts run it with the repository root as the content folder:

| Command | What it does |
| --- | --- |
| `pnpm dev` | `dex dev`: dev server with live reload, `/` index, `/<slug>/` decks |
| `pnpm check:decks [slug...]` | `dex check`: validate decks and layouts (fast, no browser) |
| `pnpm check:fit [slug...]` | `dex fit`: build, then find slides whose content overflows (needs Chromium) |
| `pnpm build` | `dex build`: static site in `dist/`; fails on any deck error |
| `pnpm preview` | `dex preview`: serve `dist/` like a static host |
| `pnpm test` | unit tests |
| `pnpm test:e2e` | builds `tests/fixtures/viewer` into a temp folder; viewer tests in headless Chromium |
| `pnpm typecheck` | `tsc` for Node code and browser code (separate configs) |
| `pnpm lint` / `pnpm format` | Biome check / apply fixes |
| `pnpm verify` | typecheck + lint + test + check and build of the fixture deck (no real content needed) |

Chromium comes from `CHROMIUM_PATH` or `PATH`. Nothing downloads browsers.

**Definition of done**: `pnpm verify` passes. Viewer, CSS or layout changes also need `pnpm test:e2e`, plus `dex fit` on real content when available. Deck changes need `dex check` and `dex fit` clean in their content folder.

## ⚠️ Safety: Biome and assets

`biome.json` excludes `**/*.svg` and `**/*.md`. **Never remove these exclusions.**

- The draw.io SVGs in `decks/*/assets/` make Biome 2.6 allocate memory without bound. It froze the maintainer's 62 GB machine twice.
- Biome's Markdown formatter rewrites deck front matter into headings and flattens nested YAML, which destroys decks.

If you run anything with unknown memory behaviour over the repository, cap it:
`systemd-run --user --wait --pipe --same-dir -p MemoryMax=2G -p MemorySwapMax=0 -- <command>`.

## Architecture in brief

```text
slides.md ─► front matter + split on `---` ─► per slide: mdast (remark + GFM + directives)
          ─► slide declaration, ids, slots, directives ─► hast (+ raw HTML, Shiki)
          ─► asset/link checks ─► layout template filled ─► <section class="slide" id=…>
          ─► one static HTML page per deck (all slides) + viewer JS/CSS bundle
```

- **Core never throws for bad content.** It returns `Diagnostic`s (`file:line severity [slide] message`) consumed by the CLI, the dev error page and tests. Messages must say how to fix the problem: agents act on them.
- **Rendering is build time.** The page works without JS (a scrollable document), prints one slide per page, and the viewer only toggles visibility and syncs the URL fragment.
- **Layouts are data, not code.** `<slot>` templates parsed to hast; `style.css` wrapped in `@layer layouts { @scope (.slide[data-layout=…]) {…} }`.
- **Output uses only relative URLs** so the built site works from any sub-path.
- **Vite's root is the engine**, not the content folder: `src/build/site.ts` assembles the configuration (there is no `vite.config.ts`), and the plugin reads decks from, and builds into, the content locations.

## Conventions

### TypeScript

- Runs natively on Node ≥ 24 (type stripping): imports use explicit `.ts` extensions, and only erasable syntax is allowed (no `enum`, `namespace`, parameter properties). `tsconfig.json` enforces this.
- Strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Don't use `!` assertions or `any`. Narrow instead.
- Node code (`src/core`, `src/cli`, `src/build`, tests) and browser code (`src/client`) have separate tsconfigs. Browser code must not import from `src/core`. Shared constants go in `src/shared`.
- Keep `src/core` pure: only `workspace.ts` and `layouts/load.ts` touch the file system. Inject anything else (see `assetExists`).
- Plain data and functions over classes. Small modules with one job. Comments explain *why*.
- Style: Biome (2 spaces, single quotes, no semicolons, 100 columns). Run `pnpm format`.

### CSS

- Every rule lives in exactly one cascade layer, declared in `styles/index.css`: `reset, tokens, base, viewer, components, layouts, utilities, print`. A new file wraps its rules in its layer and is imported from `index.css`.
- Colours and spacing come from tokens in `styles/tokens.css`. Colours use `light-dark()`: never hard-code a colour that must differ between themes.
- Inside slides, size in `em` (it scales with the slide). Viewer chrome uses `rem`.
- Class names: BEM-like for components (`.callout`, `.callout__title`, `.callout--warning`); short lowercase names for utilities (`.small`). Layout-specific styling goes in `layouts/<name>/style.css`, not in `styles/`.
- Add a utility only when decks need it repeatedly, and document it in `docs/authoring.md`.

### Content

- Slide ids are permanent once published. Never rename one as a side effect of an edit.
- Deck changes must leave `dex check` and `dex fit` clean.
- Decks are content: never add them to this repository. Fixtures for tests go in `tests/fixtures/`.

### Tests

- Each behaviour in a spec scenario should have a test: core/unit for parsing and rendering, e2e for viewer behaviour.
- Use `tests/helpers.ts` (`compile`, `compiledDeck`, `slidesHtml`, `messages`, `slide`, `deck`) for in-memory decks.

## Git

### When to commit

- **Agents commit only when asked.** Never push unless asked.
- Commit a working state: `pnpm verify` passes, and also `pnpm test:e2e` when the change touches the viewer, CSS or layouts. Never commit a red build "to fix later".
- One logical change per commit. An OpenSpec change is usually one commit containing its implementation, its artifacts and the archive step (`openspec/changes/archive/…` plus the updated `openspec/specs/`). Split it when it is large, but keep every commit green.
- Don't mix unrelated work (a refactor plus a feature, formatting plus logic). Commit formatting-only changes on their own.

### What to commit

- Engine only: code, layouts, styles, docs, specs, test fixtures, config, and `pnpm-lock.yaml` whenever `package.json` changes.
- **Never** `decks/`, `dist/`, `node_modules/`, `.claude/settings.local.json`, credentials or other secrets. Content belongs in content folders (see [Engine vs content](#engine-vs-content)).
- Stage files explicitly and review `git diff --staged` before committing. Don't use `git add -A` blindly.

### Messages

[Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<optional scope>): <imperative summary, ≤ 72 chars, no final period>

<body: what changed and why, wrapped at 72 columns. Name the OpenSpec
change when there is one.>

<trailers>
```

- Types: `feat` (new behaviour), `fix` (bug fix), `refactor` (no behaviour change), `perf`, `test`, `docs`, `style` (formatting only), `build` (tooling, dependencies, Nix), `ci`, `chore`.
- Scopes (optional): `core`, `cli`, `build`, `viewer`, `layouts`, `styles`, `specs`, `docs`.
- Breaking changes (CLI, deck format, URLs, slide ids): add `!` after the type and a `BREAKING CHANGE:` trailer explaining the migration.
- Agent-made commits end with a `Co-Authored-By:` trailer naming the agent.

Example:

```text
feat(cli)!: rename the command from decks to dex

The engine is now called Dex, so it can't be confused with the decks/
folder or with decks themselves. OpenSpec change: rename-product-to-dex.

BREAKING CHANGE: run `dex <command>` instead of `decks <command>`.
```

### History

- `main` must always be green. Use a branch for work that spans several sessions.
- Never rewrite or force-push published history.

### Generated files

`.agents/skills/openspec-*` and `.claude/{skills,commands}/opsx*` are generated by `openspec init`/`openspec update`. Don't edit them by hand; regenerate them and commit the result as `build: update OpenSpec tooling`. `.claude/skills/migrate-remark-deck` is a symlink to `.agents/skills/migrate-remark-deck`.
