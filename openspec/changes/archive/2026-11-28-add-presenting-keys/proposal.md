# Proposal

## Why

While presenting, three things are missing that remark.js and slide software have:
- **Fullscreen**, without reaching for the browser's own menu or F11. On the projector the browser's tabs and address bar take space from the slide.
- **A blank screen**, to pause the audience's attention for a discussion or a demo on another screen, without leaving the slide.
- **A help overlay** listing the shortcuts. Today the keys are only documented in the README, which neither the audience nor a guest presenter will read.

## What Changes

- **`f`: fullscreen.**
  - Toggles fullscreen for the window it's pressed in, deck or presenter window. Browsers only allow that window to change itself.
  - The deck's controls get a matching fullscreen button.
  - Where the browser can't go fullscreen (some phones), the button is hidden and the key does nothing.
- **`b` or `.`: blank screen.**
  - Blanks the deck window: it fills with the slides' background colour, which follows the deck's theme and the light/dark mode (white in light mode and a dark background in dark mode, with the default theme). `b`, `.` or `Esc` brings the slide back.
  - Pressed in the presenter window, it blanks the deck window. The presenter keeps their view, with a "Screen is blank" notice.
  - Navigation keeps working underneath, so the presenter can move on while the audience sees nothing. The screen stays blank until it is turned back on.
- **`?` or `h`: shortcut help.**
  - An overlay lists every shortcut of the window it's opened in: the deck window's keys, and the presenter window's, which include the timer.
  - `?`, `h`, `Esc`, or a click outside it, closes it.
  - It follows the theme and light/dark mode, and is never printed.
  - The list is built from the same table the keyboard handler uses, so it can't drift from the real keys.
- **Synchronised windows** share the blank state, as they share the slide and the step.
- **Docs:** the README's shortcut table gains the three keys.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `deck-viewer`: fullscreen, the blank screen and the shortcut help; synchronised windows also share the blank state.

## Impact

- **Viewer:**
  - `src/client/keyboard.ts`: new actions, and one shortcut table for both the handler and the help;
  - `src/client/chrome.ts`: the fullscreen button;
  - new `src/client/blank.ts` and `src/client/help.ts`;
  - `viewer.ts` and `presenter.ts`;
  - `sync.ts`: the message carries the blank state.
- **Styles:** `styles/viewer/` gets the blank screen and the help overlay; `styles/print.css` hides both.
- **Docs:** the README.
- **Tests:**
  - unit tests for the key table and the help list;
  - e2e tests for each key in both windows, blank screen sync, help contents and closing, and print.
