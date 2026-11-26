# Tasks

## 1. Content folder

- [x] 1.1 Add `src/core/config.ts` (engine locations; content folder from the working directory or `--folder`, output from `--dist`); verify `tests/core/config.test.ts` covers defaults, relative and absolute values
- [x] 1.2 Resolve workspace and layout folders as absolute paths (default layouts: the engine's), and report a missing `decks/` folder; verify workspace tests for an absolute decks folder, engine layouts and the missing-folder error
- [x] 1.3 Make the Vite plugin use the engine as Vite root, read decks from the content folder, write to the output folder (emptying it) and watch an external decks folder; verify a build from an out-of-repo folder and a dev-server reload on an external deck edit

## 2. The decks command

- [x] 2.1 Add `src/build/site.ts` (dev, build, preview) and `src/cli/main.ts` (`decks` with `dev|build|preview|check|fit`, `--folder`, `--dist`, `--port`, `--help`); turn `check.ts` and `fit.ts` into functions; remove `vite.config.ts`; verify the CLI tests in `tests/core/workspace.test.ts`
- [x] 2.2 Point the `pnpm` scripts and `bin` at `src/cli/main.ts`; verify `pnpm check:decks` and `pnpm build` in the repository and a symlinked `decks` under `node_modules/.bin`

## 3. Content out of the repository

- [x] 3.1 Ignore `/decks/` and `/dist/` (anchored, so fixture `decks/` folders stay tracked); verify with `git check-ignore`
- [x] 3.2 Add the committed fixture deck `tests/fixtures/viewer/` and have the e2e setup build it into a temporary folder; verify `pnpm test` and `pnpm test:e2e` pass with `decks/` and `dist/` moved away

## 4. Documentation

- [x] 4.1 Update `AGENTS.md`, `README.md`, `docs/authoring.md` and the migration skill for the content folder, the `decks` command and the engine/content split; verify no doc claims decks are committed

## Workflow follow-up

- Archive the change once implemented.
