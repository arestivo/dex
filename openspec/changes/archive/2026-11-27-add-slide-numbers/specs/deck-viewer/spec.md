## ADDED Requirements

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

## MODIFIED Requirements

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
