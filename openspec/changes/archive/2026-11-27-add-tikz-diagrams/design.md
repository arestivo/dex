# Design

## Context

Slides are compiled by `compileDeck` (`src/core/compile.ts`): Markdown becomes mdast, then hast, and fenced code is replaced by Shiki output in the `code` handler of `markdownToHast`. Shiki highlighting is prepared asynchronously once per deck (`prepareHighlighter`) and then used synchronously. The core is pure apart from injected I/O (`assetExists`). Browser-based tooling already exists for `dex fit` (`playwright-core` with the system Chromium, `src/build/site.ts` for build and preview). Content folders already hold their own building blocks (`layouts/`). Diagram styles follow the same pattern (`tikz/`).

The machine has `lualatex`, TikZ and `fontspec`, but not `dvisvgm`, `standalone`, `pgfplots` or `fira`. The Nix shell must provide a complete set, and the README must say what other platforms need. See proposal.md for the motivation.

## Goals / Non-Goals

**Goals:**

- Dex provides the mechanism (rendering, colours, both themes, preambles, cache, diagnostics, screenshots), and content decides how diagrams look.
- The output is a static, accessible SVG that works without JavaScript, in print and in `dex fit`.
- An agent can iterate: write, check (TeX errors map to the right file and line), look (`dex shot`), fix.
- TeX is needed only to render new or changed diagrams.
- Diagram labels use the slide typeface (Fira Sans, Fira Mono), so diagrams look native to the slide.

**Non-Goals:**

- Styles, macros or design guidance shipped by Dex.
- Selectable text inside diagrams (labels become vector paths; meaning is carried by alt text).
- Mermaid or any other diagram language.

## Decisions

### Toolchain: XeLaTeX → XDV → dvisvgm

Each rendering compiles a `standalone` document with `xelatex -no-pdf -file-line-error`, then converts the XDV with `dvisvgm --no-fonts --exact-bbox`. XeLaTeX lets preambles use any installed font through `fontspec`. XDV is dvisvgm's native input. `--no-fonts` turns glyphs into paths, so the SVG renders identically everywhere. `-file-line-error` makes TeX report errors as `file:line: message`, which maps directly onto block or preamble lines.

- *Alternative:* LuaLaTeX → PDF → `pdftocairo -svg`. It works, but adds poppler and produces heavier SVGs.
- **Spike result:** PGF must use its dvisvgm driver (`\def\pgfsysdriver{pgfsys-dvisvgm.def}` before the class loads TikZ). Under XeTeX it defaults to the xdvipdfmx driver, whose specials dvisvgm ignores: the result is text without shapes, at wrong positions. With the dvisvgm driver, shapes, layers, colour mixes and a tight bounding box all render correctly.

### The document Dex compiles

```latex
\def\pgfsysdriver{pgfsys-dvisvgm.def}         % see the spike result above
\documentclass[tikz,border=1pt]{standalone}
\usepackage[sfdefault]{FiraSans}             % the slide typeface (TeX package `fira`)
\usepackage{FiraMono}
\usetikzlibrary{arrows.meta,positioning,calc,fit,backgrounds,shapes.geometric}
\newif\ifDexDark  \DexDarktrue | \DexDarkfalse
\input{dex-palette.tex}                       % generated, this theme's values
\input{tikz/preamble.tex}                     % if the folder has one
\input{deck-tikz.tex}                         % copy of decks/<slug>/tikz.tex, if any
\begin{document}\color{DexInk}
\input{block.tex}                             % the tikz block, verbatim
\end{document}
```

- **Libraries:** a few common TikZ libraries are loaded for convenience. They add capabilities, not looks. Preambles can load more, including `pgfplots`.
- **The block** is checked to contain exactly one `tikzpicture` before compiling, which gives a clear error instead of a TeX one. It lives in its own file, so a `block.tex:<n>` error maps to `slides.md` line `fence line + n`.
- **Preamble errors** are reported as `tikz/…:<n>` or `decks/<slug>/tikz.tex:<n>`, because the temporary files keep the content folder's relative paths. Some errors have no useful line: an unbalanced brace makes TeX read to the end of the file and report the error at the wrapper's `\input` line. Errors reported at a wrapper line are attributed to the file that line inputs (the preamble, or the block), without a line number.

### Palettes generated from the CSS tokens

`styles/tokens.css` is the single source of truth. At render time the engine reads the `--color-*`/`--tone-*: light-dark(#light, #dark)` declarations and writes `dex-palette.tex` for the theme being rendered, with `\definecolor{Dex…}{HTML}{…}`:

| TikZ colour | Token |
| --- | --- |
| `DexInk`, `DexMuted`, `DexPaper` | `--color-text`, `--color-muted`, `--color-bg` |
| `DexSurface`, `DexBorder` | `--color-surface`, `--color-border` |
| `DexAccent`, `DexAccentSoft` | `--color-accent`, `--tone-info-bg` |
| `DexInverse`, `DexInverseText` | `--color-inverse-bg`, `--color-inverse-text` |
| `DexInfo`, `DexWarning`, `DexError`, `DexSuccess`, `DexExample` | `--tone-*`, each with a `…Soft` variant from `--tone-*-bg` |

Compiling twice, once with each palette and `\ifDexDark` set accordingly, makes every colour expression theme-correct with no post-processing. That includes mixes (`DexAccent!30`), opacity, and a preamble's own colours defined per theme. A unit test checks that every documented `Dex…` name resolves in both palettes.

### Pipeline integration: a pre-pass, like Shiki

`compileDeck` gains an injected `DiagramRenderer`:

```
renderDiagrams(deck, blocks: { source, line }[]) → per block: { light, dark } | { diagnostics }
```

It runs before the hast conversion, the same way `prepareHighlighter` does. The `code` handler then emits the figure, or nothing plus diagnostics. The core stays pure: `workspace.ts` provides the real renderer (file system, child processes, cache, preamble lookup) and tests inject a fake. Blocks are rendered in parallel, limited to about half the CPUs.

### Output markup and theme switching

```html
<figure class="diagram" role="img" aria-label="…alt…">
  <svg class="diagram__render diagram__render--light" aria-hidden="true" style="width: 11.2em">…</svg>
  <svg class="diagram__render diagram__render--dark"  aria-hidden="true" style="width: 11.2em">…</svg>
</figure>
```

- **Width:** dvisvgm's point width divided by 10, in `em`, with `max-width: 100%` and `height: auto`.
- **Unique ids:** dvisvgm's internal ids (glyph paths, clip paths) are prefixed per figure and theme, rewriting `id`, `href`/`xlink:href` and `url(#…)`, so several SVGs can share one page.
- **Theme switching:** CSS in the `components` layer shows the light rendering by default and the dark one under `@media (prefers-color-scheme: dark)` unless `[data-theme="light"]`, or under `[data-theme="dark"]`. Print always shows the light rendering.

### Cache

Renderings are stored in `.dex/cache/diagrams/<sha256>.light.svg` and `.dark.svg`, holding normalised dvisvgm output without the per-page id prefix. The key hashes:

- a renderer version string and the wrapper;
- both generated palettes;
- the contents of every file in the folder's `tikz/` folder, so a folder preamble change re-renders the folder's diagrams;
- the deck's `tikz.tex`, so a deck preamble change re-renders only that deck's diagrams;
- the block's source.

A cache hit needs no TeX. The folder is meant to be committed: `dex init` does not ignore it. In the engine repository (the root doubles as test content), `/.dex/` is git-ignored. Unused cache entries are not cleaned up in this change.

### Toolchain detection and safety

- **Detection:** `xelatex` and `dvisvgm` are looked up once per run. When a block misses the cache and either is missing, the block gets a diagnostic that names the programs and the Nix shell.
- **Isolation:** each compilation runs in a fresh temporary folder holding only the wrapper, the generated palette, `block.tex`, a copy of the folder's `tikz/`, and the deck's `tikz.tex` at its relative path.
- **TeX flags:** `-no-shell-escape -halt-on-error -interaction=nonstopmode`, the environment variables `openin_any=p` and `openout_any=p` (kpathsea's paranoid mode), and a 30-second timeout.
- **Errors:** the diagnostic carries the first `file:line: message` from the log, mapped to the content folder's file (or to the inputted file, without a line, when TeX blames the wrapper).

### Fonts: Fira Sans and Fira Mono, for slides and diagrams

Slides and diagrams share one typeface, so labels look native:

- **Web:** the npm dependencies `@fontsource/fira-sans` (400, 400 italic, 600, 700) and `@fontsource/fira-mono` (400, 500) are imported in a new `styles/fonts.css` (base layer), and the tokens become `--font-sans: "Fira Sans", system-ui, …` and `--font-mono: "Fira Mono", ui-monospace, …`. Vite bundles the woff2 files into `_app/`, so readers need nothing installed.
- **TeX:** the `fira` package's `FiraSans` (`sfdefault`) and `FiraMono` are loaded by the wrapper. They are files of the TeX installation, so loading them works under kpathsea's paranoid mode.
- A preamble may still switch fonts for its own diagrams.

### Installing the toolchain (README)

The README gets a "Requirements" section:

- **Always:** Node ≥ 24 and pnpm. That is enough to build and view decks whose diagrams are cached, and decks without diagrams.
- **For `dex fit`, `dex shot` and the e2e tests:** Chromium (or `CHROMIUM_PATH`).
- **For new or changed diagrams:** XeLaTeX, dvisvgm, and the TeX packages `standalone`, `pgf`, `fontspec` and `fira` (`pgfplots` optional). The section gives commands for Nix (`nix develop`), Debian/Ubuntu, Fedora and macOS (MacTeX/BasicTeX with `tlmgr`).

`dex check` names the missing programs when a diagram needs rendering.

### `dex shot`

`src/cli/shot.ts` reuses the `dex fit` machinery: build into the output folder, serve it with preview, open headless Chromium at 1280×720. For each slide and theme it sets the theme the way the viewer does (`localStorage` and `data-theme`), opens `#<id>`, waits for `document.fonts.ready`, and screenshots only the current `.slide` element, so the viewer chrome is excluded. Images go to `.dex/shots/<slug>/<id>-<theme>.png`, which `dex init` ignores.

### Agent material

- **A "Diagrams" section in `docs/authoring.md`:**
  - the block syntax and `alt`;
  - the colour table and `\ifDexDark`, with a small example of per-theme custom colours;
  - the preamble files and their order (shared styles belong in `tikz/preamble.tex`);
  - the cache and when TeX is needed;
  - `dex shot`.

  Its `tikz` examples are rendered in a test (skipped without TeX).
- **`scaffold/AGENTS.block.md`** gains `tikz/` in the folder structure, `dex shot` in the commands, and a line saying to look at changed slides with `dex shot`.
- **`author-deck`** gains a short paragraph on diagrams.

## Risks / Trade-offs

- [The XeLaTeX/dvisvgm chain doesn't behave as expected (fonts, bounding box, `-file-line-error` through `\input`)] → A spike comes first. LuaLaTeX → PDF → `pdftocairo` is the documented fallback.
- [The first build of a deck with many diagrams is slow (two compilations each)] → Parallel rendering and a persistent cache. A committed cache makes it a one-time cost per change.
- [Editing any file in `tikz/` re-renders every diagram in the folder] → Accepted: it is what keeps the cache correct. Deck preambles stay deck-local.
- [A Dex upgrade that touches the wrapper or palette invalidates every cached diagram, so TeX is needed again] → Accepted. The diagnostic says exactly why and what is needed.
- [The web and TeX copies of Fira differ slightly in version] → Same family and metrics in practice. A visual check in task 7.1 covers it.
- [Labels as paths aren't selectable or searchable] → Alt text carries the meaning. Slide text stays text.

## Migration Plan

1. Engine: add the renderer, viewer CSS, `dex shot` and docs. Existing decks are unaffected: none has `tikz` blocks.
2. Content folders: run `dex init` to refresh the instructions (prompted by `dex check`). Commit `.dex/cache/` together with decks that contain diagrams.
