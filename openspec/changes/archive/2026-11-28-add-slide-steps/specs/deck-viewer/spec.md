## MODIFIED Requirements

### Requirement: Keyboard navigation

The viewer SHALL move forward on `→`, `↓`, `Space`, `PageDown` or `n`, and back on `←`, `↑`, `Shift+Space`, `PageUp` or `p`. Moving forward SHALL reveal the slide's next hidden step, or go to the next slide when every step is shown. Moving back SHALL hide the last shown step, or go to the previous slide when no step is shown. `Home` and `End` SHALL go to the first and last slide. Shortcuts SHALL be ignored while focus is in an editable element.

#### Scenario: Next slide
- **WHEN** slide 3, which has no steps, is shown and the user presses `→`
- **THEN** slide 4 is shown

#### Scenario: Bounds
- **WHEN** the last slide is shown with all its steps and the user presses `→`
- **THEN** the last slide remains shown

#### Scenario: Typing in a field
- **WHEN** focus is in a text input and the user presses `n`
- **THEN** the slide does not change

### Requirement: Pointer and touch navigation

The viewer SHALL provide visible previous and next controls, which move back and forward like the keys. A horizontal swipe on touch devices SHALL move forward (swipe left) or back (swipe right).

#### Scenario: Swipe
- **WHEN** the user swipes left on a touch screen on a slide without steps
- **THEN** the next slide is shown

#### Scenario: Next control reveals a step
- **WHEN** the shown slide has a hidden step and the user clicks the next control
- **THEN** the step is revealed and the slide stays

### Requirement: Synchronised windows

The deck window and its presenter window SHALL show the same slide with the same steps revealed: moving to a slide, or revealing or hiding a step, in either SHALL do the same in the other, without any server. Each window's URL SHALL follow its slide. Closing the presenter window SHALL leave the deck window as it is.

#### Scenario: Navigate from the presenter window
- **WHEN** the presenter presses `→` in the presenter window
- **THEN** both windows show the next slide

#### Scenario: Navigate from the deck window
- **WHEN** someone clicks the next control in the deck window
- **THEN** the presenter window moves to the same slide, with its notes

#### Scenario: Reveal from the presenter window
- **WHEN** the current slide has hidden steps and the presenter presses `→` in the presenter window
- **THEN** both windows reveal the slide's next step and stay on the slide

## ADDED Requirements

### Requirement: Steps are hidden on arrival

In presentation mode, a slide's steps SHALL be hidden whenever the slide is arrived at: by moving forward or back, `Home`/`End`, an in-deck link, a deep link, or the other window. A hidden step SHALL keep its space in the slide, so revealing it doesn't move the rest, and SHALL be hidden from assistive technology until revealed.

#### Scenario: Open a deep link
- **WHEN** the reader opens `/http/#cors` and slide `cors` has three steps
- **THEN** slide `cors` is shown with its three steps hidden and the rest of its content in place

#### Scenario: Return to a revealed slide
- **WHEN** every step of slide 5 was revealed, the user moved on to slide 6, and then pressed `←`
- **THEN** slide 5 is shown with all its steps hidden

### Requirement: Revealing steps in order

Moving forward SHALL reveal a slide's steps one at a time, in their numbered order, and only then go to the next slide. Moving back SHALL hide them in reverse order, and only then go to the previous slide.

#### Scenario: Reveal then advance
- **WHEN** slide 4 has two steps, all hidden, and the user presses `→` three times
- **THEN** the first press reveals step 1, the second reveals step 2, and the third shows slide 5

#### Scenario: Hide then go back
- **WHEN** slide 4 shows both its steps and the user presses `←` three times
- **THEN** the first press hides step 2, the second hides step 1, and the third shows slide 3

### Requirement: Steps outside presenting

Every step SHALL be shown in the document view without JavaScript and in print. When the search moves to a slide with a match, every step of that slide SHALL be shown, so the match is visible.

#### Scenario: Print a slide with steps
- **WHEN** the user prints a deck whose slide `cors` has hidden steps on screen
- **THEN** the printed page for `cors` shows all its steps

#### Scenario: Search into a step
- **WHEN** the reader searches for text that is only in a hidden step of slide 9
- **THEN** slide 9 is shown with all its steps, and the match is highlighted

### Requirement: Steps in the presenter window

The presenter window's current slide SHALL show the steps that aren't revealed yet faintly, so the presenter can see what comes next, and its position SHALL include the step when the slide has steps (`12 / 68 · step 1 of 3`, counting revealed steps). The next-slide preview SHALL show that slide as the audience will first see it, with its steps hidden.

#### Scenario: Presenter sees upcoming steps
- **WHEN** slide 12 has three steps, one revealed
- **THEN** the presenter's current slide shows step 1 normally and steps 2 and 3 faintly, and the position reads `12 / 68 · step 1 of 3`

#### Scenario: Next slide preview
- **WHEN** slide 13 has steps and the presenter window shows slide 12
- **THEN** the preview of slide 13 shows its steps hidden
