# Proposal

## Why

In presentation mode only the current slide is displayed, so the browser's own find (Ctrl+F) can't reach text on other slides. Authors and readers coming from the remark.js setup relied on an in-deck search to jump to the slide that mentions something, and Dex has none.

## What Changes

- **Search bar.** `Ctrl+F` (`Cmd+F` on macOS) opens a search bar in the top-right corner of the deck and focuses it, instead of the browser's find. When the bar is already open, it focuses the field again and selects its text.
- **Search as you type.** Each keystroke searches every slide of the deck, case- and accent-insensitively (`funcao` finds `função`). Every match is highlighted. The first match at or after the current slide becomes the current match, and the viewer shows its slide.
- **Moving between matches.** `F3` or `Enter` goes to the next match and `Shift+F3` or `Shift+Enter` to the previous one, wrapping at the ends and changing slide when needed. `F3` works while the bar is open, wherever the focus is. The current match has its own highlight colour. The bar shows "3 of 12", or "No matches", and screen readers hear the same.
- **Closing.** `Esc` closes the bar and removes every highlight. The slide of the last match stays shown, and focus returns to the deck.
- **Theme and mode.** The bar uses the viewer chrome colours. The highlights use new colour tokens (`--color-search-match`, `--color-search-current`, `--color-search-text`), so they follow light/dark mode and themes can set them. The theme contrast check covers them.
- Without JavaScript nothing changes: every slide is on the page, so the browser's find already works. Highlights never print.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `deck-viewer`: in-deck search (opening and closing the bar, matching, highlighting, moving between matches, accessibility).
- `deck-themes`: the readable-colours check also covers search highlights on their text.

## Impact

- New `src/client/search.ts` (matching: pure, unit-tested) and a search bar in the viewer chrome (`src/client/chrome.ts` or its own module); `src/client/keyboard.ts` and `viewer.ts` wire the keys.
- `styles/tokens.css` (three tokens), `styles/viewer/` (the bar and the `::highlight()` rules), `styles/print.css`.
- `src/core/themes/contrast.ts` and `roles.ts` (new pairs and token descriptions); `dex docs themes` lists the new tokens automatically.
- Docs: the README's viewer shortcuts, `docs/themes.md` if it lists token groups.
- Tests: unit tests for matching and keys, e2e tests in `tests/e2e/viewer.test.ts`.
