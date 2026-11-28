# Proposal

## Why

Presenters often want to reveal a slide bit by bit: one bullet, then the next, then the answer. Dex shows every slide all at once. remark.js decks being migrated used `--` incremental slides for this, and the migration currently merges them into one slide and loses the reveal.

## What Changes

- **Steps.** Parts of a slide can be marked as steps:
  - `:::step` … `:::` around blocks;
  - `:step[text]` around part of a line;
  - `:::steps` around a list, where each item of the list is its own step.

  Steps count in the order they appear in the slide's source, wherever their slot puts them. A step inside another step is an error, and so is a step in speaker notes. A `:::steps` block must hold exactly one list.
- **Revealing.** When a slide opens, its steps are hidden. They keep their place, so the slide's layout doesn't move as they appear.
  - **Next** (keys, control, swipe) reveals the next hidden step. The slide only advances once every step is shown.
  - **Previous** hides the last shown step. It goes to the previous slide only when none of the steps are shown.
  - Arriving at a slide in any way (next, previous, Home/End, a link, a deep link, the other window) shows it with all its steps hidden.
- **Everything is shown elsewhere.** The document view without JavaScript, print, `dex fit` and `dex shot` show every step. Search shows every step of the slide it lands on, so the match is visible.
- **Presenter window.** The two windows stay on the same step as well as the same slide. The presenter's current slide shows the steps that aren't revealed yet faintly, so the presenter knows what's coming. Its position shows the step (`12 / 68 · step 2 of 3`).
- **Migration and authoring.** `migrate-remark-deck` turns remark's `--` increments into steps instead of merging them away. The authoring reference and the `author-deck` skill document steps. The agent instructions that `dex init` writes say when to use steps (only when asked, or when the source deck had them) and that `dex shot`/`dex fit` show every step.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `deck-format`: the `:::step`, `:step[…]` and `:::steps` directives and their errors.
- `deck-viewer`: revealing steps with next/previous, hidden steps on arrival, steps in no-JS/print/search, steps in the presenter window and in synchronisation.
- `deck-build`: `dex fit` and `dex shot` measure and capture slides with every step shown.

## Impact

- **Core:** `src/core/markdown/directives.ts` (the step directives, checks and build-time numbering in source order), `src/core/compile.ts`, and how notes reject steps.
- **Viewer:** `src/client/viewer.ts` (step state in next/previous and on arrival), `presenter.ts`, `sync.ts` (the message carries the step), the search landing in `search-bar.ts`, and styles in `styles/viewer/` and `styles/print.css`.
- **CLI:** `src/cli/fit.ts` and `src/cli/shot.ts` show every step before measuring or capturing.
- **Docs and scaffold:** `docs/authoring.md`, `scaffold/AGENTS.block.md`, `scaffold/skills/author-deck`, `scaffold/skills/migrate-remark-deck`.
- **Tests:**
  - core tests for parsing, numbering and errors;
  - client tests for the step logic;
  - e2e tests for keys, arrival, presenter sync, print and no-JS.
