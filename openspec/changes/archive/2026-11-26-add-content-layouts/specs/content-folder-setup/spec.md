# Spec Delta

## MODIFIED Requirements

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

### Requirement: Content agent skills

`dex init` SHALL install the content skills `author-deck` (creating and editing decks), `author-layout` (creating and changing local layouts) and `migrate-remark-deck` (recreating remark.js decks) into `.agents/skills/<name>/`, and SHALL make `.claude/skills/<name>` a relative link to each. Each installed skill SHALL be marked as managed by Dex.

#### Scenario: Skills installed
- **WHEN** `dex init` completes
- **THEN** `.agents/skills/author-deck/SKILL.md`, `.agents/skills/author-layout/SKILL.md` and `.agents/skills/migrate-remark-deck/SKILL.md` exist, and `.claude/skills/author-layout` resolves to its folder

#### Scenario: Unrelated skills
- **WHEN** `.agents/skills/my-own-skill/` exists
- **THEN** it is not modified
