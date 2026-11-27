# diagrams Specification

## Purpose
Lets authors and agents draw diagrams inside slides with TikZ, using the slide's colours and the content folder's own shared styles. Diagrams render at build time as theme-aware inline SVG figures, and they are cached and checked like any other content.

## Requirements

### Requirement: TikZ diagram blocks

A fenced code block tagged `tikz` SHALL contain exactly one `tikzpicture` environment and SHALL render as a diagram figure in place of the block. It SHALL NOT render as highlighted code. The block's info string MAY carry `alt="..."`.

#### Scenario: Diagram rendered
- **WHEN** a slide contains a `tikz` block with a `tikzpicture` that draws two connected nodes
- **THEN** the built slide contains a figure with an inline SVG of that drawing and no code listing

#### Scenario: Not a picture
- **WHEN** a `tikz` block contains text outside a `tikzpicture` environment, or no environment at all
- **THEN** the check reports an error at the block's line saying the block must contain one `tikzpicture`

### Requirement: Accessible diagrams

A diagram figure SHALL expose its `alt` text as an image role with that text as its accessible name. A `tikz` block without `alt` SHALL produce a check warning.

#### Scenario: Alt text given
- **WHEN** a block's info string is `tikz alt="The agent loop"`
- **THEN** the figure has role `img` and accessible name "The agent loop"

#### Scenario: Missing alt text
- **WHEN** a `tikz` block has no `alt`
- **THEN** the check reports a warning at the block's line asking for a description of the diagram

### Requirement: Slide colours in diagrams

Every diagram SHALL be compiled with the slide palette defined as TikZ colours: `DexInk`, `DexMuted`, `DexPaper`, `DexSurface`, `DexBorder`, `DexAccent`, `DexAccentSoft`, `DexInverse`, `DexInverseText`, and the callout tones with their soft variants. It SHALL also define a TeX conditional `\ifDexDark` that is true only in the dark rendering. The colours SHALL take the values of the current theme's tokens.

#### Scenario: Palette colours
- **WHEN** a block fills a node with `DexAccentSoft` and draws it with `DexAccent`
- **THEN** both renderings use the accent colours of their theme

#### Scenario: Own colours per theme
- **WHEN** a preamble defines `Navy` differently inside `\ifDexDark ... \else ... \fi`
- **THEN** each rendering uses its own definition of `Navy`

### Requirement: Diagram typeface

Diagram text SHALL default to the slide typeface (Fira Sans, with Fira Mono for monospace) in the `DexInk` colour. A preamble MAY change the fonts.

#### Scenario: Default labels
- **WHEN** a block draws a node with plain text and no preamble changes fonts
- **THEN** the label is set in Fira Sans in the theme's ink colour

### Requirement: Diagrams follow the theme

Each diagram SHALL be rendered once with the light palette and once with the dark palette, and the viewer SHALL show the rendering that matches the current theme, including a theme chosen with the viewer's toggle. Printing SHALL use the light rendering.

#### Scenario: Dark theme
- **WHEN** a deck is viewed in the dark theme
- **THEN** every diagram shows its dark rendering, and switching to the light theme shows the light rendering without reloading

#### Scenario: Mixed colours
- **WHEN** a diagram fills a node with a tint of the slide colours such as `DexAccent!30!DexPaper`
- **THEN** the tint is computed from the light palette in the light rendering and from the dark palette in the dark one

### Requirement: Diagram size matches the slide

A diagram SHALL be sized so that 10 TeX points equal 1em of the slide's text, scaling with the slide like the text does, and SHALL never be wider than its container.

#### Scenario: Text-sized labels
- **WHEN** a diagram's labels use the normal font size
- **THEN** they appear the same size as the slide's body text

#### Scenario: Too wide
- **WHEN** a diagram is wider than the slide body
- **THEN** it is scaled down to fit the width, and `dex fit` reports the slide if its height overflows

### Requirement: Diagram preambles

Every diagram of a deck SHALL be compiled with these preambles, in this order, after the slide colours and before the block:
1. the content folder's `tikz/preamble.tex`, when it exists;
2. the deck's `decks/<slug>/tikz.tex`, when it exists.

A preamble MAY `\input` other files in the content folder's `tikz/` folder. Both preambles are optional, and Dex SHALL define no styles or macros of its own.

#### Scenario: Folder styles
- **WHEN** `tikz/preamble.tex` defines `\tikzset{box/.style={draw=DexAccent}}` and a block uses `\node[box] {A};`
- **THEN** the diagram renders with that style in every deck of the folder

#### Scenario: Deck overrides
- **WHEN** both preambles define the style `box` differently
- **THEN** diagrams in that deck use the deck's definition

#### Scenario: Split preamble
- **WHEN** `tikz/preamble.tex` contains `\input{tikz/sequence.tex}` and that file exists
- **THEN** its definitions are available to every diagram

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

### Requirement: Diagram diagnostics

A diagram that fails to compile SHALL produce a check error carrying TeX's error message. When TeX reports a line, the error SHALL point to that line in whichever file it is in: the block's line in `slides.md` (with the slide id), or the line in the preamble file. When TeX cannot locate the error within a file (for example a brace left open until the end of a preamble), the error SHALL name that file without a line.

#### Scenario: Error in a block
- **WHEN** line 3 of a `tikz` block refers to an undefined node
- **THEN** the check reports an error at that line of `slides.md`, with the slide id and TeX's message

#### Scenario: Error in a preamble
- **WHEN** line 12 of `tikz/preamble.tex` uses an undefined macro
- **THEN** the check reports an error at `tikz/preamble.tex:12` for the diagrams that use it

#### Scenario: Unlocated error in a preamble
- **WHEN** `tikz/preamble.tex` leaves a brace open until its end
- **THEN** the check reports an error naming `tikz/preamble.tex` without a line

### Requirement: Missing toolchain

When a diagram is not cached and `xelatex` or `dvisvgm` cannot be found, the check SHALL report an error at the block naming the missing programs and pointing to the installation instructions. Cached diagrams SHALL NOT need them.

#### Scenario: No toolchain
- **WHEN** a deck has an uncached diagram and `xelatex` is not installed
- **THEN** the check reports an error saying that TeX (`xelatex`, `dvisvgm`) is needed to render new diagrams

### Requirement: Safe compilation

Diagram compilation SHALL run TeX without shell escape, in a temporary working folder that contains only the block, the preambles and a copy of the content folder's `tikz/` folder. TeX SHALL be unable to read files outside that folder and its own installation, or to write files outside that folder.

#### Scenario: Shell escape attempt
- **WHEN** a `tikz` block uses `\immediate\write18{...}`
- **THEN** no command runs

#### Scenario: Reading a file
- **WHEN** a `tikz` block tries to `\input` a file outside the temporary folder
- **THEN** compilation fails with a diagnostic and the file is not read
