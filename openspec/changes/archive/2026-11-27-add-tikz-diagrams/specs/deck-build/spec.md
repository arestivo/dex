# Spec Delta

## MODIFIED Requirements

### Requirement: The dex command

The engine SHALL provide one command, `dex <init|new|dev|build|preview|check|fit|shot|docs> [options] [args...]`. It SHALL print usage with `--help`, and print usage and exit non-zero for a missing or unknown command. Inside the engine repository, the `pnpm` scripts (`dev`, `build`, `preview`, `check:decks`, `check:fit`) SHALL run the corresponding commands.

#### Scenario: Help
- **WHEN** the user runs `dex --help`
- **THEN** the commands (including `init`, `new`, `shot` and `docs`) and options are listed and the exit status is 0

#### Scenario: Unknown command
- **WHEN** the user runs `dex frobnicate`
- **THEN** an error and the usage are printed and the exit status is non-zero

## ADDED Requirements

### Requirement: Slide screenshots

`dex shot <slug> [id...]` SHALL build the site and save PNG images of the given slides, or of every slide of the deck, at 1280×720, in both the light and the dark theme, to `.dex/shots/<slug>/<id>-light.png` and `<id>-dark.png` in the content folder. It SHALL print the paths of the images it wrote, and exit non-zero, writing nothing, for an unknown deck or slide id or a deck with errors.

#### Scenario: One slide
- **WHEN** the user runs `dex shot http agent-loop`
- **THEN** `.dex/shots/http/agent-loop-light.png` and `.dex/shots/http/agent-loop-dark.png` exist and their paths are printed

#### Scenario: Whole deck
- **WHEN** the user runs `dex shot http`
- **THEN** a light and a dark image is saved for every slide of `http`

#### Scenario: Unknown slide
- **WHEN** the user runs `dex shot http nope`
- **THEN** the command reports that `nope` is not a slide of `http` and exits non-zero
