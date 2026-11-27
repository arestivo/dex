# Proposal

## Why

Good slides explain with pictures: flows, loops, containers, sequences and charts. Agents already draw clear, coherent TikZ diagrams when they have somewhere to put shared styles and a palette to draw with. Today a Dex deck can only use bullets, tables or a static image made elsewhere. We want agents (and people) to draw diagrams with TikZ inside the slide source, using the slide's colours, rendered natively in both themes and checked like everything else. How the diagrams look is up to the content folder, not to Dex.

## What Changes

- **TikZ diagrams in slides.** A fenced code block tagged `tikz`, holding a `tikzpicture`, renders at build time as an inline SVG figure. It works without JavaScript, in print and in `dex fit`, is sized so that 10 TeX points equal 1em of slide text, and requires alt text.
- **Slide colours in TikZ, in both themes.** Dex defines its palette as TikZ colours (`DexInk`, `DexAccent`, …) and an `\ifDexDark` switch. Each diagram is compiled once with the light values and once with the dark values, and the viewer shows the rendering that matches the current theme, so colour mixes and custom colours work in both.
- **Preambles for shared styles.** A content folder can define TikZ styles and macros in `tikz/preamble.tex` (which may `\input` other files in `tikz/`), and a deck can add its own in `decks/<slug>/tikz.tex`. They are loaded, in that order, before every diagram. Dex ships no styles of its own.
- **Caching and errors.** Rendered SVGs are cached in the content folder (`.dex/cache/`, meant to be committed), so building needs TeX only for new or changed diagrams. TeX errors, including errors in preambles, and a missing toolchain become `dex check` diagnostics pointing at the right file and line.
- **`dex shot`** renders slides to PNG images (light and dark) so agents can look at what they drew.
- **One typeface for slides and diagrams.** Dex bundles Fira Sans and Fira Mono for slide text and code (npm `@fontsource` packages), and diagrams use the same fonts from TeX's `fira` package, so labels match the slide.
- **Installation documented.** The README lists what is needed for what: Node and pnpm always, Chromium for `dex fit`/`dex shot`, and TeX (XeLaTeX, dvisvgm and a few packages) only for new or changed diagrams, with commands per platform.
- **Short instructions for agents:** a "Diagrams" section in the authoring reference (`dex docs`) covering the block syntax, alt text, the colours and `\ifDexDark`, the preambles and `dex shot`. The managed `AGENTS.md` block and the `author-deck` skill mention diagrams.

## Capabilities

### New Capabilities

- `diagrams`: TikZ diagrams in slides: syntax, rendering to theme-aware inline SVG, sizing, alt text, slide colours, folder and deck preambles, caching, diagnostics and safe compilation.

### Modified Capabilities

- `deck-format`: fenced blocks in a diagram language render as diagrams, not as highlighted code.
- `deck-build`: the `dex` command gains `shot`, and slide screenshots are specified.
- `deck-viewer`: slides use the bundled typeface.
- `authoring-reference`: the authoring reference documents diagrams.
- `content-folder-setup`: the agent instructions mention diagrams and `dex shot`, and `dex init` ignores screenshots.

## Out of Scope

- Styles, macros, design rules or pattern galleries shipped by Dex.
- A dedicated diagram skill.
- Mermaid (needs a browser), themes, a generic migration skill, and removing retired skills.

## Impact

- New engine code: the diagram renderer and cache (core with injected I/O, real implementation alongside the workspace), and `src/cli/shot.ts`.
- Styles: diagram figure CSS (theme switching, print), a font face and token change.
- Dependencies: `@fontsource/fira-sans` and `@fontsource/fira-mono` (npm). Toolchain, optional and external: the Nix shell gains a TeX Live set with `xelatex`, `dvisvgm`, `standalone`, PGF/TikZ, `fontspec` and `fira` (`pgfplots` included for charts). The README documents installation on other platforms.
- Docs and agent material: a section in `docs/authoring.md`, `scaffold/AGENTS.block.md` and `author-deck`.
- Tests: rendering with the toolchain (skipped with a clear message when TeX is absent), preambles, cache behaviour, diagnostics, theme switching, and `dex shot`.
