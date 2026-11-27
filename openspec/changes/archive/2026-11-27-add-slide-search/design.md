# Design

## Context

The viewer (`src/client/viewer.ts`) shows one slide at a time by hiding the others (`display: none`), which is why the browser's find can't reach them. Its chrome (`chrome.ts`) is plain DOM created at start-up, styled in the `viewer` layer with the `--chrome-*` tokens. Keys go through `keyboard.ts`, whose `actionForKey` ignores any key with a modifier and whose listener skips editable targets. Slides are static after the build: their text never changes while the page is open.

## Goals / Non-Goals

**Goals:**
- Search that behaves like the browser's find, across all slides, without changing the slide markup.
- Highlights that follow theme and mode through tokens, and are covered by the contrast check.

**Non-Goals:**
- Searching across decks, regular expressions, whole-word or case-sensitive options.
- Searching text inside diagrams (they are pre-rendered SVG paths, without text) or `alt` text.
- A search button in the controls or a touch gesture. The bar has its own buttons once open.
- Search in document mode (no JavaScript): the browser's find already works there.

## Decisions

- **Highlights with the CSS Custom Highlight API**, not `<mark>` elements. The viewer registers two highlights, `dex-search` (every match) and `dex-search-current`, made of `Range`s. CSS styles them with `::highlight(dex-search)` using the new tokens. The slide DOM is never changed, so there is no layout shift, no clash with authors' own `<mark>` or with Shiki's spans, and closing just clears the highlights. Alternative: wrapping matches in `<mark>`. Rejected: it changes the DOM (and can split Shiki tokens), so cleanup is fragile. Browsers without the API (none of the current engines: Chromium 105+, Safari 17.2+, Firefox 140+) still get the bar, the count and the navigation, just without highlights.
- **A text index per slide, built once.** When the bar first opens, the viewer walks each slide's text nodes, skipping `svg`, `script`, `style` and visually hidden text. It builds one searchable string per slide, normalised character by character (NFD, combining marks removed, lower-cased), with a map from each normalised position back to `(text node, offset)`. Text nodes in different block elements are joined with a separator that no query can match, so `pre` at the end of one paragraph and `flight` at the start of the next don't match. Text nodes in the same block are joined as they are, so a match can cross inline formatting. Matching and normalising are pure functions in `src/client/search.ts`, tested without a browser. The DOM walk is a thin layer on top.
- **Search on each `input` event**, with no debounce: a deck has at most a few hundred slides of short text. The matches are listed in deck order (slide, then position). The current match is the first one on or after the shown slide.
- **Keys.** A pure `searchKeyAction(event, { open, inField })` maps keys to `open | next | previous | close`. `Ctrl+F` / `Cmd+F` (no Alt; with or without Shift ignored) is handled in all states, and its default is prevented. `F3` / `Shift+F3` and `Esc` are handled only while the bar is open; `Enter` / `Shift+Enter` only in the field. A closed bar lets every other key reach the browser and the navigation shortcuts as before. The search listener runs before the navigation listener and marks the events it handles, so navigation never sees them.
- **Changing slide.** The search calls the viewer's `go(index)`, the same path as the arrow keys, so the URL fragment and the progress bar follow. Slide changes from the search are not announced separately: the search's own live region announces `3 of 12, slide 7: <title>` instead, so the two announcements don't overwrite each other.
- **Closing.** `Esc` clears both highlights, hides the bar (keeping its text for the next `Ctrl+F`), and moves focus to the deck. The last match's slide stays shown.
- **Tokens.** `--color-search-match`, `--color-search-current` and `--color-search-text` go in `tokens.css` with `light-dark()` values distinct from `--color-highlight` (used for `<mark>`), so a slide's own marks can't be mistaken for matches. Their `color-` prefix makes them themeable with no extra code, and `roles.ts` describes them for `dex docs themes`. The contrast check gains two pairs: `color-search-text` on `color-search-match`, and on `color-search-current`. The default values must clear 4.5:1 in both modes. No built-in theme sets them, so every built-in theme stays clean.
- **Visibility and print.** The bar is `.viewer-search`, fixed at the top right, below the progress bar, in the `viewer` layer. It is excluded from idle hiding. The print layer hides it, and the viewer clears the highlights on `beforeprint` and restores them on `afterprint`, because `::highlight()` styles can't be reliably overridden for print in every engine.

## Risks / Trade-offs

- [Overriding `Ctrl+F` hides the browser's find in presentation mode] → it couldn't find hidden slides anyway, and the bar does the same job. Document mode (no JavaScript) is untouched.
- [Normalisation maps one source character to several normalised ones (e.g. `ß` → `ss` with case folding)] → lower-casing only, without full case folding; `toLowerCase` keeps most characters one-to-one, and the index map handles the rest by mapping each normalised character to its source character.
- [A match inside text that overflows a slide's visible area can't be seen] → the slide still shows; `dex fit` already keeps decks free of overflow.
