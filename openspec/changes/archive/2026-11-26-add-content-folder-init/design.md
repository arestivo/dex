# Design

## Context

The `dex` CLI (`src/cli/main.ts`) works on a content folder (the working directory or `--folder`) and finds its own assets through `ENGINE_ROOT` (`src/core/config.ts`). The engine repository currently holds the only copy of the agent material: `docs/authoring.md`, `docs/layouts.md` and `.agents/skills/migrate-remark-deck/` (linked from `.claude/skills/`). See proposal.md for why content folders need it.

## Goals / Non-Goals

**Goals:**

- One source of truth for every piece of agent material, living in the engine.
- `dex init` is safe to run at any time and never touches files it doesn't own.
- Adding a content skill means adding a folder, with no code changes (the same principle as layouts).

**Non-Goals:**

- Tracking which engine version initialised a folder.
- Supporting agents whose instruction files are not `AGENTS.md`/`CLAUDE.md` or skills folders.
- Windows-specific handling of symlinks.

## Decisions

### Scaffold templates live in `scaffold/`

```text
scaffold/
  AGENTS.block.md              body of the managed block (without markers)
  skills/
    author-deck/SKILL.md
    migrate-remark-deck/SKILL.md   (moved from .agents/skills/)
```

`dex init` renders the block from `AGENTS.block.md`. A `{{skills}}` placeholder is filled with each skill's `name` and `description`, read from its front matter, so a new skill folder shows up in the block automatically. Skills are copied verbatim.

- *Alternative:* templates embedded as TypeScript strings. Rejected: they are documentation that should be readable and editable as Markdown.

### Ownership markers

- **AGENTS.md:** the managed region is delimited by `<!-- dex:start -->` and `<!-- dex:end -->`. A comment inside it says that edits there are overwritten. If the markers are malformed (one missing, or out of order), `dex init` aborts with an error instead of guessing.
- **Skills:** a skill is Dex-managed when its `SKILL.md` front matter has `metadata.generatedBy: dex`, the same convention the OpenSpec skills use. `dex init` only creates or replaces skills whose names exist in `scaffold/skills/`. It never deletes a skill folder: a skill dropped from the engine stays until the author removes it, and `dex init` names it as no longer provided.

### Staleness by regeneration, not by stamps

`dex init` and the `dex check` warning share one function: `planScaffold(content) → FileChange[]`. It computes the desired content of every managed file and compares it with what is on disk: `create`, `update` or `unchanged`. `dex init` applies the plan. `dex check` only asks whether any managed file that already exists would be updated (the managed block, or a managed skill), and warns if so. A folder with no managed files gets no warning.

- *Why:* comparing contents is exact, needs no version discipline (the engine version is not bumped on every change), and covers local edits and engine upgrades with the same code.
- *Alternative:* a stamped engine version or hash in the block. Rejected: it needs bookkeeping and still can't detect local edits.

### Plan, then write

`dex init` builds the whole plan first, including validation (engine-repository guard, marker sanity), and only then writes. A validation error leaves the folder untouched. Output is one line per file: `created`, `updated`, `unchanged` or `kept` (the latter for skill folders the engine no longer provides).

### Engine-repository guard

`dex init` compares `realpath(content.root)` with `realpath(ENGINE_ROOT)` and refuses on a match. The engine's own `AGENTS.md` is for engine development and must not get a content block. Running `dex init` in a sub-folder of the engine (e.g. a scratch content folder) is allowed.

### `.claude/skills` links

`.claude/skills/<name>` is a relative symlink to `../../.agents/skills/<name>`, the same as in the engine repository today. An existing correct link is `unchanged`. An existing directory or file with that name that is not a managed copy is left alone, with a warning.

### `.gitignore`

When the output folder is inside the content folder, `dex init` looks for an existing line that ignores it (`dist`, `dist/`, `/dist` or `/dist/`, comparing against its path relative to the folder) and appends `/<path>/` otherwise. This is a deliberately simple check, not full gitignore semantics. When the output folder is outside the content folder, nothing is done.

### `dex docs` reads the engine's `docs/`

`src/cli/docs.ts` maps topics to files and descriptions: `authoring → docs/authoring.md`, `layouts → docs/layouts.md`. It prints the file as-is. Making the docs self-contained (the `authoring-reference` spec) is a docs change: links like `[layouts.md](layouts.md)` become "`dex docs layouts`", and engine files are named as such ("the engine's `styles/utilities.css`").

- *Alternative:* render Markdown for the terminal. Rejected: agents are the main readers, and raw Markdown is what they parse best.

### Content skill `author-deck`

A new skill for creating and editing decks. It is a procedure, not a format reference:

1. read `dex docs` (and `dex docs layouts` when choosing layouts);
2. choose permanent ids;
3. write the deck;
4. iterate on `dex check` until clean;
5. iterate on `dex fit` until clean;
6. review visually with `dex dev`;
7. report judgement calls.

`migrate-remark-deck` is updated to point to `dex docs` instead of `docs/authoring.md`.

## Risks / Trade-offs

- [Authors edit inside the managed block and lose the edits on the next `dex init`] → The block starts with a comment saying it is managed, `dex init` reports `updated`, and the docs tell authors to write their own notes outside the markers.
- [A removed engine skill lingers in content folders] → `dex init` reports it as `kept (no longer provided by Dex)`.
- [Symlinks may not work on some filesystems] → Acceptable for now (Linux/macOS). If needed later, copy instead.
- [`dex docs` output depends on the docs being written for both audiences] → The `authoring-reference` spec makes that a requirement, and the docs are reviewed as part of this change.

## Migration Plan

1. Move `.agents/skills/migrate-remark-deck/` to `scaffold/skills/` and remove the engine repository's `.claude/skills/migrate-remark-deck` link.
2. Existing content folders (only scratch ones so far) run `dex init` once.
