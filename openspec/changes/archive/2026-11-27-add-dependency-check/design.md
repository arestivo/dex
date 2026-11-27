# Design

## Context

`createTexRenderer` (`src/core/diagrams/render.ts`) looks up the programs once per renderer, through `missingTexPrograms` in `toolchain.ts` (one of the I/O modules of `core/`), only when a diagram misses the cache. The wrapper (`wrapper.ts`) loads `standalone` (with the `tikz` option), `FiraSans`, `FiraMono` and PGF's dvisvgm driver; `fontspec` comes with `FiraSans` under XeLaTeX. `parseTexLog` (`tex.ts`) takes the first `file:line: message` from the log, which for a missing file is `./main.tex:2: Emergency stop.`, while the cause sits on the `! LaTeX Error: File ... not found.` line before it. Chromium is found by `findChromium` (`src/cli/browser.ts`), which throws when none is found.

## Goals / Non-Goals

**Goals:**
- Name the missing piece and its fix, before running TeX when possible and from TeX's log otherwise.
- One command that answers "can this machine do everything Dex does?".

**Non-Goals:**
- Installing anything, or detecting the platform's package manager. The doctor shows the install commands for NixOS/Nix, Debian/Ubuntu, Fedora and macOS, as the README does.
- Checking packages that only some preambles load (`pgfplots`, …). Those are reported from TeX's log, by the improved parsing.
- Checking versions of TeX packages, `dvisvgm` or Chromium.

## Decisions

- **`kpsewhich` for files.** Every TeX distribution (TeX Live, MiKTeX, MacTeX) ships `kpsewhich`, which resolves file names through TeX's own search paths without running TeX. One call with all the required names prints the path of each file it finds; a file whose basename is not among the output is missing. If `kpsewhich` itself is missing while `xelatex` is present (unusual), the file check is skipped and the log parsing still names a missing file. Alternative: compile a test document. Rejected: slower (one XeLaTeX run), and it stops at the first missing file instead of listing them all.
- **The required files live in `toolchain.ts`,** next to the programs, as a list of `{ file, package }` (`standalone.cls`/`standalone`, `tikz.sty`/`pgf`, `pgfsys-dvisvgm.def`/`pgf`, `fontspec.sty`/`fontspec`, `FiraSans.sty`/`fira`, `FiraMono.sty`/`fira`). A unit test checks that the wrapper still loads exactly those (`standalone`, `FiraSans`, `FiraMono`, the driver), so the list can't drift from the wrapper.
- **Same place, same once-per-run cost.** `missingTexPrograms` becomes `missingTex(path)`, returning missing programs and missing files. The renderer calls it at the same point (first cache miss), so cached builds still never touch TeX, and the error stays at the block, as today. The message names everything missing and ends with the fix: install the packages (README, "Requirements"), or run Dex inside the engine's Nix shell (`nix develop <engine>`).
- **Log parsing.** `parseTexLog` looks at the first `! ` error line as well as the first `file:line:` line. When the `file:line` message is "Emergency stop." and a `!` error comes before it, the message is the `!` line (without `! `), and the location still comes from the `file:line` line (mapped as today). A message matching ``File `X' not found`` gets the hint: "Install the TeX package that provides X, or run Dex inside the engine's Nix shell."
- **`dex doctor` in `src/cli/doctor.ts`.** It runs the checks and prints one line per item (`ok`/`missing`, the path or version found, what it is for), then, if something is missing, the install instructions for that group. Node is checked with `process.versions.node` (≥ 24). Chromium uses a non-throwing variant of `findChromium` (returns the path or undefined); `findChromium` keeps throwing for `fit` and `shot`. The doctor ignores `--folder`: it checks the machine, not content. Exit status 1 when anything is missing. Output is plain text (no colours needed for meaning), so agents can read it.
- **Guidance.** `dex init` ends with "Check the tools with: dex doctor". The managed AGENTS block lists `dex doctor` and says to run it when a diagram fails to render or `dex fit` can't find a browser, and to report what it says rather than work around it.

## Risks / Trade-offs

- [`kpsewhich` finds a file that TeX then can't load (broken installation)] → the log parsing still reports TeX's real error.
- [A new required file is added to the wrapper but not to the list] → the unit test comparing the wrapper with the list fails.
- [Package names differ between distributions (Debian bundles Fira in `texlive-fonts-extra`)] → the message names TeX Live packages and points to the README, which lists the per-platform commands.
