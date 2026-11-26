# Design

## Context

This is a greenfield project; see proposal.md for the motivation. The constraints that shape it:

- The published decks are hosted on a plain static web server. There is no server-side logic and no URL rewriting.
- Existing decks will be recreated by an agent following a playbook, so the format must be easy for agents to write correctly and easy to validate mechanically.
- Per-slide discussion will come later. It needs a stable key per slide, which is `(deck slug, slide id)`.

## Goals / Non-Goals

**Goals:**

- Keep all build-time logic in one pure TypeScript core that is unit-testable and independent of Vite.
- Make layouts pure content (HTML + CSS). Adding one needs no code.
- Ship a small, framework-free client runtime.
- Have one CSS architecture with explicit cascade ordering.

**Non-Goals:**

- A WYSIWYG editor, a plugin API for third-party directives, or per-deck themes.
- Runtime Markdown rendering in the browser (remark.js style).

## Decisions

### Build-time rendering into static HTML

Each deck compiles to one HTML page that already contains every slide as a `<section>`. The client only toggles visibility.

- *Why:* the output works without JavaScript, can be printed, can be indexed, and can be searched with Ctrl+F. It also works on any static host.
- *Alternative:* render the Markdown client-side like remark.js. Rejected: content is invisible without JS, and render errors are only found by opening each deck.

### Markdown + generic directives, via unified

The pipeline is remark-parse → remark-gfm → remark-directive → our transforms → remark-rehype → rehype-raw → our transforms → Shiki → rehype-stringify.

- *Why:* the generic directive syntax (`:::name[label]{#id .class key=value}`) is a community proposal that agents already know. It gives one consistent extension mechanism instead of remark.js's ad-hoc `.class[...]` macros and `key: value` slide headers. Everything stays an AST, so diagnostics carry source positions.
- *Alternative:* markdown-it with containers. Rejected: weaker typing and no shared mdast/hast tooling.

### Slide declaration as a directive (`::slide{#id layout=x}`)

Every slide starts with a slide directive, and the id is mandatory.

- *Why:* an explicit id is the only identity that survives reordering and heading edits. That matters for deep links and, later, for comments. Derived ids (slugified headings) were rejected because a typo fix would orphan a slide's discussion.
- *Slides are split textually* on `---` lines outside code fences, before parsing. This keeps per-slide line offsets exact and avoids markdown's setext-heading ambiguity.

### Layouts as folders with `<slot>` templates

`layouts/<name>/template.html` is parsed into a hast tree. Slot elements are replaced by the slide's content trees, so no string concatenation of HTML is involved. `style.css` is wrapped at build time as `@layer layouts { @scope (.slide[data-layout="<name>"]) { … } }`.

- *Why `<slot>`:* it is familiar web-component semantics, including fallback content, and it is valid HTML, so templates are easy to edit and to preview.
- *Why `@scope`:* layout authors write plain CSS. `:scope` is the slide, and styles cannot leak into other layouts. Specificity stays low, so utilities can still override.
- *Alternative:* per-layout TypeScript render functions. Rejected because that needs code to add a layout.
- *Alternative:* Handlebars/Nunjucks. Rejected: slots and a handful of escaped variables cover the need without another templating language.

### CSS architecture with cascade layers

The global stylesheet declares `@layer reset, tokens, base, viewer, components, layouts, utilities, print;`. Every rule belongs to exactly one layer, so cascade order never depends on import order or specificity. Design tokens are custom properties, and colours use `light-dark()` driven by `color-scheme`. The theme override sets `data-theme` on `<html>`.

Slide scaling is pure CSS. The stage is a size container, and the slide's width is `min(100cqw, 100cqh * 16 / 9)`. The font size is derived from that width, so every `em`-based rule scales with the slide.

Folders: `styles/` (tokens, reset, base, viewer, components, utilities, print). Layout CSS lives next to its template in `layouts/<name>/`.

### Vite plugin for dev and build

A single Vite plugin (`src/build/vite-plugin.ts`) has three jobs:

1. Expose the virtual module `virtual:layouts.css`, which holds the scoped CSS of all layouts.
2. In dev, serve rendered deck pages and deck assets through middleware, and send a full reload when decks or templates change.
3. In build, render the pages in `generateBundle` and emit them, along with only the referenced assets, next to the hashed client bundle.

- *Why:* there is one pipeline for dev and build, with HMR for CSS.
- *Alternative:* a separate Node build script plus esbuild. Rejected: it duplicates the dev server and asset hashing.

### Shiki at build time with dual themes

Shiki runs with `defaultColor: false`, emitting `--shiki-light`/`--shiki-dark` variables, and the CSS picks between them with `light-dark()`. Theme switching therefore needs no re-render and no runtime highlighter. Unknown languages fall back to `text` and produce a warning.

### Client runtime

The runtime is plain TypeScript modules: `deck` (state and slide switching), `router` (fragment ↔ slide; positional fallback), `keyboard`, `touch`, `controls` (buttons, counter, copy link, progress), `theme` and `announcer` (live region).

- Navigation uses `history.replaceState`.
- Activating an in-deck link uses the browser's native fragment navigation, which pushes a history entry; a `hashchange` listener then syncs the state. This satisfies the Back behaviour in the spec.
- Presentation mode is enabled by adding `data-mode="present"` to the deck root. Without JS the attribute is absent, and the CSS shows the document view.

### Diagnostics as data

The core never throws for content problems. It returns `Diagnostic { severity, file, line?, slideId?, message }`, and the CLI, the Vite overlay and tests all consume the same list. Messages say what to do (e.g. list the available layouts), because agents act on them.

### Node-native TypeScript

The repo runs TypeScript directly on Node ≥ 24 (type stripping), with `erasableSyntaxOnly` and explicit `.ts` import extensions, so the CLI needs no compile step. Type checking is `tsc --noEmit` with separate configs for Node and DOM code. Biome handles linting and formatting, and Vitest handles tests.

### Fit check in a real browser

Whether content fits a 16:9 slide depends on fonts, wrapping and images, and only a layout engine knows. `pnpm check:fit` builds the site, serves it with Vite's preview API and uses `playwright-core` with the **system** Chromium (from `CHROMIUM_PATH` or `PATH`, provided by the Nix dev shell) to measure every slide at 1280×720 and 1024×768. It reports overflow in the usual diagnostic format, so agents migrating decks get the same loop as with `check:decks`. The viewer e2e tests (`pnpm test:e2e`, a separate Vitest project) use the same browser setup.

- *Alternative:* estimate the size statically (count lines). Rejected: it is unreliable for wrapped text, tables and images.
- *Alternative:* Playwright's bundled browsers. Rejected: the download is not reproducible under Nix.

### Lint scope excludes content

Biome lints and formats code only. `biome.json` excludes `**/*.md` (Biome's Markdown formatter rewrites YAML front matter into headings) and `**/*.svg` (draw.io exports with embedded fonts make Biome 2.6 allocate memory without bound). Deck content is validated by `check:decks` and `check:fit` instead.

## Risks / Trade-offs

- [Content written for remark's 4:3 slides may overflow 16:9 slides] → Slide bodies scroll instead of clipping. The migration playbook tells the agent to split dense slides and to use `.smaller`.
- [`@scope` needs recent browsers (Baseline 2025)] → Acceptable for the intended audience. If needed, the wrapper is generated in one place and can switch to CSS nesting.
- [Raw HTML is allowed in slides] → Decks are authored by trusted authors only. Reader content (future comments) will go through a separate, sanitised path.
- [Mandatory ids add authoring friction] → The check suggests an id derived from the heading, so the fix is copy-paste.
- [Browser checks need Chromium] → They are separate commands (`check:fit`, `test:e2e`) outside `pnpm verify`, and the Nix dev shell provides the browser.
- [The CSS minifier transpiles `light-dark()` and merges `@layer` blocks] → Verified that it keeps the layer order and the `data-theme` override, and the e2e theme test guards this.

## Migration Plan

Recreating remark.js decks is a documented agent task (`.agents/skills/migrate-remark-deck/`): fetch the source and assets, rewrite to the new format, then run `pnpm check:decks <slug>` until it is clean. The HTTP deck is migrated as part of this change and serves as the reference example. The old site keeps running until the decks are moved.
