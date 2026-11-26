# content-folder-setup Specification

## Purpose
Prepares a content folder so that people and AI agents working on decks there have the folder structure, the rules and the skills they need. These instructions are kept in step with the installed engine.

## Requirements

### Requirement: Initialise a content folder

`dex init` SHALL prepare the content folder (the working directory or `--folder`). It SHALL create `decks/` if missing, write the Dex-managed instructions and skills, and print each file it created, updated or left unchanged. Existing decks SHALL never be modified.

#### Scenario: Empty folder
- **WHEN** the user runs `dex init` in an empty folder
- **THEN** it contains `decks/`, `AGENTS.md`, `CLAUDE.md`, `.gitignore` and the Dex skills, and the command exits with status 0

#### Scenario: Existing content
- **WHEN** the user runs `dex init` in a folder that already has `decks/http/slides.md`
- **THEN** that deck is unchanged

### Requirement: Managed block in AGENTS.md

`dex init` SHALL write its instructions into `AGENTS.md` as a block delimited by `<!-- dex:start -->` and `<!-- dex:end -->` markers. If `AGENTS.md` exists without the markers, the block SHALL be appended. Text outside the markers SHALL be preserved.

#### Scenario: New AGENTS.md
- **WHEN** the folder has no `AGENTS.md`
- **THEN** `AGENTS.md` is created containing the managed block

#### Scenario: Existing AGENTS.md without markers
- **WHEN** `AGENTS.md` contains the author's own notes and no markers
- **THEN** the notes are kept and the managed block is appended after them

### Requirement: Content of the agent instructions

The managed block SHALL tell agents:
- where decks and their assets go, and that local layouts go in `layouts/<name>/`;
- that slide ids are permanent;
- which `dex` commands exist, including `dex new layout`;
- that work is done only when `dex check` and `dex fit` are clean;
- not to edit the output folder;
- to read the deck format with `dex docs` and the available layouts with `dex docs layouts`;
- which content skills are available.

#### Scenario: Agent starts working
- **WHEN** an agent reads `AGENTS.md` in an initialised content folder
- **THEN** it learns the folder layout, the permanent-id rule, the done criteria, and that `dex docs` gives the format reference

#### Scenario: Agent needs a new layout
- **WHEN** an agent reads `AGENTS.md` while deciding how to present a recurring pattern
- **THEN** it learns that local layouts live in `layouts/`, that `dex new layout <name>` creates one, and that `dex docs layouts` lists the existing ones

### Requirement: Claude Code entry point

`dex init` SHALL make `CLAUDE.md` import `AGENTS.md`: it SHALL create `CLAUDE.md` containing `@AGENTS.md` when missing, and add that line when an existing `CLAUDE.md` lacks it. Other content in `CLAUDE.md` SHALL be preserved.

#### Scenario: Existing CLAUDE.md
- **WHEN** `CLAUDE.md` exists with other instructions and no `@AGENTS.md` line
- **THEN** `@AGENTS.md` is added and the other instructions are kept

### Requirement: Content agent skills

`dex init` SHALL install the content skills `author-deck` (creating and editing decks), `author-layout` (creating and changing local layouts) and `migrate-remark-deck` (recreating remark.js decks) into `.agents/skills/<name>/`, and SHALL make `.claude/skills/<name>` a relative link to each. Each installed skill SHALL be marked as managed by Dex.

#### Scenario: Skills installed
- **WHEN** `dex init` completes
- **THEN** `.agents/skills/author-deck/SKILL.md`, `.agents/skills/author-layout/SKILL.md` and `.agents/skills/migrate-remark-deck/SKILL.md` exist, and `.claude/skills/author-layout` resolves to its folder

#### Scenario: Unrelated skills
- **WHEN** `.agents/skills/my-own-skill/` exists
- **THEN** it is not modified

### Requirement: Output folder ignored

`dex init` SHALL ensure the output folder is ignored by git when it is inside the content folder: it SHALL create `.gitignore` or append an entry for it when no existing line ignores it.

#### Scenario: Existing .gitignore
- **WHEN** `.gitignore` contains `node_modules/` but not `dist/`
- **THEN** `/dist/` is appended and `node_modules/` is kept

#### Scenario: Already ignored
- **WHEN** `.gitignore` already contains `dist/`
- **THEN** `.gitignore` is unchanged

### Requirement: Safe re-run

Running `dex init` again SHALL be idempotent. It SHALL replace only the managed block and Dex-managed skills, report files that did not change as unchanged, and report replaced ones as updated. A managed skill whose files were edited locally SHALL be restored to the engine's version.

#### Scenario: Second run
- **WHEN** the user runs `dex init` twice with the same engine
- **THEN** the second run reports every file as unchanged and modifies nothing

#### Scenario: Author notes survive a refresh
- **WHEN** the author added notes above the managed block and the engine's instructions changed
- **THEN** `dex init` replaces the block and keeps the notes

#### Scenario: Locally edited skill
- **WHEN** a Dex-managed skill was edited by hand
- **THEN** `dex init` restores the engine's version and reports it as updated

### Requirement: Not in the engine repository

`dex init` SHALL refuse to run when the content folder is the engine's own repository, and exit non-zero without writing anything.

#### Scenario: Run in the engine
- **WHEN** the user runs `dex init` at the engine repository's root
- **THEN** it explains that the engine repository is not a content folder and exits non-zero

### Requirement: Out-of-date instructions warning

`dex check` SHALL report a warning when the content folder's Dex-managed instructions or skills differ from what the installed engine would generate, telling the author to run `dex init`. Folders without Dex-managed files SHALL get no such warning.

#### Scenario: Engine upgraded
- **WHEN** the engine's managed instructions changed since `dex init` last ran in the folder
- **THEN** `dex check` prints a warning naming `AGENTS.md` and suggesting `dex init`, and its exit status is unaffected

#### Scenario: Never initialised
- **WHEN** the content folder has no managed block and no managed skills
- **THEN** `dex check` prints no instructions warning
