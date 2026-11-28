# Design

## Context

- **Keys.** `src/client/keyboard.ts` maps keys to `Action`s with a pure `actionForKey`. The viewer and the presenter each map actions to functions. The search has its own `searchKeyAction`, consulted first.
- **Controls.** `chrome.ts` builds the controls bar (previous, counter, next, copy link, mode).
- **Sync.** `sync.ts` posts `{ slide, step }` on a BroadcastChannel and never re-posts what it received.
- **Layers.** Viewer chrome is in the `viewer` layer, and print rules in `print`.

See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- One source of truth for the shortcuts: the handler and the help read the same table.
- The presenter controls the audience's screen from the presenter window.

**Non-Goals:**
- **Making the other window fullscreen.** Browsers require a user gesture in the window that goes fullscreen.
- **Separate black and white screens** (PowerPoint's `b` and `w`): the blank screen always uses the slides' background, so it suits the deck in either mode.
- **Remappable keys.**
- **Touch gestures** for these actions.

## Decisions

### One shortcut table

`keyboard.ts` exports a `SHORTCUTS` list of `{ keys: string[], action: Action, label: string, windows: ('deck' | 'presenter')[] }`.
- `actionForKey` is derived from it. Its existing tests stay as they are, and they guard the refactor.
- `help.ts` renders the same list, filtered by window, plus the entries that aren't single keys and so can't come from the handler table: `Ctrl+F` search, and `F3`/`Enter` in the search bar.
- The presenter window's timer and clock buttons are listed as controls, not keys.

### Blank screen is state in the viewer, shared through sync

- **The state:** `blank.ts` keeps a boolean and sets `data-blank` on the deck element. CSS in the viewer layer paints a full-window layer in the slides' background colour (`--color-bg`, so it follows the theme and the mode) over the slide and hides the controls, including when they wake on pointer movement. The slide underneath keeps changing as you navigate, so turning the screen back on shows the current slide.
- **Sync:** the message becomes `{ slide, step, blank }`, and a window follows all three. A missing `blank` means `false`, so the e2e tests can still post older messages.
- **In the presenter window:** the keys don't blank its own view. They toggle the shared state, and show a "Screen is blank" badge in the presenter bar.
- **`Esc`:** search's `Esc` is handled first, when the bar is open. Otherwise `Esc` closes the help when it's open, then ends the blank screen.

### Fullscreen per window

`f` calls `document.documentElement.requestFullscreen()`, or `exitFullscreen()` when the page is already fullscreen.
- **The button:** added to the controls with a fullscreen icon in `icons.ts`. It's hidden when `document.fullscreenEnabled` is false. Its label follows the state ("Enter fullscreen" / "Exit fullscreen"), updated on `fullscreenchange`.
- **Failures:** a rejected promise (the browser refused) shows a toast ("Fullscreen isn't available here").

### The help is a `<dialog>`

`help.ts` builds a `<dialog class="viewer-help">` the first time it's opened, and shows it with `showModal()`. That gives:
- focus trapping and the dialog role;
- `Esc` closing it, natively;
- the backdrop: a click on the dialog element outside its content closes it.

While it is open, the slide keys are ignored, because focus is inside a modal. The styles use the theme tokens, so it follows the theme and mode. `print.css` hides it.

## Risks / Trade-offs

- **`h` and `?` were free keys,** but browser extensions (such as Vimium) may also use them. → The keys are only handled outside editable fields, and `?` needs Shift on most layouts. That is acceptable.
- **Fullscreen differs between browsers,** and iPhone Safari doesn't allow it for pages. → The button is hidden where it isn't available. The e2e tests check that the request is made, since headless Chromium can grant fullscreen.
- **The blank screen doesn't survive a reload.** It is not stored, so a reload shows the slide, which is the safe default for an audience.
