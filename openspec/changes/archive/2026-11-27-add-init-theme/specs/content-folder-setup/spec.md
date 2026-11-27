## MODIFIED Requirements

### Requirement: Initialise a content folder

`dex init` SHALL prepare the content folder (the working directory or `--folder`). It SHALL create `decks/` if missing, write the Dex-managed instructions and skills, and print each file it created, updated or left unchanged. Existing decks SHALL never be modified.

#### Scenario: Empty folder
- **WHEN** the user runs `dex init` in an empty folder
- **THEN** it contains `decks/`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `dex.yaml` and the Dex skills, and the command exits with status 0

#### Scenario: Existing content
- **WHEN** the user runs `dex init` in a folder that already has `decks/http/slides.md`
- **THEN** that deck is unchanged

## ADDED Requirements

### Requirement: Starter settings file

`dex init` SHALL create `dex.yaml` when the content folder has none, containing `theme: default` and comments that explain the setting and how to list the available themes. An existing `dex.yaml` SHALL be the author's: without `--theme`, `dex init` SHALL leave it unchanged, and it SHALL never count as out-of-date instructions.

#### Scenario: Starter file
- **WHEN** the user runs `dex init` in a folder without `dex.yaml`
- **THEN** `dex.yaml` contains `theme: default` and a comment pointing to `dex docs themes`, and `dex check` reports no problem with it

#### Scenario: Author's settings are kept
- **WHEN** `dex.yaml` contains `theme: forest` and the user runs `dex init`
- **THEN** `dex.yaml` still contains `theme: forest`, and it is reported as unchanged

### Requirement: Folder theme at init

`dex init --theme <name>` SHALL write `theme: <name>` into the starter `dex.yaml`, or set the `theme` key of an existing one, keeping its comments and other keys. The name SHALL be a built-in or local theme. An unknown name, or an existing `dex.yaml` that is not a valid YAML mapping, SHALL be an error, and nothing SHALL be written. Other commands SHALL reject `--theme`.

#### Scenario: New folder with a theme
- **WHEN** the user runs `dex init --theme slate` in a folder without `dex.yaml`
- **THEN** the starter `dex.yaml` contains `theme: slate`, and its decks use `slate` unless their front matter picks another theme

#### Scenario: Existing settings
- **WHEN** `dex.yaml` contains a comment and `theme: forest`, and the user runs `dex init --theme slate`
- **THEN** `dex.yaml` contains the comment and `theme: slate`, and the command reports it as updated

#### Scenario: Same theme again
- **WHEN** `dex.yaml` contains `theme: slate` and the user runs `dex init --theme slate`
- **THEN** `dex.yaml` is unchanged and reported as unchanged

#### Scenario: Local theme
- **WHEN** the folder has `themes/ocean/theme.css` and the user runs `dex init --theme ocean`
- **THEN** `dex.yaml` contains `theme: ocean`

#### Scenario: Unknown theme
- **WHEN** the user runs `dex init --theme nope` and there is no theme `nope`
- **THEN** the command lists the available themes, writes nothing and exits non-zero

#### Scenario: Broken settings file
- **WHEN** `dex.yaml` is not valid YAML and the user runs `dex init --theme slate`
- **THEN** the command says `dex.yaml` can't be read, writes nothing and exits non-zero

#### Scenario: Other commands
- **WHEN** the user runs `dex build --theme slate`
- **THEN** the command says `--theme` only works with `init` and exits non-zero
