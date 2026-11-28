## MODIFIED Requirements

### Requirement: Content folder configuration

A content folder MAY contain a `dex.yaml` file: a YAML mapping whose keys are `theme` (the folder's default theme) and `publishNotes` (whether builds publish the speaker notes of decks that don't decide for themselves). Invalid YAML, a value that is not a mapping, unknown keys and values of the wrong type SHALL be errors at `dex.yaml` that say which keys are allowed. Without `dex.yaml`, every setting SHALL take its default.

#### Scenario: Folder theme
- **WHEN** `dex.yaml` contains `theme: slate`
- **THEN** decks without their own `theme` and the index page use `slate`

#### Scenario: Unknown key
- **WHEN** `dex.yaml` contains `port: 8080`
- **THEN** the check reports an error at `dex.yaml` naming `port` and listing the allowed keys

#### Scenario: Notes setting
- **WHEN** `dex.yaml` contains `publishNotes: true`
- **THEN** builds publish the notes of every deck that doesn't set `publishNotes: false`

## ADDED Requirements

### Requirement: Speaker notes are private by default

`dex build` SHALL leave every deck's speaker notes out of the built site, unless they are published: by `dex build --publish-notes` (every deck, for that build), otherwise by the deck's front matter `publishNotes`, otherwise by `dex.yaml`'s `publishNotes`. `dex dev` SHALL always include the notes. `--publish-notes` SHALL be rejected by every command other than `build`.

#### Scenario: Default build
- **WHEN** a deck has notes and neither its front matter nor `dex.yaml` sets `publishNotes`, and the user runs `dex build`
- **THEN** no text of the notes appears anywhere in the built site

#### Scenario: Published by the deck
- **WHEN** a deck's front matter has `publishNotes: true` and the user runs `dex build`
- **THEN** its notes are in the built site and the presenter window shows them

#### Scenario: Private deck in a publishing folder
- **WHEN** `dex.yaml` has `publishNotes: true` and a deck's front matter has `publishNotes: false`
- **THEN** that deck's notes are left out of the build and other decks' notes are published

#### Scenario: Build flag
- **WHEN** the user runs `dex build --publish-notes`
- **THEN** every deck's notes are in the built site

#### Scenario: Dev server
- **WHEN** a deck has notes and no `publishNotes` setting, and the user opens it with `dex dev`
- **THEN** the presenter window shows the notes
