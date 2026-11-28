# Proposal

## Why

Presenting a Dex deck today means looking at the same slide as the audience, with no notes, no preview of what comes next and no timer. remark.js decks being migrated had speaker notes (`???`) and a presenter view; the migration currently drops the notes. Dex needs speaker notes and a presenter window, and the notes must stay private unless the author decides to publish them, because a static site exposes everything it contains.

## What Changes

- **Speaker notes.** A slide can hold one `:::notes` block of Markdown. Notes never appear on the slide, in the document view, in print or in the search.
- **Private by default.** `dex dev` always includes the notes. `dex build` leaves them out of the built site unless the deck's front matter or `dex.yaml` says `publishNotes: true`, or the build runs with `dex build --publish-notes`. A deck can keep its notes private with `publishNotes: false` even when the folder publishes.
- **Presenter window.** Pressing `s` opens a second window of the same deck: the current slide, the next slide, the current slide's notes, an elapsed-time timer (pause, reset) and the clock, plus "12 / 68". It follows the deck's theme and the light/dark mode. Without notes it says so ("No notes for this slide", or "Speaker notes aren't published for this deck").
- **Synchronised windows.** Moving to a slide in either window moves the other, with no server: the windows talk through the browser, so presenter mode works on the published static site and with `dex dev`.
- **Migration and authoring.** `migrate-remark-deck` turns remark's `???` notes into `:::notes` instead of dropping them; the authoring reference, the agent instructions and the README document notes, publishing and the `s` key.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `deck-format`: the `:::notes` directive; the `publishNotes` front matter key.
- `deck-build`: notes are left out of builds unless published (front matter, `dex.yaml`, `--publish-notes`); `publishNotes` in `dex.yaml`.
- `deck-viewer`: the presenter window, window synchronisation, the timer.

## Impact

- Core: `src/core/markdown/directives.ts` / `compile.ts` (extract notes per slide, check them), `src/core/parse/front-matter.ts` and `src/core/settings.ts` (`publishNotes`), `src/core/render/` (notes markup, or none when private), `src/core/model.ts`.
- Build: `src/build/vite-plugin.ts` and `src/build/site.ts` (include notes in dev, decide per deck in builds), `src/cli/main.ts` (`--publish-notes`, only with `build`).
- Viewer: new presenter and sync modules in `src/client/`, `keyboard.ts` (`s`), styles in `styles/viewer/`.
- Docs and scaffold: `docs/authoring.md`, `scaffold/AGENTS.block.md`, `scaffold/skills/author-deck` and `migrate-remark-deck`, README shortcuts.
- Tests: notes parsing and stripping (core, CLI), presenter and sync (e2e with two pages).
