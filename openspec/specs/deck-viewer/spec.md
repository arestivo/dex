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

### Requirement: Light and dark themes

The viewer SHALL follow the operating system's colour scheme by default. It SHALL provide a toggle (control and the `d` key) that overrides the scheme, and the override SHALL persist across visits.

#### Scenario: System preference
- **WHEN** the OS prefers dark mode and no override is stored
- **THEN** the deck renders in the dark theme

#### Scenario: Persisted override
- **WHEN** the user toggles to light and reloads the page
- **THEN** the deck renders in the light theme

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
