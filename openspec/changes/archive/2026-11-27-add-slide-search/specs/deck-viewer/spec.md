## ADDED Requirements

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
