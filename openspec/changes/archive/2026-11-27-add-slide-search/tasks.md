# Tasks

## 1. Search colours

- [x] 1.1 Add `--color-search-match`, `--color-search-current` and `--color-search-text` to `styles/tokens.css` (light and dark, distinct from `--color-highlight`), describe them in `src/core/themes/roles.ts`, and add the two pairs to `CONTRAST_PAIRS` in `src/core/themes/contrast.ts`. Verify with unit tests in `tests/core/theme-contrast.test.ts`: the defaults clear 4.5:1 in both modes, every built-in theme has no contrast warnings, and a theme with an unreadable `--color-search-current` gets the warning. Check that `dex docs themes` lists the new tokens.

## 2. Matching

- [x] 2.1 Add `src/client/search.ts` with pure functions: normalise text (NFD, combining marks removed, lower case) with a map back to source positions, and find every match of a query in a list of slide texts, in deck order. Verify with unit tests in `tests/client/search.test.ts`: case and accents ignored (`funcao` matches `Função`), several matches per slide, an empty query matches nothing, matches map back to the right source offsets.
- [x] 2.2 Add the DOM layer: build each slide's searchable text from its text nodes (skipping `svg`, `script`, `style` and visually hidden text, separating block elements) and turn matches into `Range`s. Verify with happy-dom unit tests: a match crosses inline formatting (`**pre**flight`), doesn't cross two paragraphs, and skips diagram SVG.

## 3. Keys

- [x] 3.1 Add a pure `searchKeyAction` (open, next, previous, close) for `Ctrl+F`/`Cmd+F`, `F3`/`Shift+F3`, `Enter`/`Shift+Enter` in the field and `Esc`, depending on whether the bar is open and the field is focused. Verify with unit tests in `tests/client/keyboard.test.ts`, including that `F3` and `Esc` do nothing while the bar is closed and that navigation keys still map as before.

## 4. Search bar

- [x] 4.1 Build the search bar (`.viewer-search`: a labelled search field, the count, previous/next and close buttons, a polite live region) and wire it into `viewer.ts`: open and focus on `Ctrl+F`, search on input, highlight with `CSS.highlights` (`dex-search`, `dex-search-current`), move between matches through `go()`, show `3 of 12` or `No matches`, close on `Esc` and return focus to the deck. Style it in `styles/viewer/search.css` (in the `viewer` layer, imported from `styles/index.css`) with the chrome tokens and the new search tokens, keep it visible while idle, hide it in print and clear highlights around printing. Verify with e2e tests in `tests/e2e/viewer.test.ts` for each scenario of the deck-viewer spec (add the text they need to the viewer fixture deck): `Ctrl+F` opens and focuses, the browser's find isn't triggered, typing jumps to the first match, `F3`/`Shift+F3`/`Enter` move and wrap, the count and `No matches`, `Esc` closes and clears the highlights and `→` works again, the highlights use the theme's and mode's colours, and print media hides the bar.
- [x] 4.2 Document the search keys in the README's viewer shortcuts. Verify that the table lists `Ctrl+F`, `F3`/`Shift+F3`, `Enter`/`Shift+Enter` and `Esc`.

## 5. Integration

- [x] 5.1 Run `pnpm verify` and `pnpm test:e2e` inside `nix develop` (under the memory cap), `openspec validate add-slide-search --strict`, and `dex check` and `dex fit` on the local `http` deck. Look at a search in the `http` deck in light and dark mode, and in a themed deck, with a screenshot of each.
