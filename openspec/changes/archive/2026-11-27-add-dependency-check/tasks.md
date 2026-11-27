# Tasks

## 1. TeX check before rendering

- [x] 1.1 In `src/core/diagrams/toolchain.ts`, add the required TeX files with their packages and a `missingTex(path)` that returns the missing programs and, using one `kpsewhich` call, the missing files (skipping the file check when `kpsewhich` is absent). Verify with unit tests using fake `xelatex`, `dvisvgm` and `kpsewhich` scripts on a temporary PATH: all found, some files missing, no `kpsewhich`, no programs. Add a test that the wrapper loads exactly the listed class, packages and driver.
- [x] 1.2 Use `missingTex` in `createTexRenderer` (`render.ts`) at the first cache miss, reporting missing programs and files at the block with their packages and the fix. Verify with unit tests: a missing file is reported without running TeX, cached diagrams need nothing, and the message for missing programs is unchanged in substance.

## 2. Real TeX errors

- [x] 2.1 In `parseTexLog` (`tex.ts`), report the `!` error that precedes an "Emergency stop", keeping the location from the `file:line` line, and add the install hint to ``File `X' not found`` messages. Verify with unit tests on real log excerpts (a missing class, a missing package loaded from `tikz/preamble.tex`, and the existing cases unchanged).

## 3. dex doctor

- [x] 3.1 Add `src/cli/doctor.ts` and the `doctor` command in `main.ts` (usage included): Node.js ≥ 24, Chromium (through a non-throwing lookup next to `findChromium`), TeX programs and files, each with what it is for, plus install instructions for what is missing; exit 1 when anything is missing. Verify with CLI tests: with the Nix shell's tools every item is `ok` and the exit status is 0; with a PATH lacking TeX and `CHROMIUM_PATH` unset, TeX and Chromium are reported missing with their uses and the exit status is 1.
- [x] 3.2 End `dex init` with the `dex doctor` hint; list `dex doctor` in `scaffold/AGENTS.block.md` with when to run it; mention it in the README's "Requirements". Verify with the scaffold and CLI tests.

## 4. Integration

- [x] 4.1 Run `pnpm verify` inside `nix develop` (under the memory cap) and `openspec validate add-dependency-check --strict`. Run `dex doctor` inside and outside the Nix shell, and `dex check` on a copy of a content folder with an uncached diagram using the system TeX, and confirm the messages name `standalone.cls` and `FiraSans.sty`.
