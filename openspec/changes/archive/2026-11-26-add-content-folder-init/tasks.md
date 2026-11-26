# Tasks

## 1. Scaffold templates

- [x] 1.1 Create `scaffold/AGENTS.block.md` (managed-block body with a `{{skills}}` placeholder) covering everything in "Content of the agent instructions"; verify by reading it against the spec's list
- [x] 1.2 Move `.agents/skills/migrate-remark-deck/` to `scaffold/skills/migrate-remark-deck/`, add `metadata.generatedBy: dex`, point it to `dex docs` instead of `docs/authoring.md`, and remove the engine repository's `.claude/skills/migrate-remark-deck` link; verify `git status` shows the move and no dangling link
- [x] 1.3 Write `scaffold/skills/author-deck/SKILL.md` (procedure: `dex docs`, ids, write, `dex check`, `dex fit`, `dex dev` review, report); verify its front matter has `name`, `description` and `metadata.generatedBy: dex`

## 2. Scaffold planning (core logic)

- [x] 2.1 Implement managed-block rendering and merging (create, append, replace between markers, reject malformed markers) in `src/cli/scaffold.ts`; verify unit tests cover new file, append to existing notes, replace keeping outside text, and malformed markers
- [x] 2.2 Implement `planScaffold(content)`, which returns create/update/unchanged/kept for `decks/`, `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md` line), `.gitignore` (output folder inside/outside, already ignored), managed skills and `.claude/skills` links; verify unit tests on temporary folders for each case, including leaving an unrelated skill untouched
- [x] 2.3 Implement the engine-repository guard (realpath comparison); verify a test where the content folder is the engine root fails without writing, and one where it is a sub-folder succeeds

## 3. Commands

- [x] 3.1 Add `dex init` (apply the plan, print one line per file) to `src/cli/main.ts`; verify CLI tests: first run creates everything, second run reports everything unchanged, existing decks untouched
- [x] 3.2 Add `dex docs [topic]` and `dex docs --list` in `src/cli/docs.ts`; verify CLI tests for the default topic, `layouts`, `--list`, and an unknown topic (non-zero exit, topics listed)
- [x] 3.3 Make `dex check` warn when existing managed files are out of date (using `planScaffold`); verify tests: a stale block produces the warning with exit status 0, and an uninitialised folder produces none
- [x] 3.4 Update the usage text to list `init` and `docs`; verify the `--help` test

## 4. Documentation

- [x] 4.1 Make `docs/authoring.md` and `docs/layouts.md` self-contained for `dex docs` (no relative links to engine files; engine files named as such); verify by reading `dex docs` output from a scratch content folder
- [x] 4.2 Update README (`dex init`, `dex docs`) and the engine AGENTS.md (the `scaffold/` folder, where content skills live now, the engine-repository guard); verify no doc still points to `.agents/skills/migrate-remark-deck` in the engine

## 5. Integration

- [x] 5.1 In a scratch content folder: `dex init`, then `dex check` (no warning), edit the managed block (warning), `dex init` (updated, notes kept), `dex docs`; verify each step's output
- [x] 5.2 Run `pnpm verify` and `pnpm test:e2e`; verify both pass

## Workflow follow-up

- Archive the change once implemented and reviewed.
- Commit following the Git rules in AGENTS.md (`feat(cli): add dex init and dex docs`).
