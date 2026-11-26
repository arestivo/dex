# Proposal

## Why

The existing slides run on remark.js. Remark addresses slides by position (`#12`), so a deep link breaks whenever a slide is inserted. It also has no notion of a slide as a durable thing that readers can discuss. We need our own slide engine where every slide has a stable identity, so deep links keep working and per-slide discussion (a later change) has something to attach to.

## What Changes

- New deck source format: Markdown with YAML front matter. It uses `---` slide separators and generic directives (`::slide{#id layout=...}`, `:::info`, `::slot{name=...}`, `::toc`). Each deck lives in its own folder with its assets.
- Every slide has an explicit, unique, URL-safe id that the build enforces.
- File-based layouts: each layout is a folder (`layouts/<name>/`) with an HTML template that uses `<slot>` placeholders, plus an optional stylesheet that is automatically scoped to that layout. Adding a layout requires no code changes.
- A static build that turns every deck into a self-contained HTML page plus a deck index. The output can be hosted on any static web server (e.g. GitHub Pages).
- A browser viewer with keyboard and touch navigation, deep links (`/<deck>/#<slide-id>`), a copy-link control, light and dark themes, and a print layout. Without JavaScript, the page falls back to a readable list of all slides.
- A `check:decks` command that validates decks and reports precise, actionable diagnostics, so humans and agents can iterate on deck sources.
- A `check:fit` command that opens every slide in a headless browser and reports content that does not fit the slide.
- An agent playbook for recreating existing remark.js decks in the new format. Migration is done by an agent following documented rules, not by an automatic converter.

## Capabilities

### New Capabilities

- `deck-format`: The deck source format: folder structure, front matter, slide separation, slide attributes and identity, content directives and assets.
- `slide-layouts`: File-based layouts: discovery, templates with slots and variables, and per-layout scoped styles.
- `deck-viewer`: The in-browser presentation experience: navigation, deep linking, theming, accessibility, no-JS and print rendering.
- `deck-build`: The build, dev server and check commands: output structure, asset handling and diagnostics.

### Modified Capabilities

_None. This is the first change in the project._

## Out of Scope

- Per-slide discussion or comments. Slide ids are designed to support them, and a follow-up change will specify them.
- Automatic remark.js to new-format conversion.
- Speaker notes, incremental reveals, presenter view and slide search.

## Impact

- New TypeScript project (Node ≥ 24, pnpm, Nix dev shell with Chromium) with Vite for bundling and the dev server, unified/remark/rehype for Markdown and Shiki for build-time syntax highlighting.
- New top-level folders: `decks/` (content), `layouts/` (layouts), `src/` (engine), `styles/` (global CSS), `docs/` (authoring guide).
- The HTTP deck is recreated as the reference deck.
