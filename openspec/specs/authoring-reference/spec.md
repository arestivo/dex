# authoring-reference Specification

## Purpose
Makes the engine's reference documentation available from the command line. People and agents in any content folder can read the deck format and layout reference that matches the installed engine.

## Requirements

### Requirement: Print a reference topic

`dex docs [topic]` SHALL print the reference for that topic to standard output as Markdown and exit with status 0. The topics SHALL be `authoring` (the deck format; the default) and `layouts` (the layouts available in the content folder and how to make one). The printed text SHALL come from the installed engine and, for `layouts`, from the content folder's own layouts, never from a copy of the engine's documentation stored in the content folder.

#### Scenario: Default topic
- **WHEN** the user runs `dex docs`
- **THEN** the deck format reference is printed

#### Scenario: Layouts topic
- **WHEN** the user runs `dex docs layouts`
- **THEN** the layouts reference for the current content folder is printed

#### Scenario: Engine updated
- **WHEN** the engine's authoring reference changes
- **THEN** `dex docs` prints the new text in every content folder without re-running `dex init`

### Requirement: Discoverable topics

`dex docs --list` SHALL print the available topics with a one-line description each. An unknown topic SHALL print an error that lists the available topics and exit non-zero.

#### Scenario: List topics
- **WHEN** the user runs `dex docs --list`
- **THEN** `authoring` and `layouts` are listed with descriptions

#### Scenario: Unknown topic
- **WHEN** the user runs `dex docs themes`
- **THEN** an error lists `authoring` and `layouts` and the exit status is non-zero

### Requirement: Reference is self-contained

The reference topics SHALL make sense when read outside the engine repository. They SHALL NOT tell the reader to edit engine files without saying those files belong to the engine. Links to engine files SHALL be phrased so a content-folder reader knows they are in the engine.

#### Scenario: Read from a content folder
- **WHEN** an agent in a content folder reads `dex docs authoring`
- **THEN** every command it mentions is a `dex` command, and every file path it mentions is either in the content folder or explicitly in the engine

### Requirement: Generated layouts reference

`dex docs layouts` SHALL list every layout available in the content folder (built-in and local), each with its origin, its `description`, its slots as declared by its template, and its usage notes from `layout.md`. The engine's guide to making layouts SHALL follow the list. A layout without `layout.md` SHALL still be listed, marked as undocumented.

#### Scenario: Local layout listed
- **WHEN** the content folder has a local layout `quote` with a `layout.md`
- **THEN** `dex docs layouts` lists `quote` as local, with its description, its slots and its notes, next to the built-in layouts

#### Scenario: Slots come from the template
- **WHEN** a layout's template declares the slots `title`, default and `source`
- **THEN** those three slots are listed for it, whatever its `layout.md` says

#### Scenario: Undocumented layout
- **WHEN** a local layout has no `layout.md`
- **THEN** it is listed with its slots and marked as undocumented
