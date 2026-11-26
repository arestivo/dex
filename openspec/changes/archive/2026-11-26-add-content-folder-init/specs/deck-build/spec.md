# Spec Delta

## MODIFIED Requirements

### Requirement: The dex command

The engine SHALL provide one command, `dex <init|dev|build|preview|check|fit|docs> [options] [args...]`. It SHALL print usage with `--help`, and print usage and exit non-zero for a missing or unknown command. Inside the engine repository, the `pnpm` scripts (`dev`, `build`, `preview`, `check:decks`, `check:fit`) SHALL run the corresponding commands.

#### Scenario: Help
- **WHEN** the user runs `dex --help`
- **THEN** the commands (including `init` and `docs`) and options are listed and the exit status is 0

#### Scenario: Unknown command
- **WHEN** the user runs `dex frobnicate`
- **THEN** an error and the usage are printed and the exit status is non-zero
