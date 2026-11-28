# Tasks

## 1. Shortcut table

- [x] 1.1 Add `SHORTCUTS` to `keyboard.ts` (keys, action, label, windows). Derive `actionForKey` from it, and add the actions `fullscreen` (`f`), `blank` (`b`, `.`) and `help` (`?`, `h`). Verify that the existing keyboard unit tests pass unchanged, and that new tests cover the added keys and that every action has a label.

## 2. Fullscreen

- [x] 2.1 Add the `f` action and a fullscreen button in `chrome.ts`. The button has an icon, a state label and the `fullscreenchange` update, and is hidden when fullscreen isn't enabled. A refused request shows a toast. Wire it in `viewer.ts` and `presenter.ts`. Verify with e2e tests: `f` makes `document.fullscreenElement` set and then unset; with `fullscreenEnabled` forced false (init script), the button is hidden.

## 3. Blank screen

- [x] 3.1 Add `blank.ts` and the styles. `data-blank` on the deck shows a full-window layer in the slides' background colour (`--color-bg`, so it follows the theme and the mode), with the controls hidden even on pointer movement. `b`, `.` and `Esc` toggle it, and navigation keeps working underneath. Verify with e2e tests for "Blank and back" and "Leave with Esc".
- [x] 3.2 Extend `sync.ts` to `{ slide, step, blank }`, with a missing value meaning false. In the presenter, the keys toggle the shared state and show the "Screen is blank" badge. Verify with an e2e test: `b` in the presenter window blanks the deck window and shows the badge; `b` again restores both.

## 4. Help overlay

- [x] 4.1 Add `help.ts`: a modal `<dialog>` that lists `SHORTCUTS` for its window, plus the search keys, and the presenter's controls in the presenter window. `?` and `h` toggle it; `Esc` and a click outside close it. Style it in `styles/viewer/` with the theme tokens, and hide it in `print.css`. Verify with e2e tests:
  - the list in the deck window;
  - the list in the presenter window, which includes the timer;
  - `Esc` closes it and the slide keys work again;
  - a backdrop click closes it;
  - dark mode colours;
  - it isn't printed.

## 5. Docs and integration

- [x] 5.1 Add `f`, `b`/`.` and `?`/`h` to the README's shortcut table. Verify the table matches `SHORTCUTS`.
- [x] 5.2 Run `pnpm verify` and `pnpm test:e2e` inside `nix develop`, under the memory cap. Both must pass. Run `openspec validate add-presenting-keys --strict`.
- [x] 5.3 Screenshot the help overlay in light and dark mode, and the presenter window with the "Screen is blank" badge, and look at them.

## Workflow follow-up

- Archive the change, then commit and push when the user asks.
