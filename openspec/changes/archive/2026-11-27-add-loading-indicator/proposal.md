# Proposal

## Why

While a deck page loads, readers see the slides before the viewer is ready: with `dex dev` the page is unstyled until the script injects the stylesheet, and in a built site every slide is shown stacked as a document until the viewer switches to presentation mode. Separately, the viewer's controls and progress bar wake up on every key press, so presenting with the keyboard keeps flashing the control box over the slide.

## What Changes

- **Loading indicator.** Until the viewer (or, on other pages, the page script) is ready, pages that load the Dex script hide their content and show a spinning indicator in the centre of the window, on a background matching the reader's light/dark mode. The indicator appears only if loading takes more than a moment, so fast loads show no spinner. With reduced motion, it doesn't spin.
- **Never stuck, and nothing changes without JavaScript.** The page is revealed after a few seconds even if the script never runs (a failed download or a script error). Without JavaScript nothing is hidden: the no-JavaScript document view is unchanged. Print is unaffected.
- **Controls follow the mouse.** The control box and progress bar appear only when the pointer moves or touches the screen, not when the reader presses keys. They no longer appear when the page loads. Keyboard users still reach them: focusing a control with `Tab` shows them, as today.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `deck-viewer`: a loading indicator until the page is ready; the controls appear on pointer activity only.

## Impact

- `src/core/render/html.ts` (a small inline script and style in `<head>` that mark the page as loading and draw the indicator), `src/client/main.ts` and `viewer.ts` (reveal when ready), `src/client/idle.ts` (pointer-only wake, ignoring pointer events without movement).
- Tests: render tests for the head markup, e2e tests for the indicator (slow script, no JavaScript, failed script) and for the controls (keys don't show them, moving the mouse does).
