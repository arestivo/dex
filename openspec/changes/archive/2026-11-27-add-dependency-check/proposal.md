# Proposal

## Why

Rendering a new diagram needs TeX, and today Dex only checks that the `xelatex` and `dvisvgm` programs exist. A TeX installation that has them but lacks a package every diagram loads (here, `standalone.cls` and `FiraSans.sty`) fails on every diagram, and Dex reports TeX's last words, "Emergency stop", instead of the missing file. This happened after a content folder switched theme: all its cached diagrams had to be rendered again, with a system TeX that was incomplete. Authors and agents need to know what is missing and how to fix it, ideally before anything breaks.

## What Changes

- **TeX check before rendering.** When a diagram is not cached, Dex checks once per run, besides the two programs, that TeX can find every file its diagrams load: `standalone.cls`, `tikz.sty`, `pgfsys-dvisvgm.def`, `fontspec.sty`, `FiraSans.sty`, `FiraMono.sty`. Missing files are reported at the diagram, named with the TeX Live package that provides them, with the fix: install those packages (README, "Requirements") or run Dex inside the engine's Nix shell.
- **`dex doctor`.** A new command that reports, without needing any deck, whether the tools each feature needs are present: Node.js (everything), Chromium (`dex fit`, `dex shot`), the TeX programs and files (new diagrams). Each missing item says what it is for and how to install it. It exits non-zero when anything is missing.
- **Real TeX errors.** When TeX fails, the diagnostic carries TeX's actual error ("File `standalone.cls' not found") instead of the "Emergency stop" that follows it, and a missing file gets the same install hint as the pre-check. This also covers packages loaded by a folder or deck preamble, which the pre-check can't know about.
- `dex init` ends by suggesting `dex doctor`. The agent instructions list `dex doctor` and say to run it when diagrams fail to render. The README's requirements section mentions it.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `diagrams`: the missing-toolchain check also covers the TeX files diagrams load; TeX errors report the real cause instead of "Emergency stop", with an install hint for missing files.
- `deck-build`: the `dex` command gains `doctor`, which checks the tools each feature needs.

## Impact

- `src/core/diagrams/toolchain.ts` (file lookup with `kpsewhich`, the required files and their packages), `src/core/diagrams/render.ts` (the check), `src/core/diagrams/tex.ts` (`parseTexLog`).
- New `src/cli/doctor.ts`; `src/cli/main.ts` (command and usage); `src/cli/init.ts` (closing hint); `src/cli/browser.ts` (a non-throwing lookup for the doctor).
- Docs: README ("Requirements"), `scaffold/AGENTS.block.md`.
- Tests: unit tests for the file lookup (with a fake `kpsewhich` on a temporary PATH), the log parsing and the doctor report; CLI tests for `dex doctor`.
