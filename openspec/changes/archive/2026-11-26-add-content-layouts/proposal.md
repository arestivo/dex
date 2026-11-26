# Proposal

## Why

Authors (and the agents working for them) can only use the five layouts built into the engine. When a pattern recurs across their decks, such as a quote slide, a comparison or an exercise, they have to either bend an existing layout with utility classes or change the engine. Content folders should be able to define their own layouts. Agents should also be told what each layout is for, not just that it exists.

## What Changes

- Content folders can define **local layouts** in `<folder>/layouts/<name>/`, with the same structure as the engine's: `template.html` (slots, variables) and an optional `style.css` (automatically scoped). They are available to every deck in that folder.
- A local layout may not reuse a built-in layout's name. That is an error for now.
- Every layout, built-in or local, can have a **`layout.md`**: front matter with a one-line `description`, then usage notes and an example for people and agents. The engine's five layouts get one. `dex check` warns when a layout has no `layout.md` or no description.
- **`dex docs layouts` is generated** for the current folder. It lists every available layout (built-in and local) with its description, its slots (read from the template) and its usage notes, followed by the guide to making layouts. This replaces the hand-maintained table.
- **`dex new layout <name>`** creates a starter local layout (`template.html`, `style.css`, `layout.md`) that already passes `dex check`.
- `dex dev` reloads on local layout changes and hot-swaps their CSS. `dex build` bundles their CSS.
- `dex init` installs a new **`author-layout`** skill. The managed `AGENTS.md` block mentions local layouts and `dex new layout`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `slide-layouts`: layouts come from the engine and from the content folder. Names must not collide with built-in ones. Layouts carry usage notes. `dex new layout` scaffolds one.
- `authoring-reference`: the `layouts` topic is generated from the layouts available in the content folder.
- `content-folder-setup`: the agent instructions and skills cover local layouts (`author-layout`).
- `deck-build`: the `dex` command gains `new`. The content folder provides local layouts, and the dev server watches them.

## Out of Scope

- Overriding or extending built-in layouts from a content folder (a possible later change).
- Folder-wide themes or global CSS in content folders.
- Sharing layouts between content folders other than by copying them.

## Impact

- `src/core/layouts/load.ts` (several sources, origin, `layout.md`), `src/core/workspace.ts`, `src/build/vite-plugin.ts` (virtual CSS and watching both folders), `src/cli/docs.ts` (generated topic), new `src/cli/new.ts`, `src/cli/main.ts`.
- `layouts/*/layout.md` for the five built-in layouts. `docs/layouts.md` becomes the "making layouts" guide only.
- `scaffold/skills/author-layout/`, `scaffold/AGENTS.block.md`.
- Tests: layout loading with collisions and missing notes, generated docs, `dex new layout`, dev and build with a local layout (e2e fixture gets one).
