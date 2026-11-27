# Dex

Dex is a Markdown slide engine with **stable, deep-linkable slides**. Every slide has a permanent id (`/http/#cors-preflight`), so links keep working when decks change, and per-slide discussion can be added later.

Decks are Markdown files compiled at build time into static pages that work on any static host, without JavaScript, and in print.

This repository is only the engine (`dex`). Your decks live in a separate **content folder**:

```text
talks/                   ← run the commands here (or pass --folder talks)
  decks/
    http/
      slides.md
      assets/
  layouts/               ← optional local layouts (dex new layout <name>)
  dist/                  ← the built site (or --dist <dir>)
```

## Requirements

What you need depends on what you do:

| To… | You need |
| --- | --- |
| build, preview and check decks (including decks whose diagrams are already in `.dex/cache/`) | Node.js ≥ 24 and pnpm |
| run `dex fit`, `dex shot` or the e2e tests | Chromium (found on `PATH`, or set `CHROMIUM_PATH`) |
| draw **new or changed** TikZ diagrams | XeLaTeX and dvisvgm, with the TeX packages `standalone`, `pgf`, `fontspec` and `fira` (`pgfplots` for charts) |

Readers of the built site need nothing: diagrams are plain SVG, and the Fira fonts are bundled.

TeX, by platform:

```sh
# Nix: everything above (Node, pnpm, Chromium, TeX)
nix develop

# Debian / Ubuntu (texlive-fonts-extra is large: it is where Fira lives)
sudo apt install texlive-xetex texlive-latex-recommended texlive-latex-extra \
  texlive-pictures texlive-fonts-extra dvisvgm

# Fedora
sudo dnf install texlive-xetex texlive-fontspec texlive-standalone texlive-pgf \
  texlive-pgfplots texlive-fira texlive-dvisvgm

# macOS: MacTeX has everything (brew install --cask mactex-no-gui), or BasicTeX plus:
sudo tlmgr install standalone pgf pgfplots fontspec fira dvisvgm
```

`dex check` tells you when a diagram needs rendering and TeX is missing.

## Setup

```sh
nix develop          # or install the requirements above yourself
pnpm install
alias dex="node $PWD/src/cli/main.ts"
```

## Usage

```sh
mkdir ~/talks && cd ~/talks
dex init              # decks/, .gitignore, AGENTS.md + skills for AI agents
dex dev               # http://localhost:5173/  →  /http/
dex check             # validate every deck (or: dex check http)
dex fit               # find slides whose content doesn't fit (needs Chromium)
dex shot http title   # save slide images (light + dark) in ./.dex/shots/
dex build             # static site in ./dist (or --dist ~/www/slides)
dex preview           # serve the built site like a static host
dex docs              # the deck format reference (dex docs layouts: the layouts)
dex new layout quote  # a local layout in ./layouts/quote/
```

Commit `.dex/cache/` with your decks: it holds the rendered diagrams, so other machines can build without TeX. Re-run `dex init` after upgrading Dex: it refreshes only the Dex-managed block in `AGENTS.md` and the Dex skills, and keeps your own notes.

Inside this repository, `pnpm dev`, `pnpm check:decks`, `pnpm build`… do the same with the repository as the content folder. Its `decks/` and `dist/` are git-ignored, for local testing only.

- Writing decks, including TikZ diagrams: [docs/authoring.md](docs/authoring.md) (also `dex docs`)
- Layouts: built-in ones in [layouts/](layouts/), each with a `layout.md`; local ones in a content folder's `layouts/`. Guide: [docs/layouts.md](docs/layouts.md) (`dex docs layouts` adds the list for a folder)
- Agent skills installed by `dex init`: [scaffold/skills/](scaffold/skills/) (`author-deck`, `author-layout`, `migrate-remark-deck`)
- Working on the engine (structure, commands, conventions, specs): [AGENTS.md](AGENTS.md)

## Viewer shortcuts

| Key | Action |
| --- | --- |
| `→` `↓` `Space` `PageDown` `n` | next slide |
| `←` `↑` `Shift+Space` `PageUp` `p` | previous slide |
| `Home` / `End` | first / last slide |
| `d` | toggle light/dark theme |

Swipe left/right on touch screens. The 🔗 button copies a link to the current slide.
