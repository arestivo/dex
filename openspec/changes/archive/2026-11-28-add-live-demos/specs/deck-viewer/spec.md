## ADDED Requirements

### Requirement: Demos everywhere the slide is shown

A demo's result SHALL be part of the deck page, with no separate file or request. It SHALL render without JavaScript, in print, and in both stages of the presenter window. It SHALL inherit the slide's text size, light/dark mode and theme colours.

#### Scenario: Without JavaScript
- **WHEN** a deck page with a demo loads with JavaScript disabled
- **THEN** the demo's result is rendered

#### Scenario: Print
- **WHEN** the reader prints a deck with a demo, without visiting its slide
- **THEN** the printed page shows the demo's result

#### Scenario: Presenter window
- **WHEN** the presenter window shows a slide with a demo as the current or the next slide
- **THEN** the demo's result is rendered there too

#### Scenario: Dark mode
- **WHEN** a demo's CSS uses `light-dark(black, white)` for its text and the reader switches to dark mode
- **THEN** the result's text turns white

### Requirement: Search matches demo code once

The search SHALL match a demo's code blocks, and SHALL NOT match the text of its rendered result.

#### Scenario: Text in both code and result
- **WHEN** a demo's HTML is `<p>Fox</p>` and the reader searches for "Fox"
- **THEN** the search counts one match on that slide, in the code
