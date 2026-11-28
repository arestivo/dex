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

Each change to the search text SHALL search the text of every slide in the deck, ignoring case and accents, and SHALL highlight every match. The current match SHALL be the first one on or after the shown slide, and the viewer SHALL show its slide. Text in pre-rendered diagrams and slide numbers are not searchable. An empty field SHALL remove the highlights.

#### Scenario: Match on a later slide
- **WHEN** slide 2 is shown and the user types `preflight`, which first appears on slide 7
- **THEN** slide 7 is shown with `preflight` highlighted as the current match

#### Scenario: Case and accents
- **WHEN** a slide contains `Função` and the user types `funcao`
- **THEN** `Função` is a match

#### Scenario: Match across formatting
- **WHEN** a slide contains `**pre**flight` and the user types `preflight`
- **THEN** the whole word is one highlighted match

#### Scenario: Slide numbers are not matched
- **WHEN** the deck has 12 slides, only slide 3 contains `12` in its text, and the user types `12`
- **THEN** there is exactly one match, on slide 3

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

### Requirement: Slide numbers

Every slide SHALL show its position and the number of slides (`12 / 68`) in its bottom-right corner, inside the slide, unless its layout hides it. The number SHALL be part of the built page: it SHALL appear in presentation mode, in the no-JavaScript document view and in print, and scale with the slide. Assistive technology SHALL not read it, because each slide is already labelled with its position.

#### Scenario: Presentation mode
- **WHEN** slide 12 of a 68-slide deck is shown
- **THEN** `12 / 68` appears in the slide's bottom-right corner

#### Scenario: Printed
- **WHEN** the user prints the deck
- **THEN** each printed slide shows its number, except those whose layout hides it

#### Scenario: Without JavaScript
- **WHEN** the deck page loads with JavaScript disabled
- **THEN** every slide in the document shows its number

#### Scenario: Screen reader
- **WHEN** a screen reader reads slide 12
- **THEN** it announces "Slide 12 of 68" once, without reading `12 / 68`

### Requirement: Loading indicator

With JavaScript enabled, a page SHALL hide its content until its script has applied the styles and, on deck pages, the viewer is ready. While hidden, it SHALL show a loading indicator in the centre of the window, on a background that follows the light/dark mode. The indicator SHALL appear only after a short delay, and SHALL not spin when the reader prefers reduced motion. The content SHALL be revealed after a few seconds even if the script never runs. Without JavaScript, nothing SHALL be hidden.

#### Scenario: Slow load
- **WHEN** a deck page's script takes two seconds to load
- **THEN** a loading indicator is shown in the centre, no slide or unstyled text is visible, and once the viewer is ready exactly one slide is shown

#### Scenario: Fast load
- **WHEN** the page's script is ready within the delay
- **THEN** no loading indicator is ever drawn

#### Scenario: Script fails
- **WHEN** the page's script can't be loaded
- **THEN** after a few seconds the content is shown as a document, as without JavaScript

#### Scenario: Without JavaScript
- **WHEN** the deck page loads with JavaScript disabled
- **THEN** no indicator appears and every slide is shown as a document straight away

#### Scenario: Dark mode
- **WHEN** the reader's mode is dark and the page is loading
- **THEN** the background behind the indicator is dark

### Requirement: Controls appear on pointer activity

In presentation mode, the controls and the progress bar SHALL appear when the pointer moves over the page or touches it, and hide again after a few seconds without pointer activity. Pressing keys SHALL NOT show them, and they SHALL be hidden when the deck opens. A pointer event without movement (such as one the browser sends when the page changes under a still mouse) SHALL NOT show them. Keyboard focus on a control SHALL keep the controls visible.

#### Scenario: Keyboard navigation
- **WHEN** the controls are hidden and the reader presses `→` several times
- **THEN** the slides change and the controls stay hidden

#### Scenario: Mouse moves
- **WHEN** the controls are hidden and the reader moves the mouse
- **THEN** the controls and the progress bar appear, and hide again after a few seconds without movement

#### Scenario: Deck opens
- **WHEN** a deck page finishes loading and the mouse hasn't moved
- **THEN** the controls are hidden

#### Scenario: Tab to a control
- **WHEN** the reader presses `Tab` until a control has focus
- **THEN** the controls are visible while it has focus

### Requirement: Presenter window

In presentation mode, pressing `s` SHALL open a presenter window for the same deck. It SHALL show the current slide, the next slide (or that this is the last slide), the current slide's speaker notes, the position (`12 / 68`), a timer and the current time, in the deck's theme and the reader's light/dark mode. When a slide has no notes it SHALL say so, and when the deck's notes aren't published it SHALL say that instead. The navigation keys SHALL work in the presenter window as in the deck.

#### Scenario: Open the presenter window
- **WHEN** slide 12 is shown and the presenter presses `s`
- **THEN** a new window shows slide 12, a preview of slide 13, slide 12's notes, `12 / 68`, the timer and the clock

#### Scenario: Last slide
- **WHEN** the presenter window shows the last slide
- **THEN** the next-slide area says it is the end of the deck

#### Scenario: Notes not published
- **WHEN** the deck was built without its notes and the presenter opens the presenter window
- **THEN** the notes area says that speaker notes aren't published for this deck

### Requirement: Synchronised windows

The deck window and its presenter window SHALL show the same slide: moving to a slide in either SHALL move the other, without any server. Each window's URL SHALL follow its slide. Closing the presenter window SHALL leave the deck window as it is.

#### Scenario: Navigate from the presenter window
- **WHEN** the presenter presses `→` in the presenter window
- **THEN** both windows show the next slide

#### Scenario: Navigate from the deck window
- **WHEN** someone clicks the next control in the deck window
- **THEN** the presenter window moves to the same slide, with its notes

### Requirement: Presenter timer

The presenter window's timer SHALL show the elapsed time since it started (`mm:ss`, then `h:mm:ss`). It SHALL start at the first slide change after the presenter window opens, and SHALL have controls to pause and resume it and to reset it to zero.

#### Scenario: Timer starts with the talk
- **WHEN** the presenter window has just opened
- **THEN** the timer shows `00:00` and doesn't run until the first slide change

#### Scenario: Pause
- **WHEN** the timer shows `05:12` and the presenter pauses it
- **THEN** it stays at `05:12` until it is resumed
