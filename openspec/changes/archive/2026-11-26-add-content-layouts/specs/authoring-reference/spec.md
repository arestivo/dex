# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
