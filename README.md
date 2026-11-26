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
  dist/                  ← the built site (or --dist <dir>)
```

## Setup

```sh
nix develop          # Node 24, pnpm, Chromium (or install them yourself)
pnpm install
alias dex="node $PWD/src/cli/main.ts"
```

## Usage

```sh
cd ~/talks
dex dev          # http://localhost:5173/  →  /http/
dex check        # validate every deck (or: dex check http)
dex fit          # find slides whose content doesn't fit (needs Chromium)
dex build        # static site in ./dist (or --dist ~/www/slides)
dex preview      # serve the built site like a static host
```

Inside this repository, `pnpm dev`, `pnpm check:decks`, `pnpm build`… do the same with the repository as the content folder. Its `decks/` and `dist/` are git-ignored, for local testing only.

- Writing decks: [docs/authoring.md](docs/authoring.md)
- Adding layouts: [docs/layouts.md](docs/layouts.md)
- Migrating a remark.js deck: [.agents/skills/migrate-remark-deck/SKILL.md](.agents/skills/migrate-remark-deck/SKILL.md)
- Working on the engine (structure, commands, conventions, specs): [AGENTS.md](AGENTS.md)

## Viewer shortcuts

| Key | Action |
| --- | --- |
| `→` `↓` `Space` `PageDown` `n` | next slide |
| `←` `↑` `Shift+Space` `PageUp` `p` | previous slide |
| `Home` / `End` | first / last slide |
| `d` | toggle light/dark theme |

Swipe left/right on touch screens. The 🔗 button copies a link to the current slide.
