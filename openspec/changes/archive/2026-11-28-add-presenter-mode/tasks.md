# Tasks

## 1. Notes in the deck format

- [x] 1.1 Add `publishNotes` (boolean) to the front matter keys and to `dex.yaml` settings, with type errors. Verify with unit tests in `tests/core/front-matter.test.ts` and `tests/core/settings.test.ts`.
- [x] 1.2 Extract top-level `:::notes` blocks in `compileDeck` before slot grouping, compile them to hast on `RenderedSlide.notes`, check their links, and report a second notes block or a nested one with a fix. Verify with unit tests: notes after a `::slot`, Markdown and code in notes, the two errors, and that slide HTML never contains the notes.

## 2. Publishing

- [x] 2.1 Make `renderDeckPage` take `includeNotes`: emit `<template class="slide__notes">` per slide with notes and `data-notes="included|omitted"` on `main.deck`; publish assets referenced only by notes only when they are included. Verify with render tests for both cases.
- [x] 2.2 Decide inclusion in the Vite plugin (always in dev; in builds `--publish-notes`, then front matter, then `dex.yaml`, then private), add `--publish-notes` to `dex build` (rejected by other commands, listed in `--help`), and print which decks' notes a build published. Verify with CLI tests on a fixture with notes: default build has no note text anywhere in `dist/`; front matter, `dex.yaml`, `publishNotes: false` and the flag behave as specified.

## 3. Presenter window

- [x] 3.1 Add `s` to the keyboard actions and open `?presenter#<id>` in a named window from the viewer (toast if blocked). With `?presenter`, start the presenter view instead of the audience viewer: current and next stages with cloned slides (without ids), notes or the "no notes"/"not published" messages, `n / N`, the clock. Style it in `styles/viewer/presenter.css`. Verify with unit tests for the key and e2e tests: `s` opens the window, it shows the current and next slides and the notes, the last slide says it's the end, an omitted-notes deck says so, and the navigation keys work in it.
- [x] 3.2 Add the timer (starts at the first slide change, pause/resume, reset, `mm:ss` then `h:mm:ss`). Verify with unit tests for the formatting and state, and an e2e test that it stays at `00:00` until the first change and stops while paused.

## 4. Synchronisation

- [x] 4.1 Post every slide change on `BroadcastChannel('dex:<slug>')` and follow incoming ones without echoing, in both the viewer and the presenter. Verify with e2e tests using two pages of one browser context: navigating in either moves the other (keys, controls), URLs follow, and closing the presenter leaves the deck window unchanged.

## 5. Docs and migration

- [x] 5.1 Document notes, `publishNotes`, `--publish-notes` and presenter mode in `docs/authoring.md`, the README (shortcuts, `dex build --publish-notes`), `scaffold/AGENTS.block.md` (notes are private by default; don't publish them unless asked) and `scaffold/skills/author-deck`; make `migrate-remark-deck` convert `???` notes to `:::notes`. Verify with `dex docs`, the scaffold tests and the docs tests.

## 6. Integration

- [x] 6.1 Run `pnpm verify` and `pnpm test:e2e` inside `nix develop` (under the memory cap) and `openspec validate add-presenter-mode --strict`; `dex check` and `dex fit` on the local `http` deck. Look at the presenter window (light and dark, a themed deck, a slide with a diagram) and present a few slides with both windows open.
