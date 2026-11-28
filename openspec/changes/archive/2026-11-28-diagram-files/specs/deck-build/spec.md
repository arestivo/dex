## MODIFIED Requirements

### Requirement: Build command

`dex build` (in the engine repository: `pnpm build`) SHALL validate all decks and, if no errors are found, write a static site to the output folder. It SHALL fail without writing a partial site when any deck has errors.

#### Scenario: Successful build
- **WHEN** the user runs `dex build` and all decks are valid
- **THEN** the output folder contains `index.html`, one `<slug>/index.html` per deck, each deck's assets under `<slug>/assets/`, the diagram renderings under `_app/diagrams/`, and the shared script and stylesheet

#### Scenario: Build with errors
- **WHEN** a deck has an error
- **THEN** the build exits non-zero and prints the diagnostics

## ADDED Requirements

### Requirement: Browser checks wait for images

`dex fit` and `dex shot` SHALL wait until every image of the deck page, diagrams included, has loaded before they measure or capture a slide.

#### Scenario: Diagram measured
- **WHEN** a slide's diagram makes its content too tall and the user runs `dex fit`
- **THEN** the slide is reported as not fitting

#### Scenario: Diagram captured
- **WHEN** the user runs `dex shot <slug> <id>` for a slide with a diagram
- **THEN** both images show the diagram, in the rendering of their mode
