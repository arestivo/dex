# Proposal

## Why

Agents that write or migrate slides work in content folders, but everything they need lives in the engine repository, where they can't see it. That includes the deck format, the migration playbook, the rule that slide ids are permanent, and "`dex check` and `dex fit` must be clean". A content folder should be able to carry its own agent instructions, and those instructions must not drift out of date when the engine changes.

## What Changes

- New `dex init` command. It prepares a content folder for humans and agents:
  - creates `decks/` if missing;
  - makes sure the output folder is git-ignored;
  - writes a Dex-managed block, between markers, into `AGENTS.md`, with the rules and commands for working on decks;
  - makes `CLAUDE.md` import `AGENTS.md`;
  - installs the content agent skills (`author-deck`, and `migrate-remark-deck`, which moves here from the engine repository) into `.agents/skills/`, with links from `.claude/skills/`.
- Re-running `dex init` is safe. It refreshes only what Dex manages and leaves everything else, including the rest of `AGENTS.md`, untouched. It refuses to run in the engine repository itself.
- New `dex docs [topic]` command. It prints the engine's own reference documentation (`authoring`, `layouts`), so the instructions in a content folder point to a reference that always matches the installed engine instead of a copy.
- `dex check` warns when a content folder's Dex-managed instructions differ from what the installed engine would generate ("run `dex init` to refresh").
- **BREAKING** (engine repository only): the `migrate-remark-deck` skill is no longer installed in the engine repository. It ships to content folders via `dex init`.

## Capabilities

### New Capabilities

- `content-folder-setup`: preparing a content folder for authors and agents: `dex init`, the managed instruction files and skills, idempotent refresh, and the out-of-date warning.
- `authoring-reference`: the engine's reference documentation as a command (`dex docs`), the single source agents consult for the deck format and layouts.

### Modified Capabilities

- `deck-build`: the `dex` command gains `init` and `docs`, and its scenarios use the `dex` name.

## Out of Scope

- Starter or example decks created by `dex init`.
- Content-folder layouts or styles (layouts remain engine-only).
- Instructions for specific agents beyond `AGENTS.md`, `CLAUDE.md` and the `.agents`/`.claude` skill folders.
- Publishing Dex as an npm package.

## Impact

- New `src/cli/init.ts`, `src/cli/docs.ts` and a `scaffold/` folder in the engine (templates for the managed block and the skills). Changes to `src/cli/main.ts` and `src/cli/check.ts`.
- `.agents/skills/migrate-remark-deck` and `.claude/skills/migrate-remark-deck` move to `scaffold/skills/`.
- Docs: README, AGENTS.md (engine), `docs/authoring.md` (it becomes the `dex docs authoring` output, so it must read well in a terminal and to an agent).
- Tests: unit tests for the managed-block merge and the staleness hash; CLI tests on temporary content folders.
