<!-- This block is managed by Dex: `dex init` rewrites it. Put your own notes outside the dex:start/dex:end markers. -->

## Working on these decks (Dex)

This folder holds slide decks built with **Dex**. Dex is the engine, installed separately. This folder is only content.

### Layout

```text
decks/<slug>/slides.md     one deck per folder; the slug is its URL (/<slug>/)
decks/<slug>/assets/       images and files that deck uses
dist/                      the built site: generated, never edit it by hand
```

### The deck format

Don't guess the syntax: read the reference that matches the installed engine.

- `dex docs` is the complete deck format (front matter, slides, directives, utility classes, making content fit).
- `dex docs layouts` lists the available layouts and their slots.

### Rules

- **Slide ids are permanent.** Every slide starts with `::slide{#id ...}`. Once a deck is published, ids key deep links (`/<slug>/#<id>`) and discussions: never rename, renumber or reuse one. Reword headings freely instead.
- Choose short, descriptive ids when creating slides (`cors-preflight`, not `slide-12`).
- Keep each deck's files inside its own folder. Reference assets relatively (`assets/x.svg`) and give every image alt text.
- Don't add CSS or HTML styling to fix one slide. Use layouts, utility classes, or split the slide.

### Commands

```sh
dex check [slug...]   # validate decks: errors and warnings with file:line and a fix
dex fit [slug...]     # find slides whose content doesn't fit (headless browser)
dex dev               # live preview at http://localhost:5173/
dex build             # build the site into dist/
dex docs [topic]      # the reference (see above)
dex init              # refresh these instructions and the skills after a Dex upgrade
```

### Done means

1. `dex check` reports no errors and no warnings for the decks you touched.
2. `dex fit` reports no overflow for them.
3. You looked at the changed slides with `dex dev` (both themes: `d` toggles).
4. You reported any judgement calls (splits, new ids, dropped content) to the author.

### Skills

{{skills}}
