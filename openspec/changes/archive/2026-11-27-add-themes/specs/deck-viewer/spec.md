## RENAMED Requirements

- FROM: `### Requirement: Light and dark themes`
- TO: `### Requirement: Light and dark modes`

## MODIFIED Requirements

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
