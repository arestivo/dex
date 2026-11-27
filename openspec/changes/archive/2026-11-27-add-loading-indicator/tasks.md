# Tasks

## 1. Loading indicator

- [x] 1.1 In `src/core/render/html.ts`, make the head script set `data-loading` on `<html>` with a 5 s fallback that removes it, and add the inline style that hides the body and draws the delayed, mode-aware indicator (no spin with reduced motion). Verify with render tests: every page with the script carries the style, and the bootstrap still applies the saved mode (the existing mode tests pass).
- [x] 1.2 Remove `data-loading` in `src/client/main.ts` after the stylesheet imports and, on deck pages, after `startViewer`. Verify with e2e tests: a deck page whose script is delayed (route interception) shows the indicator and no slide, then exactly one slide; a page whose script fails to load is revealed as a document after the fallback; with JavaScript disabled nothing is hidden; in dark mode the loading background is dark.

## 2. Controls

- [x] 2.1 Make `trackIdle` wake only on pointer movement and touch, ignore `pointermove` without a change of position, and start idle. Verify with e2e tests: the controls are hidden after load, pressing `→` keeps them hidden, moving the mouse shows them and they hide again after the idle delay, and tabbing to a control shows them. Update the idle test used by the search bar if needed.

## 3. Integration

- [x] 3.1 Run `pnpm verify` and `pnpm test:e2e` inside `nix develop` (under the memory cap) and `openspec validate add-loading-indicator --strict`. Look at a deck loading with `dex dev` and with a built site (throttled), in light and dark mode.
