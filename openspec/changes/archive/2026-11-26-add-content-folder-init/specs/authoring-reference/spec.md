# Spec Delta

## Purpose

Makes the engine's reference documentation available from the command line. People and agents in any content folder can read the deck format and layout reference that matches the installed engine.

## ADDED Requirements

### Requirement: Print a reference topic

`dex docs [topic]` SHALL print the engine's reference for that topic to standard output as Markdown and exit with status 0. The topics SHALL be `authoring` (the deck format; the default) and `layouts` (the available layouts and how to add one). The printed text SHALL be the engine's own documentation, not a copy stored in the content folder.

#### Scenario: Default topic
- **WHEN** the user runs `dex docs`
- **THEN** the deck format reference is printed

#### Scenario: Layouts topic
- **WHEN** the user runs `dex docs layouts`
- **THEN** the layouts reference is printed

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
