# Tasks

## 1. Toolchain spike and environment

- [x] 1.1 Add the TeX Live set (`xelatex`, `dvisvgm`, `standalone`, PGF/TikZ, `pgfplots`, `fontspec`, `fira`) to `flake.nix`; verify `nix develop -c xelatex --version` and `nix develop -c dvisvgm --version` work
- [x] 1.2 Spike: compile a hand-written wrapper (sans labels, a colour mix, `fit` on the background layer, a preamble loaded with `\input` that contains a deliberate error) with `xelatex -no-pdf -file-line-error` and `dvisvgm --no-fonts --exact-bbox`; verify correct glyphs, a tight bounding box, the mixed colour, and an error reported as `tikz/preamble.tex:<line>`. Record any deviation from design.md (or switch to the documented fallback) before continuing

## 2. Palettes

- [x] 2.1 Generate the light and dark `dex-palette.tex` from the `light-dark()` tokens in `styles/tokens.css`, plus `\ifDexDark`; verify a unit test that every documented `Dex…` colour is defined in both palettes with the token's values

## 3. Renderer and cache

- [x] 3.1 Implement block validation (exactly one `tikzpicture`) and `alt` parsing from the info string; verify unit tests for a valid block, text outside the environment, no environment, and missing alt (warning)
- [x] 3.2 Implement the TeX renderer: an isolated temp folder with the wrapper, palette, block, a copy of `tikz/` and the deck's `tikz.tex`; paranoid kpathsea, no shell escape, timeout, two palettes; `file:line` log parsing mapped back to `slides.md` or the preamble file. Verify tests (skipped without TeX): a successful render, folder and deck preambles in order (deck overrides folder), an `\input` of another `tikz/` file, an error in the block mapped to its deck line, an error in a preamble mapped to its file and line, a `\write18` attempt that runs nothing, and an `\input` outside the folder that fails
- [x] 3.3 Implement the cache (`.dex/cache/diagrams/<hash>.<theme>.svg`, key over version, wrapper, palettes, `tikz/` contents, deck `tikz.tex` and source) and toolchain detection with its diagnostic; verify tests: an unchanged deck compiles nothing the second time, one edited block recompiles only itself, a deck preamble edit recompiles only that deck, a fully cached deck builds with TeX hidden from `PATH`, and an uncached block without TeX reports the missing programs
- [x] 3.4 Integrate into `compileDeck` through an injected `DiagramRenderer` (pre-pass, figure markup, id prefixing, em width) and exclude `tikz` from the unknown-language warning; verify unit tests with a fake renderer for markup, unique ids across two figures, width conversion, and diagnostics placement

## 4. Viewer

- [x] 4.1 Add diagram CSS (theme switching including `data-theme` overrides, light in print, max-width); verify an e2e test that toggling the theme switches the visible rendering and print shows light
- [x] 4.2 Bundle Fira Sans and Fira Mono (`@fontsource/fira-sans`, `@fontsource/fira-mono`) in `styles/fonts.css`, update the font tokens, and load `FiraSans`/`FiraMono` in the diagram wrapper; verify the built CSS references the bundled woff2 files, an e2e test that slide text computes to Fira Sans, and a rendered diagram's labels use Fira

## 5. `dex shot`

- [x] 5.1 Implement `src/cli/shot.ts` and wire `shot` into `main.ts` (usage text included); verify CLI tests: one slide writes light and dark PNGs with their paths printed, a whole deck writes every slide, an unknown slide or deck fails writing nothing
- [x] 5.2 Make `dex init` also ignore `.dex/shots/` (never `.dex/cache/`), and ignore `/.dex/` in the engine repository; verify scaffold tests for the new `.gitignore` lines and that the cache is never ignored

## 6. Agent material

- [x] 6.1 Add the "Diagrams" section to `docs/authoring.md` (syntax, alt, colours and `\ifDexDark`, preambles and order, cache, `dex shot`); verify a test (skipped without TeX) that every `tikz` example in it renders without error
- [x] 6.2 Update `scaffold/AGENTS.block.md` (`tikz/` in the folder structure, `dex shot`, look at changed slides) and `author-deck` (a short diagrams paragraph); verify the scaffold tests and the content-of-instructions requirement
- [x] 6.3 Update the engine AGENTS.md (diagram pipeline, preambles, cache, `dex shot`, toolchain) and add a README "Requirements" section (Node/pnpm always; Chromium for `dex fit`/`dex shot`/e2e; XeLaTeX, dvisvgm and the `standalone`, `pgf`, `fontspec`, `fira` packages only for new diagrams, with commands for Nix, Debian/Ubuntu, Fedora and macOS); verify the docs describe the cache as committed and TeX as needed only for new diagrams, and the Debian/Ubuntu package list resolves to those files

## 7. Integration

- [x] 7.1 Add a `tikz` slide and a `tikz/preamble.tex` to the e2e fixture. Then, in a scratch content folder, let an agent-style deck define its own styles in `tikz/preamble.tex` and draw three diagrams like the reference Beamer deck's (a chain, a container loop, a sequence), and review them with `dex shot` in both themes; verify `dex check`, `dex fit` and the screenshots
- [x] 7.2 Run `pnpm verify` and `pnpm test:e2e`; verify both pass

## Workflow follow-up

- Archive the change once implemented and reviewed.
- Commit following AGENTS.md: `feat(diagrams): render TikZ diagrams in slides`.
