# diagrams Specification

## Purpose
Lets authors and agents draw diagrams inside slides with TikZ, using the slide's colours and the content folder's own shared styles. Diagrams render at build time as theme-aware SVG figures, published as separate files the slides refer to, and they are cached and checked like any other content.

## Requirements

### Requirement: TikZ diagram blocks

A fenced code block tagged `tikz` SHALL contain exactly one `tikzpicture` environment and SHALL render as a diagram figure in place of the block. It SHALL NOT render as highlighted code. The block's info string MAY carry `alt="..."`.

#### Scenario: Diagram rendered
- **WHEN** a slide contains a `tikz` block with a `tikzpicture` that draws two connected nodes
- **THEN** the built slide contains a figure showing that drawing, and no code listing

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

### Requirement: Diagram typeface

Diagram text SHALL default to the slide typeface (Fira Sans, with Fira Mono for monospace) in the `DexInk` colour. A preamble MAY change the fonts.

#### Scenario: Default labels
- **WHEN** a block draws a node with plain text and no preamble changes fonts
- **THEN** the label is set in Fira Sans in the theme's ink colour

### Requirement: Diagrams follow the mode

Each diagram SHALL be rendered once with the light palette and once with the dark palette, and the viewer SHALL show the rendering that matches the current mode, including a mode chosen with the viewer's toggle. Printing SHALL use the light rendering.

#### Scenario: Dark theme
- **WHEN** a deck is viewed in dark mode
- **THEN** every diagram shows its dark rendering, and switching to light mode shows the light rendering without reloading

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

#### Scenario: Changed theme
- **WHEN** a deck's `theme` changes, or the colours of the theme it uses change
- **THEN** that deck's diagrams are recompiled, and decks using other themes are not

### Requirement: Diagram diagnostics

A diagram that fails to compile SHALL produce a check error with TeX's first error (not the "Emergency stop" after it); for a file TeX can't find, it SHALL say to install the package that provides it or use the engine's Nix shell. When TeX reports a line, the error SHALL point to it in its file: the block's line in `slides.md` (with the slide id), or the preamble's line. If TeX can't place the error within a file (e.g. an unclosed brace in a preamble), it SHALL name the file without a line.

#### Scenario: Error in a block
- **WHEN** line 3 of a `tikz` block refers to an undefined node
- **THEN** the check reports an error at that line of `slides.md`, with the slide id and TeX's message

#### Scenario: Error in a preamble
- **WHEN** line 12 of `tikz/preamble.tex` uses an undefined macro
- **THEN** the check reports an error at `tikz/preamble.tex:12` for the diagrams that use it

#### Scenario: Unlocated error in a preamble
- **WHEN** `tikz/preamble.tex` leaves a brace open until its end
- **THEN** the check reports an error naming `tikz/preamble.tex` without a line

#### Scenario: Package missing from a preamble
- **WHEN** `tikz/preamble.tex` loads `\usepackage{pgfplots}` and TeX can't find `pgfplots.sty`
- **THEN** the check reports that TeX can't find `pgfplots.sty`, with the install hint, and not "Emergency stop"

### Requirement: Missing toolchain

When a diagram is not cached, the check SHALL make sure TeX can render it: the programs `xelatex` and `dvisvgm`, and the TeX files every diagram loads (`standalone.cls`, `tikz.sty`, `pgfsys-dvisvgm.def`, `fontspec.sty`, `FiraSans.sty`, `FiraMono.sty`). If any is missing, it SHALL report an error at the block naming what is missing (files with their TeX Live package) and how to fix it. Cached diagrams SHALL NOT need TeX.

#### Scenario: No toolchain
- **WHEN** a deck has an uncached diagram and `xelatex` is not installed
- **THEN** the check reports an error saying that TeX (`xelatex`, `dvisvgm`) is needed to render new diagrams

#### Scenario: Incomplete TeX installation
- **WHEN** a deck has an uncached diagram, `xelatex` and `dvisvgm` are installed, and TeX can't find `standalone.cls` or `FiraSans.sty`
- **THEN** the check reports, without running TeX, an error naming both files and their packages (`standalone`, `fira`), saying to install them or to use the engine's Nix shell

#### Scenario: Everything cached
- **WHEN** every diagram of a deck is cached and TeX is not installed at all
- **THEN** the check reports no toolchain error

### Requirement: Safe compilation

Diagram compilation SHALL run TeX without shell escape, in a temporary working folder that contains only the block, the preambles and a copy of the content folder's `tikz/` folder. TeX SHALL be unable to read files outside that folder and its own installation, or to write files outside that folder.

#### Scenario: Shell escape attempt
- **WHEN** a `tikz` block uses `\immediate\write18{...}`
- **THEN** no command runs

#### Scenario: Reading a file
- **WHEN** a `tikz` block tries to `\input` a file outside the temporary folder
- **THEN** compilation fails with a diagnostic and the file is not read

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
