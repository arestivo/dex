# Proposal

## Why

Slides carry no visible number. The viewer's counter (bottom right of the window) only exists on screen, while the presentation is running, and never prints, so printed handouts and PDFs have no way to say "slide 12". Audiences also use the number to ask about a slide. The remark.js decks being migrated showed one on every slide.

## What Changes

- Every slide shows its number and the deck's total (`12 / 68`) in its bottom-right corner, inside the slide. The number is part of the built page, so it appears in presentation mode, in the no-JavaScript document view and in print, and it scales with the slide.
- It uses the slide's own text colour at 70% opacity, so it is readable on any background (section slides, dark local layouts) and follows the theme and the light/dark mode. Slides using the `title` layout don't show it.
- Layouts decide: a layout's `style.css` can hide or restyle the number (`.slide__number`). The layout guide, the `dex new layout` starter and the `author-layout` skill say how.
- Screen readers don't read it twice: each slide is already announced as "Slide 12 of 68".
- The in-deck search skips the number, so searching `12` finds slide text, not every slide number containing 12.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `deck-viewer`: slides show their number on screen, without JavaScript and in print; the search doesn't match slide numbers.
- `slide-layouts`: layouts can hide or restyle the slide number, and the `title` layout hides it.

## Impact

- `src/core/compile.ts` (the number element added to each slide), `styles/components/slide.css` (its placement and colour), `layouts/title/style.css`.
- `src/client/search.ts` (skip the number).
- Docs: `docs/layouts.md`, `scaffold/layout/style.css`, `scaffold/skills/author-layout/SKILL.md`, `docs/authoring.md` if it describes slide output.
- Tests: render tests, search unit tests, e2e tests (screen, no-JS, print). `dex fit` must stay clean on real decks: the number sits in the slide's bottom padding.
