## ADDED Requirements

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
