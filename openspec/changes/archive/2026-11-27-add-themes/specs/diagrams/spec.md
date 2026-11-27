## RENAMED Requirements

- FROM: `### Requirement: Diagrams follow the theme`
- TO: `### Requirement: Diagrams follow the mode`

## MODIFIED Requirements

### Requirement: Slide colours in diagrams

Every diagram SHALL be compiled with the slide palette defined as TikZ colours: `DexInk`, `DexMuted`, `DexPaper`, `DexSurface`, `DexBorder`, `DexAccent`, `DexAccentSoft`, `DexInverse`, `DexInverseText`, and the callout tones with their soft variants. It SHALL also define a TeX conditional `\ifDexDark` that is true only in the dark rendering. The colours SHALL take the values of the deck's theme in the rendering's mode.

#### Scenario: Palette colours
- **WHEN** a block fills a node with `DexAccentSoft` and draws it with `DexAccent`
- **THEN** both renderings use the accent colours of their mode

#### Scenario: Own colours per theme
- **WHEN** a preamble defines `Navy` differently inside `\ifDexDark ... \else ... \fi`
- **THEN** each rendering uses its own definition of `Navy`

#### Scenario: Deck theme
- **WHEN** a deck with `theme: forest` has a diagram using `DexAccent`
- **THEN** its renderings use `forest`'s light and dark accent

### Requirement: Diagrams follow the mode

Each diagram SHALL be rendered once with the light palette and once with the dark palette, and the viewer SHALL show the rendering that matches the current mode, including a mode chosen with the viewer's toggle. Printing SHALL use the light rendering.

#### Scenario: Dark theme
- **WHEN** a deck is viewed in dark mode
- **THEN** every diagram shows its dark rendering, and switching to light mode shows the light rendering without reloading

#### Scenario: Mixed colours
- **WHEN** a diagram fills a node with a tint of the slide colours such as `DexAccent!30!DexPaper`
- **THEN** the tint is computed from the light palette in the light rendering and from the dark palette in the dark one

### Requirement: Rendering cache

Rendered diagrams SHALL be cached in the content folder under `.dex/cache/`. The cache key SHALL cover the block's source, the preambles it is compiled with (including files they input), the palettes and Dex's rendering settings. A diagram whose cached renderings exist SHALL NOT be recompiled. Cache entries SHALL be plain files suitable for committing.

#### Scenario: Unchanged diagram
- **WHEN** a deck is built twice without changes
- **THEN** the second build compiles no diagram

#### Scenario: Edited diagram
- **WHEN** one diagram's source changes
- **THEN** only that diagram is recompiled

#### Scenario: Edited preamble
- **WHEN** `decks/talk/tikz.tex` changes
- **THEN** every diagram of `talk`, and no diagram of other decks, is recompiled

#### Scenario: Building without TeX
- **WHEN** every diagram of a folder is cached and the machine has no TeX installation
- **THEN** `dex check` and `dex build` succeed

#### Scenario: Changed theme
- **WHEN** a deck's `theme` changes, or the colours of the theme it uses change
- **THEN** that deck's diagrams are recompiled, and decks using other themes are not
