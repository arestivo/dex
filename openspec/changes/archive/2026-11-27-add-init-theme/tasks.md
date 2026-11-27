# Tasks

## 1. Plan the dex.yaml change

- [x] 1.1 Add the starter `scaffold/dex.yaml` (`theme: default` plus comments explaining the setting and pointing to `dex docs themes`). Plan `dex.yaml` in `planScaffold` as a non-managed change: create the starter when missing and leave an existing file unchanged. Verify with unit tests in `tests/core/scaffold.test.ts`: a new folder gets the starter, an existing file is untouched and reported unchanged, a second run reports it unchanged, and `staleInstructions` ignores it. Check that the starter passes `parseSettings` with no diagnostics.
- [x] 1.2 Give `planScaffold` an optional `theme` and the available theme names: write that theme into the starter, set `theme` in an existing file (keeping comments and other keys), report it unchanged when it already has that theme, and add an error for an unknown name (listing the available themes) or a file that is not a YAML mapping. Verify with unit tests for each case, including that errors write nothing.

## 2. The --theme option

- [x] 2.1 Add `--theme <name>` to `src/cli/main.ts` (usage text included), reject it for every command other than `init`, and make `init.ts` load the folder's themes and pass them with the name to the plan. Verify with CLI tests in `tests/core/cli.test.ts`: `dex init --theme slate` writes `dex.yaml` and a following `dex build` uses `slate`; a local theme is accepted; `--theme nope` exits non-zero and writes nothing; `dex build --theme slate` is rejected.
- [x] 2.2 Document the starter file and the option: README (the `dex init` line), `docs/themes.md` (choosing the folder theme) and the `dex.yaml` line and commands list in `scaffold/AGENTS.block.md`. Verify that `dex docs themes` shows them and that the scaffold tests pass.

## 3. Integration

- [x] 3.1 Run `pnpm verify` inside `nix develop` (under the memory cap) and `openspec validate add-init-theme --strict`.
