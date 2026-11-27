# deck-viewer Specification

## Purpose
Defines how a built deck behaves in the browser: presenting one slide at a time, addressing each slide by a stable deep link, and remaining readable without JavaScript and when printed.

## Requirements

### Requirement: Presentation mode

With JavaScript enabled, the viewer SHALL show exactly one slide at a time, scaled to fit the viewport at a fixed aspect ratio (16:9) without distortion.

#### Scenario: One slide visible
- **WHEN** a deck page loads
- **THEN** exactly one slide is visible and fills the largest 16:9 area that fits the viewport

#### Scenario: Window resize
- **WHEN** the browser window is resized
- **THEN** the slide rescales, keeping the aspect ratio and the relative text size

### Requirement: Keyboard navigation

The viewer SHALL move to the next slide on `→`, `↓`, `Space`, `PageDown` or `n`, and to the previous slide on `←`, `↑`, `Shift+Space`, `PageUp` or `p`. `Home` and `End` SHALL go to the first and last slide. Shortcuts SHALL be ignored while focus is in an editable element.

#### Scenario: Next slide
- **WHEN** slide 3 is shown and the user presses `→`
- **THEN** slide 4 is shown

#### Scenario: Bounds
- **WHEN** the last slide is shown and the user presses `→`
- **THEN** the last slide remains shown

#### Scenario: Typing in a field
- **WHEN** focus is in a text input and the user presses `n`
- **THEN** the slide does not change

### Requirement: Pointer and touch navigation

The viewer SHALL provide visible previous and next controls. A horizontal swipe on touch devices SHALL go to the next slide (swipe left) or the previous slide (swipe right).

#### Scenario: Swipe
- **WHEN** the user swipes left on a touch screen
- **THEN** the next slide is shown

### Requirement: Deep links

Each slide SHALL be addressable at `<deck-url>#<slide-id>`. Opening that URL SHALL show that slide. Navigating SHALL update the URL fragment to the current slide's id without adding a history entry per slide. Following an in-deck link SHALL add a history entry, so that Back returns to the previous slide.

#### Scenario: Open a deep link
- **WHEN** the user opens `/http/#cors-preflight`
- **THEN** the slide with id `cors-preflight` is shown

#### Scenario: URL follows navigation
- **WHEN** the user moves from slide `uri` to the next slide `urn`
- **THEN** the URL fragment becomes `#urn` and the history length is unchanged

#### Scenario: Back after following a link
- **WHEN** the user follows the link `#headers` on the index slide and then presses the browser's Back button
- **THEN** the index slide is shown again

#### Scenario: Unknown fragment
- **WHEN** the user opens `/http/#does-not-exist`
- **THEN** the first slide is shown

### Requirement: Positional fallback links

A fragment that is a positive integer `#n` SHALL show the n-th slide (1-based), for compatibility with remark.js links. The URL SHALL then be rewritten to that slide's id.

#### Scenario: Legacy numeric link
- **WHEN** the user opens `/http/#5`
- **THEN** the fifth slide is shown and the fragment is replaced by that slide's id

### Requirement: Copy slide link

The viewer SHALL provide a control that copies the absolute deep link of the current slide to the clipboard and confirms that the copy happened.

#### Scenario: Copy link
- **WHEN** the user activates the copy-link control on slide `urn` of deck `http`
- **THEN** the clipboard contains the deck's absolute URL ending in `#urn` and a confirmation is shown

### Requirement: Progress indication

The viewer SHALL show the current slide number and the total (e.g. `12 / 67`) and a progress bar proportional to the position.

#### Scenario: Counter
- **WHEN** slide 12 of 67 is shown
- **THEN** the counter reads `12 / 67`

### Requirement: Light and dark modes

The viewer SHALL follow the operating system's colour scheme by default. It SHALL provide a toggle (control and the `d` key) that switches between light and dark mode, and the choice SHALL persist across visits. A choice saved by earlier versions of the viewer SHALL be kept. The mode is independent of the deck's colour theme.

#### Scenario: System preference
- **WHEN** the OS prefers dark mode and no choice is stored
- **THEN** the deck renders in dark mode

#### Scenario: Persisted override
- **WHEN** the user toggles to light mode and reloads the page
- **THEN** the deck renders in light mode

#### Scenario: Choice saved by an earlier version
- **WHEN** the browser holds a light/dark choice saved before the rename
- **THEN** the deck renders in that mode and the choice is kept from then on

#### Scenario: Toggle labelled as mode
- **WHEN** a reader focuses the light/dark control
- **THEN** its accessible name speaks of dark mode, not of a theme

### Requirement: Accessibility

Each slide SHALL be exposed as a labelled region (`Slide n of N: <heading>`). Slide changes SHALL be announced to assistive technology. All controls SHALL be keyboard-operable and have accessible names. Transitions SHALL respect `prefers-reduced-motion`.

#### Scenario: Screen reader announcement
- **WHEN** the user moves to slide 4 titled "History"
- **THEN** a polite live region announces "Slide 4 of 67: History"

### Requirement: No-JavaScript fallback

Without JavaScript, the deck page SHALL show all slides in order as a scrollable document, and fragment links SHALL scroll to the slide with that id.

#### Scenario: JavaScript disabled
- **WHEN** the deck page loads with JavaScript disabled
- **THEN** all slides are visible in order and `#headers` scrolls to the slide `headers`

### Requirement: Print layout

Printing a deck SHALL produce one slide per page, in order, at the slide aspect ratio, with no viewer controls.

#### Scenario: Print to PDF
- **WHEN** the user prints the deck page
- **THEN** each slide occupies its own page and no navigation controls appear

### Requirement: Deck index page

The site root SHALL list every deck with its title and subtitle, ordered by title, each linking to the deck.

#### Scenario: Two decks
- **WHEN** decks `http` and `git` exist
- **THEN** the root page lists both with links to `/git/` and `/http/`

### Requirement: Bundled typeface

Slides SHALL use the typeface bundled with Dex (Fira Sans for text, Fira Mono for code) regardless of the fonts installed on the reader's device, and diagrams SHALL be typeset in the same typeface by default.

#### Scenario: No local fonts
- **WHEN** a deck is opened on a device without Fira Sans installed
- **THEN** slide text renders in Fira Sans, loaded from the built site

#### Scenario: Diagram labels match
- **WHEN** a slide shows a diagram next to body text
- **THEN** the diagram's labels and the body text are set in the same typeface

### Requirement: Open the search bar

In presentation mode, `Ctrl+F` (`Cmd+F` on macOS) SHALL open a search bar in the top-right corner of the deck and focus its field, instead of the browser's find. When the bar is already open, it SHALL focus the field and select its text. The bar SHALL stay visible while it is open, even when the viewer chrome hides because the reader is idle.

#### Scenario: Open with Ctrl+F
- **WHEN** a deck is shown and the user presses `Ctrl+F`
- **THEN** a search bar appears in the top-right corner with its field focused, and the browser's find does not open

#### Scenario: Ctrl+F again
- **WHEN** the search bar is open with the text `cors` and focus is on the slide, and the user presses `Ctrl+F`
- **THEN** the field is focused with `cors` selected

### Requirement: Search as you type

Each change to the search text SHALL search the text of every slide in the deck, ignoring case and accents, and SHALL highlight every match. The current match SHALL be the first one on or after the shown slide, and the viewer SHALL show its slide. Text in pre-rendered diagrams is not searchable. An empty field SHALL remove the highlights.

#### Scenario: Match on a later slide
- **WHEN** slide 2 is shown and the user types `preflight`, which first appears on slide 7
- **THEN** slide 7 is shown with `preflight` highlighted as the current match

#### Scenario: Case and accents
- **WHEN** a slide contains `Função` and the user types `funcao`
- **THEN** `Função` is a match

#### Scenario: Match across formatting
- **WHEN** a slide contains `**pre**flight` and the user types `preflight`
- **THEN** the whole word is one highlighted match

### Requirement: Move between matches

While the search bar is open, `F3` and `Enter` SHALL make the next match current and `Shift+F3` and `Shift+Enter` the previous one, showing its slide. Moving past the last match SHALL wrap to the first, and before the first to the last. `F3` and `Shift+F3` SHALL work wherever the focus is; `Enter` and `Shift+Enter` while the field is focused.

#### Scenario: Next match on the same slide
- **WHEN** the current match is the first of two on slide 7 and the user presses `F3`
- **THEN** the second match on slide 7 becomes current

#### Scenario: Wrap around
- **WHEN** the current match is the last one in the deck and the user presses `Enter` in the field
- **THEN** the first match becomes current and its slide is shown

#### Scenario: Previous match
- **WHEN** the current match is on slide 7, the previous one is on slide 3, and the user presses `Shift+F3`
- **THEN** slide 3 is shown with that match current

### Requirement: Match count

The search bar SHALL show the position of the current match and the number of matches (`3 of 12`), or `No matches` when there are none, and SHALL announce the same to assistive technology. The field and its buttons SHALL have accessible names.

#### Scenario: Count
- **WHEN** the search text has 12 matches and the third is current
- **THEN** the bar shows `3 of 12`

#### Scenario: Nothing found
- **WHEN** the user types `zzzz`, which appears on no slide
- **THEN** the bar shows `No matches`, no text is highlighted and the slide does not change

### Requirement: Close the search bar

`Esc` SHALL close the search bar and remove every highlight. The slide shown SHALL stay shown, and focus SHALL return to the deck so the navigation keys work again.

#### Scenario: Escape
- **WHEN** the search bar is open with matches highlighted on slide 7 and the user presses `Esc`
- **THEN** the bar is gone, nothing is highlighted, slide 7 is still shown and `→` shows slide 8

### Requirement: Search follows the theme and mode

The search bar SHALL use the viewer chrome colours, and match highlights SHALL use the colour tokens `--color-search-match` (every match), `--color-search-current` (the current match) and `--color-search-text` (the text of a match), so both follow the deck's theme and the light/dark mode. Highlights SHALL never print.

#### Scenario: Dark mode
- **WHEN** a search has matches and the user toggles dark mode
- **THEN** the bar and the highlights switch to their dark colours

#### Scenario: Themed deck
- **WHEN** a deck's theme sets `--color-search-current`
- **THEN** the current match uses that colour

#### Scenario: Printing during a search
- **WHEN** the user prints while matches are highlighted
- **THEN** the printed slides show no highlights and no search bar
