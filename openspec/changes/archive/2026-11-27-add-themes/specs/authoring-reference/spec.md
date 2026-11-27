## MODIFIED Requirements

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

## ADDED Requirements

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
