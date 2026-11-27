## MODIFIED Requirements

### Requirement: The dex command

The engine SHALL provide one command, `dex <init|new|dev|build|preview|check|fit|shot|docs|doctor> [options] [args...]`. It SHALL print usage with `--help`, and print usage and exit non-zero for a missing or unknown command. Inside the engine repository, the `pnpm` scripts (`dev`, `build`, `preview`, `check:decks`, `check:fit`) SHALL run the corresponding commands.

#### Scenario: Help
- **WHEN** the user runs `dex --help`
- **THEN** the commands (including `init`, `new`, `shot`, `docs` and `doctor`) and options are listed and the exit status is 0

#### Scenario: Unknown command
- **WHEN** the user runs `dex frobnicate`
- **THEN** an error and the usage are printed and the exit status is non-zero

## ADDED Requirements

### Requirement: Doctor command

`dex doctor` SHALL report whether the tools each feature needs are present, without needing a content folder or any deck: Node.js 24 or later (every command), Chromium (`dex fit`, `dex shot`), and the TeX programs and files that diagrams load (rendering new diagrams). Each missing item SHALL say what it is needed for and how to install it, including the engine's Nix shell. The command SHALL exit with status 0 when everything is present and non-zero otherwise.

#### Scenario: Everything installed
- **WHEN** the user runs `dex doctor` with Node.js 24, Chromium and a complete TeX installation
- **THEN** each item is reported as found, with the path or version, and the exit status is 0

#### Scenario: Incomplete TeX
- **WHEN** `xelatex` and `dvisvgm` are installed but TeX can't find `FiraSans.sty`
- **THEN** the report says that `FiraSans.sty` (package `fira`) is missing and that rendering new diagrams needs it, shows how to install it, and the exit status is non-zero

#### Scenario: No Chromium
- **WHEN** no Chromium is found and `CHROMIUM_PATH` is not set
- **THEN** the report says that `dex fit` and `dex shot` need Chromium and how to provide it, and the other items are still checked
