## MODIFIED Requirements

### Requirement: Content of the agent instructions

The managed block SHALL tell agents:
- the folder layout: decks, assets, local and deck layouts, `tikz/preamble.tex`, `.dex/cache/`;
- that slide ids are permanent;
- the `dex` commands, including `dex new layout` (with `--deck`) and `dex shot`;
- that work is done when `dex check` and `dex fit` are clean and changed slides were seen;
- not to edit the output folder;
- to read the reference with `dex docs` and `dex docs layouts`;
- which content skills are available.

#### Scenario: Agent starts working
- **WHEN** an agent reads `AGENTS.md` in an initialised content folder
- **THEN** it learns the folder layout, the permanent-id rule, the done criteria, and that `dex docs` gives the format reference

#### Scenario: Agent needs a new layout
- **WHEN** an agent reads `AGENTS.md` while deciding how to present a recurring pattern
- **THEN** it learns that local layouts live in `layouts/`, that `dex new layout <name>` creates one, and that `dex docs layouts` lists the existing ones

#### Scenario: Agent needs a layout for one deck
- **WHEN** an agent reads `AGENTS.md` while deciding where a layout that only one deck uses should go
- **THEN** it learns that deck layouts live in `decks/<slug>/layouts/`, that `dex new layout <name> --deck <slug>` creates one, and that `dex docs layouts --deck <slug>` lists what that deck can use

#### Scenario: Agent wants a diagram
- **WHEN** an agent reads `AGENTS.md` while deciding how to explain a process
- **THEN** it learns that diagrams are drawn in `tikz` blocks, that shared styles go in `tikz/preamble.tex`, and that `dex shot` shows the result
