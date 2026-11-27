# authoring-reference Specification

## Purpose
Makes the engine's reference documentation available from the command line. People and agents in any content folder can read the deck format and layout reference that matches the installed engine.

## Requirements

### Requirement: Print a reference topic

`dex docs [topic]` SHALL print the reference for that topic to standard output as Markdown and exit with status 0. The topics SHALL be `authoring` (the deck format; the default), `layouts` and `themes` (those available in the content folder, and how to make one). The text SHALL come from the installed engine and the content folder's own layouts and themes, never from a copy of the engine's documentation stored in the content folder.

#### Scenario: Default topic
- **WHEN** the user runs `dex docs`
- **THEN** the deck format reference is printed

#### Scenario: Layouts topic
- **WHEN** the user runs `dex docs layouts`
- **THEN** the layouts reference for the current content folder is printed

#### Scenario: Engine updated
- **WHEN** the engine's authoring reference changes
- **THEN** `dex docs` prints the new text in every content folder without re-running `dex init`

#### Scenario: Themes topic
- **WHEN** the user runs `dex docs themes`
- **THEN** the themes reference for the current content folder is printed

### Requirement: Discoverable topics

`dex docs --list` SHALL print the available topics with a one-line description each. An unknown topic SHALL print an error that lists the available topics and exit non-zero.

#### Scenario: List topics
- **WHEN** the user runs `dex docs --list`
- **THEN** `authoring`, `layouts` and `themes` are listed with descriptions

#### Scenario: Unknown topic
- **WHEN** the user runs `dex docs fonts`
- **THEN** an error lists `authoring`, `layouts` and `themes` and the exit status is non-zero

### Requirement: Reference is self-contained

The reference topics SHALL make sense when read outside the engine repository. They SHALL NOT tell the reader to edit engine files without saying those files belong to the engine. Links to engine files SHALL be phrased so a content-folder reader knows they are in the engine.

#### Scenario: Read from a content folder
- **WHEN** an agent in a content folder reads `dex docs authoring`
- **THEN** every command it mentions is a `dex` command, and every file path it mentions is either in the content folder or explicitly in the engine

### Requirement: Generated layouts reference

`dex docs layouts` SHALL list every layout available in the content folder (built-in and local), each with its origin, its `description`, its slots as declared by its template, and its usage notes from `layout.md`, and SHALL name the decks that have deck layouts. `dex docs layouts --deck <slug>` SHALL also list that deck's layouts, with origin `deck`. The engine's guide to making layouts SHALL follow the list. A layout without `layout.md` SHALL still be listed, marked as undocumented.

#### Scenario: Local layout listed
- **WHEN** the content folder has a local layout `quote` with a `layout.md`
- **THEN** `dex docs layouts` lists `quote` as local, with its description, its slots and its notes, next to the built-in layouts

#### Scenario: Slots come from the template
- **WHEN** a layout's template declares the slots `title`, default and `source`
- **THEN** those three slots are listed for it, whatever its `layout.md` says

#### Scenario: Undocumented layout
- **WHEN** a local layout has no `layout.md`
- **THEN** it is listed with its slots and marked as undocumented

#### Scenario: Deck layouts listed for their deck
- **WHEN** the `http` deck has a deck layout `request` and the user runs `dex docs layouts --deck http`
- **THEN** `request` is listed as a deck layout next to the built-in and local layouts

#### Scenario: Decks with their own layouts named
- **WHEN** the `http` deck has deck layouts and the user runs `dex docs layouts` without `--deck`
- **THEN** the deck layouts are not listed, and the output names `http` as having its own layouts and shows how to list them

#### Scenario: Unknown deck
- **WHEN** the user runs `dex docs layouts --deck nope` and there is no deck `nope`
- **THEN** the command says so and exits non-zero

### Requirement: Diagrams documented

The `authoring` reference SHALL document diagrams:
- the `tikz` block syntax and `alt` text;
- the slide colour names and `\ifDexDark`;
- the folder and deck preambles and their order;
- the diagram cache and when TeX is needed;
- `dex shot`, for looking at the result.

It SHALL NOT prescribe diagram styles. Its `tikz` examples SHALL compile.

#### Scenario: Agent looks up diagrams
- **WHEN** an agent runs `dex docs`
- **THEN** the output has a section on diagrams naming the colours, the preamble files and `dex shot`

#### Scenario: Examples compile
- **WHEN** each `tikz` example in the authoring reference is rendered
- **THEN** none produces an error

### Requirement: Generated themes reference

`dex docs themes` SHALL list every theme available in the content folder (built-in and local), each with its origin, its `description`, its main colours (background, text and accent, in light and dark mode) and its usage notes from `theme.md`. It SHALL say which theme the folder uses by default and where that comes from. The engine's guide to making themes, including the list of colour tokens a theme may set, SHALL follow.

#### Scenario: Local theme listed
- **WHEN** the content folder has a local theme `ocean` with a `theme.md`
- **THEN** `dex docs themes` lists `ocean` as local, with its description, colours and notes, next to the built-in themes

#### Scenario: Folder default shown
- **WHEN** `dex.yaml` says `theme: slate`
- **THEN** `dex docs themes` says the folder's default theme is `slate`, set in `dex.yaml`

#### Scenario: Tokens listed
- **WHEN** the user reads the guide in `dex docs themes`
- **THEN** it lists every colour token a theme may set, with what it colours
