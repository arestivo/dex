## MODIFIED Requirements

### Requirement: Content agent skills

`dex init` SHALL install the content skills `author-deck` (creating and editing decks), `author-layout` (creating and changing layouts), `author-theme` (creating and changing local themes) and `migrate-remark-deck` (recreating remark.js decks) into `.agents/skills/<name>/`, and SHALL make `.claude/skills/<name>` a relative link to each. Each installed skill SHALL be marked as managed by Dex.

#### Scenario: Skills installed
- **WHEN** `dex init` completes
- **THEN** `.agents/skills/author-deck/SKILL.md`, `.agents/skills/author-layout/SKILL.md`, `.agents/skills/author-theme/SKILL.md` and `.agents/skills/migrate-remark-deck/SKILL.md` exist, and `.claude/skills/author-layout` resolves to its folder

#### Scenario: Unrelated skills
- **WHEN** `.agents/skills/my-own-skill/` exists
- **THEN** it is not modified

## ADDED Requirements

### Requirement: Themes in the agent instructions

The managed block SHALL tell agents that local themes live in `themes/<name>/`, that `dex.yaml` sets the folder's default theme, that `dex docs themes` lists the themes and `dex new theme <name>` creates one, and that a deck's theme is the author's choice: agents SHALL NOT change a deck's `theme`, change `dex.yaml`, or create or edit themes unless the user asks.

#### Scenario: Agent editing a deck
- **WHEN** an agent reads `AGENTS.md` while editing or migrating a deck
- **THEN** it learns to keep the deck's `theme` and `dex.yaml` as they are unless the user asks to change them

#### Scenario: Agent asked for new colours
- **WHEN** an agent reads `AGENTS.md` after the user asks for a deck in different colours
- **THEN** it learns to check `dex docs themes` for an existing theme first, and otherwise to create one with `dex new theme <name>` following the `author-theme` skill

### Requirement: Theme authoring skill

The `author-theme` skill SHALL tell agents to create or change a theme only when the user asks, to prefer an existing theme when one fits, and to create new ones with `dex new theme`. It SHALL explain how to set light and dark values, keep text readable (the contrast check), check diagrams, document the theme in `theme.md`, and verify with `dex check` and `dex shot` in both modes.

#### Scenario: Skill read before creating a theme
- **WHEN** an agent follows `author-theme` to create a theme `ocean` for a deck
- **THEN** it creates `themes/ocean/` with `dex new theme`, sets both modes, documents the theme, selects it only for the deck the user named, and finishes with `dex check` free of theme warnings
