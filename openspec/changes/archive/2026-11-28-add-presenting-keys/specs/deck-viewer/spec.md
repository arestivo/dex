## MODIFIED Requirements

### Requirement: Synchronised windows

The deck window and its presenter window SHALL show the same slide with the same steps revealed, and SHALL share whether the screen is blank: moving to a slide, revealing or hiding a step, or blanking the screen or bringing it back, in either SHALL do the same in the other, without any server. Each window's URL SHALL follow its slide. Closing the presenter window SHALL leave the deck window as it is.

#### Scenario: Navigate from the presenter window
- **WHEN** the presenter presses `→` in the presenter window
- **THEN** both windows show the next slide

#### Scenario: Navigate from the deck window
- **WHEN** someone clicks the next control in the deck window
- **THEN** the presenter window moves to the same slide, with its notes

#### Scenario: Reveal from the presenter window
- **WHEN** the current slide has hidden steps and the presenter presses `→` in the presenter window
- **THEN** both windows reveal the slide's next step and stay on the slide

#### Scenario: Blank screen from the presenter window
- **WHEN** the presenter presses `b` in the presenter window
- **THEN** the deck window is blanked, and the presenter window says the screen is blank

## ADDED Requirements

### Requirement: Fullscreen

Pressing `f` in the deck window or the presenter window SHALL toggle fullscreen for that window. The deck's controls SHALL include a fullscreen button that does the same. When the browser can't make the page fullscreen, the button SHALL be hidden and `f` SHALL do nothing.

#### Scenario: Enter and leave fullscreen
- **WHEN** the reader presses `f` in the deck window, and then `f` again
- **THEN** the page goes fullscreen, and then leaves fullscreen

#### Scenario: Fullscreen not available
- **WHEN** the browser doesn't support making the page fullscreen
- **THEN** the controls show no fullscreen button

### Requirement: Blank screen

Pressing `b` or `.` SHALL blank the deck window: it SHALL fill with the slides' background colour for the deck's theme and the current light/dark mode, hiding the slide and the controls. Pressing `b`, `.` or `Esc` again SHALL show the slide again. Navigation SHALL keep working while the screen is blank, without showing the slide. In the presenter window, the keys SHALL blank the deck window, and the presenter window SHALL keep its view and say that the screen is blank.

#### Scenario: Blank and back
- **WHEN** the reader presses `b` on slide 5, then `→`, then `b` again
- **THEN** the screen is blank, stays blank while moving, and then shows slide 6

#### Scenario: Follows the theme and mode
- **WHEN** the screen is blank and the reader switches between light and dark mode
- **THEN** the window shows the slides' background colour of the deck's theme in each mode

#### Scenario: Leave with Esc
- **WHEN** the screen is blank and the reader presses `Esc`
- **THEN** the slide is shown again

### Requirement: Shortcut help

Pressing `?` or `h` SHALL open an overlay listing every keyboard shortcut of the window it is opened in, with what each does. `?`, `h`, `Esc` or a click outside the list SHALL close it. The overlay SHALL follow the theme and the light/dark mode, SHALL be announced to assistive technology as a dialog, and SHALL never be printed.

#### Scenario: Help in the deck window
- **WHEN** the reader presses `?` in the deck window
- **THEN** an overlay lists the navigation keys, `d`, `s`, `f`, `b`, `Ctrl+F` and `?`, each with what it does

#### Scenario: Help in the presenter window
- **WHEN** the presenter presses `?` in the presenter window
- **THEN** the overlay also lists the presenter window's own controls, such as the timer

#### Scenario: Close the help
- **WHEN** the help is open and the reader presses `Esc`
- **THEN** the overlay closes and the slide keys work again
