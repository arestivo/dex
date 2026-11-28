## ADDED Requirements

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
