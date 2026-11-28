## MODIFIED Requirements

### Requirement: TikZ diagram blocks

A fenced code block tagged `tikz` SHALL contain exactly one `tikzpicture` environment and SHALL render as a diagram figure in place of the block. It SHALL NOT render as highlighted code. The block's info string MAY carry `alt="..."`.

#### Scenario: Diagram rendered
- **WHEN** a slide contains a `tikz` block with a `tikzpicture` that draws two connected nodes
- **THEN** the built slide contains a figure showing that drawing, and no code listing

#### Scenario: Not a picture
- **WHEN** a `tikz` block contains text outside a `tikzpicture` environment, or no environment at all
- **THEN** the check reports an error at the block's line saying the block must contain one `tikzpicture`

## ADDED Requirements

### Requirement: Diagram files

Each rendering of a diagram SHALL be published as its own SVG file at `_app/diagrams/<hash>.svg` in the built site, named after a hash of its content. The deck page SHALL refer to those files by relative URL, and SHALL NOT contain the SVG itself. Identical renderings SHALL share one file, across decks too. `dex dev` SHALL serve the same files.

#### Scenario: Built deck with a diagram
- **WHEN** a deck with one diagram is built
- **THEN** the output holds two files under `_app/diagrams/` (light and dark), and the deck's `index.html` refers to both and contains no `<svg>` element for the diagram

#### Scenario: Unchanged diagram keeps its URL
- **WHEN** a deck is built, one paragraph of another slide is edited, and it is built again
- **THEN** the diagram's files have the same names in both builds

#### Scenario: Same diagram twice
- **WHEN** two decks with the same theme contain the same `tikz` block
- **THEN** both deck pages refer to the same two files

#### Scenario: Development server
- **WHEN** a deck with a diagram is opened in `dex dev`
- **THEN** the diagram shows, served from the same `_app/diagrams/` URLs

### Requirement: Diagrams don't delay the first slide

A deck page SHALL show its first slide without waiting for the diagrams of other slides: a diagram's renderings SHALL only be requested when its slide is shown, or by the background loading below. Without JavaScript, a diagram SHALL load when it scrolls into view.

#### Scenario: Open a deck on a slide without diagrams
- **WHEN** a deck with many diagrams opens on a slide that has none
- **THEN** the slide is shown before any diagram rendering has been requested

### Requirement: Diagrams load in the background

Once the first slide is shown, the viewer SHALL load the renderings of every diagram in the background, both modes, starting with the current slide and the slides after it, so that moving to a slide or switching mode doesn't wait for a rendering. Printing SHALL show every diagram, loaded or not.

#### Scenario: Diagrams ready after opening
- **WHEN** a deck page opens and the reader waits a few seconds
- **THEN** both renderings of every diagram have loaded

#### Scenario: Switch mode on a diagram slide
- **WHEN** the reader opens a slide with a diagram and then switches to dark mode
- **THEN** the dark rendering is shown without a new request

#### Scenario: Print right away
- **WHEN** a deck page opens and the reader prints it at once, without visiting the slides with diagrams
- **THEN** every diagram appears on its printed page, in its light rendering
