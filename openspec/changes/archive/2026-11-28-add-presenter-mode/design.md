# Design

## Context

`compileDeck` turns each slide's mdast into hast, groups top-level content into layout slots, fills the template and returns `RenderedSlide`s; asset and link references are collected from the slides. `renderDeckPage` writes one page per deck. The Vite plugin renders pages on request in dev and emits them in `generateBundle` for builds; `buildSite` (`site.ts`) is called by the CLI. The viewer (`viewer.ts`) shows one slide at a time inside `main.deck[data-mode="present"]`, using container units on `.deck`; layout CSS is scoped to `.slide[data-layout=…]`, and deck layouts to `.deck[data-deck=…] .slide[…]`. The search skips `template` elements. Settings come from front matter (`parseFrontMatter`) and `dex.yaml` (`parseSettings`).

## Goals / Non-Goals

**Goals:**
- Notes that never leak into a build unless the author publishes them.
- A presenter window that works on a plain static host, with no server and no extra page to deploy.

**Non-Goals:**
- Remote control from another device (phone as clicker), which needs a server.
- Notes for individual slots or incremental reveals, notes in print, a notes-only export.
- A configurable presenter layout, or a target duration with warnings.

## Decisions

- **Notes are extracted before slots.** During compilation, a top-level `containerDirective` named `notes` is removed from the slide's tree and compiled on its own (same Markdown pipeline: code highlighting, links) into `RenderedSlide.notes` (hast, or none). This happens before slot grouping, so notes may sit anywhere in the slide, including after a `::slot`, and never reach the layout. A second top-level `notes`, or any `notes` deeper in the tree, is an error with the fix. Links in notes are checked like slide links. Images in notes are allowed; their assets are published only when the notes are.
- **Markup: a `<template>` per slide.** When notes are included, each slide with notes ends with `<template class="slide__notes">…</template>`. A template is inert: never rendered (screen, document view, print), not in the accessibility tree, and already skipped by the search. `main.deck` carries `data-notes="included"` or `data-notes="omitted"`, so the presenter can tell "no notes on this slide" from "notes not published". Alternative: one JSON blob per deck. Rejected: it duplicates the rendering path for the notes' HTML and is harder to keep next to its slide.
- **Who decides inclusion.** Compilation always extracts the notes (so `dex check` validates them everywhere); rendering decides. `renderDeckPage` takes `includeNotes`. The plugin passes `true` in dev, and in builds `options.publishNotes ?? deck.meta.publishNotes ?? settings.publishNotes ?? false`, where `options.publishNotes` comes from `dex build --publish-notes` through `buildSite`. Front matter and `dex.yaml` gain a boolean `publishNotes`, validated like the other keys.
- **The presenter is the same page.** `s` opens `<deck URL>?presenter#<id>` with `window.open` in a window named after the deck (so pressing `s` again focuses it instead of opening another). With `?presenter`, `main.ts` starts the presenter instead of the audience viewer: no second page to build or deploy, the same CSS, theme and mode bootstrap.
- **Presenter layout.** The original `main.deck` is hidden; the presenter builds two stages, current and next, each a `div.deck` with the deck's `data-deck` and `data-mode="present"` (so slide sizing, layout CSS and deck-layout CSS apply unchanged), holding a clone of the slide without its `id` (no duplicate ids for deep links). Beside them: the notes (the template's content, cloned), `12 / 68`, the timer with pause/resume and reset buttons, and the clock. Styles in `styles/viewer/presenter.css`, chrome tokens and `rem` sizes. The presenter has no audience controls, no idle hiding and no search.
- **Synchronisation with `BroadcastChannel`.** Both windows join `dex:<deck slug>`. Whenever a window changes slide for any reason (keys, controls, swipe, links, search), it posts `{ slide: <id> }`; on receiving one, a window goes to that slide without posting back, so there are no echo loops. `BroadcastChannel` works between windows of the same origin in the same browser, which is exactly the presenter setup, on a static host or `dex dev`. Alternative: `window.opener` messaging. Rejected: it breaks if either window reloads.
- **Timer.** Starts at the first slide change seen by the presenter window (so it can be opened before the talk), shows `mm:ss` then `h:mm:ss`, and keeps elapsed time from `performance.now()` so it doesn't drift; pause/resume and reset are buttons (keyboard-operable). The clock shows the local time, `HH:MM`.

## Risks / Trade-offs

- [Notes published by mistake] → private by default; publishing needs an explicit setting or flag, and `dex build` prints which decks' notes it published.
- [Pop-up blockers] → `window.open` runs inside the `s` key handler (a user gesture), which browsers allow; if it is still blocked, the viewer shows a toast saying to allow pop-ups.
- [Cloned slides duplicate SVG ids from diagrams in the presenter window] → the clone of the next slide may share ids with the current one; both are copies of the same deck, so references resolve to equivalent definitions. Checked visually with the diagram fixture.
- [Two deck windows of the same deck in one browser also sync] → acceptable and arguably useful (a mirrored second screen); documented.
