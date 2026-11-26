# Design

## Context

Layouts are loaded by `loadLayouts(root, layoutsDir)` (`src/core/layouts/load.ts`) from a single folder: the engine's `layouts/`, chosen through `WorkspaceOptions.layoutsDir` (default `LAYOUTS_DIR`). Three places call it:

- `compileWorkspace` (`dex check`, `dex build`);
- the Vite plugin, for the `virtual:layouts.css` module and for dev page rendering;
- implicitly, everything that reads `layout.slots`.

`dex docs layouts` prints the static `docs/layouts.md`, whose "Available layouts" table is kept in sync by a unit test. See proposal.md for the motivation.

## Goals / Non-Goals

**Goals:**

- Local layouts behave exactly like built-in ones (templates, slots, variables, scoped CSS, diagnostics), so docs and agents don't need two mental models.
- A layout's documentation lives next to it (`layout.md`), and the layouts reference is generated from what actually exists.

**Non-Goals:**

- Overriding built-in layouts, inheritance between layouts, or folder-wide CSS.
- Validating that `layout.md`'s example actually renders (it is prose for agents).

## Decisions

### Layout sources, in one ordered list

`loadLayouts` becomes `loadLayoutSet(root, sources)`, where `sources` is an ordered list of `{ dir, origin: 'built-in' | 'local' }`. Built-in comes first. Each `Layout` gains `origin`, `description` (from `layout.md` front matter, `''` if none) and `notes` (the `layout.md` body, `undefined` if there is no file).

- **Collision:** when a local folder has a built-in's name, the loader reports an error at that local template and keeps the built-in. Reporting it at the local file tells the author what to rename.
- **`WorkspaceOptions`** gains `localLayoutsDir` (default `<root>/layouts`). `layoutsDir` keeps meaning "the built-in layouts" (tests inject fixtures through it). A missing local folder is normal and produces no diagnostic.
- **Diagnostics** keep using paths relative to the content folder, so local layout problems read `layouts/quote/template.html …`.

- *Alternative:* merge local layouts into the deck compilation per deck. Rejected: layouts are folder-wide, and loading them once matches how the CSS is bundled.

### `layout.md` format

```markdown
---
description: A large centred quotation with its source.
---

## When to use
…
## Slots
…
## Example
```

Only `description` is read from the front matter; unknown keys are ignored, so the format can grow later. The body is free Markdown. The diagnostics are warnings, never errors: a missing `layout.md`, or a missing or empty `description`. Undocumented layouts must still work. Slots are always computed from the template and never read from `layout.md`, so the docs can't contradict the engine.

### Generated `dex docs layouts`

`src/cli/docs.ts` topics become functions `(content) => string`. `authoring` still returns `docs/authoring.md` as-is. `layouts` renders:

1. a heading and an intro;
2. a table `Layout | Origin | Description | Slots`;
3. one `### <name>` section per layout with its notes (or "_No layout.md: undocumented._");
4. the engine's `docs/layouts.md`, which becomes only the guide to making layouts. Its "Available layouts" table is removed, and the guide says local layouts go in the content folder's `layouts/` (built-in ones are an engine change).

`dex docs layouts` therefore honours `--folder`. The drift test for the hand-written table is replaced by a test that every built-in layout has a `layout.md` with a description.

### Vite plugin: two layout folders

The plugin's workspace now has both folders:

- `virtual:layouts.css` concatenates built-in and local layout CSS (names are unique, so every `@scope` selector stays distinct) and watches every `style.css`.
- `hotUpdate` treats a change in either folder the same way: `style.css` invalidates the virtual CSS module (HMR, no reload), and anything else (templates, `layout.md`, added or removed folders) sends a full reload.
- `configureServer` adds the local layouts folder to the watcher, as it already does for the decks folder, because it may be outside the engine root.

### `dex new layout <name>`

`src/cli/new.ts` with `runNew(content, kind, name)`. Only `kind = layout` exists for now, and other kinds produce a usage error. It validates the name pattern, refuses built-in names and existing `layouts/<name>/`, then writes three files from templates in `scaffold/layout/`:

- `template.html`: a header with the `title` slot and a body with the default slot, plus a comment listing the slots;
- `style.css`: commented examples using `:scope` and design tokens (`--color-*`, `--space-*`);
- `layout.md`: `description: ""` (so `dex check` warns until it is filled in) and the three sections.

The templates live in `scaffold/` so authors and agents can read them.

### Agent material

- New skill `scaffold/skills/author-layout/SKILL.md`. It covers when a layout is justified (a pattern repeated across slides, not a one-off), `dex new layout`, writing the template (slots, the title-slot convention, BEM class names), styling with tokens in both themes, writing `layout.md` (description, when to use, slots, example), and verifying with `dex check`, `dex fit` and `dex dev` in both themes.
- `scaffold/AGENTS.block.md` gains `layouts/<name>/` in the folder layout, `dex new layout` in the commands, and `dex docs layouts` in the format section. Existing content folders get this through `dex init`, which `dex check` already prompts for when the block changes.
- `author-deck` and `migrate-remark-deck` no longer say "layouts belong to the engine". They point to local layouts instead.

## Risks / Trade-offs

- [Local layouts can make a folder's decks look different from other folders'] → Intended. The built-in names stay stable because collisions are errors.
- [A local layout's CSS can still affect elements globally through selectors that escape `@scope`, e.g. `:root`] → Same trust model as raw HTML in decks: content authors are trusted. The docs tell authors to style only inside the slide.
- [Generated docs depend on the folder, so `dex docs layouts` differs between folders] → Intended. The topic's intro says the list is for this folder.
- [Watching an external layouts folder] → Same mechanism as the decks folder, already tested.

## Migration Plan

1. Add `layout.md` to the five built-in layouts (content moved from the `docs/layouts.md` table and `docs/authoring.md`).
2. Existing content folders run `dex init` (prompted by `dex check`) to get the new skill and instructions. Local layouts need no migration.
