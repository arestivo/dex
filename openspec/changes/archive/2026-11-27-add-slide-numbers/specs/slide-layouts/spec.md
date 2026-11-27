## ADDED Requirements

### Requirement: Layouts control the slide number

The slide number SHALL be an element with the class `slide__number`, added to every slide after the layout's template, so a layout's `style.css` can hide or restyle it like any other element of its slides. By default it SHALL use the slide's text colour at 70% opacity, so it follows each layout's text colour. The built-in `title` layout SHALL hide it.

#### Scenario: Title slide
- **WHEN** a slide uses the `title` layout
- **THEN** no slide number is visible on it, on screen or in print

#### Scenario: Section slide
- **WHEN** a slide uses the `section` layout, whose text is light on a dark background
- **THEN** its number is shown in that light text colour, at 70% opacity

#### Scenario: Local layout hides the number
- **WHEN** a local layout's `style.css` contains `.slide__number { display: none; }`
- **THEN** slides using that layout show no number, and other slides still do
