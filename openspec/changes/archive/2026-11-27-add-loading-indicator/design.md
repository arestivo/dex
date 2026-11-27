# Design

## Context

Every page's `<head>` (`htmlDocument` in `src/core/render/html.ts`) already runs one inline script, `MODE_BOOTSTRAP`, before anything renders, to apply the saved light/dark mode. In a build, the stylesheet is a render-blocking `<link>` and the script a deferred module; in `dex dev` there is no `<link>`: Vite injects the CSS when the module imports it. The viewer (`startViewer`) then sets `data-mode="present"`. `trackIdle` (`src/client/idle.ts`) wakes the chrome on `pointermove`, `pointerdown` and `keydown`, and calls `wake()` once at start; CSS hides the progress bar and the controls (unless they contain focus) while `.deck[data-idle]` is set.

## Goals / Non-Goals

**Goals:**
- No flash of unstyled or stacked slides, in dev and in builds, without affecting the no-JavaScript view.
- Chrome that stays out of the way of keyboard presenting.

**Non-Goals:**
- Speeding up loading (code splitting, preloading fonts).
- Waiting for every image or font before revealing: once the styles are in and the viewer has chosen the slide, the slide is shown; fonts swap in as they load, as today.
- Changing how long the controls stay visible (2.5 s) or what they contain.

## Decisions

- **Mark loading from the head, before the body renders.** `MODE_BOOTSTRAP` also sets `data-loading` on `<html>` and starts a fallback timer (5 s) that removes it. Because the attribute is set by script, the no-JavaScript page never has it. Alternative: a `<noscript>` override of a CSS rule that hides content. Rejected: it hides content whenever the script is slow to *run*, including in browsers where scripts are allowed but fail, unless a fallback exists anyway, and it is more markup.
- **Inline critical style.** A short `<style>` in the head, next to the script, does the hiding and draws the indicator. It must work before the main stylesheet exists (dev), so it doesn't depend on Dex's tokens: `:root[data-loading] body { visibility: hidden }`, `color-scheme: light dark` (and the explicit `data-color-mode` override), so the canvas follows the mode; the indicator is `:root[data-loading]::after`: a ring in `currentColor` at low opacity with one arc in `var(--color-accent, currentColor)`, so it takes the theme's accent once the stylesheet is there. It fades in after 300 ms (`animation-delay`), so fast loads never draw it, and `prefers-reduced-motion: reduce` turns the spin off. `visibility` (not `display`) keeps the layout computed, so revealing causes no reflow.
- **Reveal when ready.** `main.ts` removes `data-loading` after the stylesheet imports have run and, on deck pages, after `startViewer` returns (so the right slide is already chosen and the deck is in presentation mode). Other pages (index, error page) reveal right after the imports.
- **Pointer-only wake.** `trackIdle` listens to `pointermove` and `pointerdown` only, and starts idle (no `wake()` at start). A `pointermove` whose position equals the last one seen is ignored: Chromium sends such events after layout changes under a still cursor, which a slide change is. Touch counts as pointer activity (`pointerdown`), so touch users can still bring up the controls. Focused controls stay visible through the existing `:focus-within` rule.

## Risks / Trade-offs

- [A reader on a slow connection sees a blank page for up to 300 ms, then a spinner] → better than unstyled or stacked slides; the fallback timer caps it at 5 s if the script never arrives.
- [The 5 s fallback reveals the document view while a very slow script is still coming] → the viewer then starts normally and switches to presentation mode; this only happens on very slow connections.
- [First-time readers don't see the controls until they move the mouse] → the user asked for this; moving the mouse or tapping shows them, and the keyboard shortcuts work regardless.
