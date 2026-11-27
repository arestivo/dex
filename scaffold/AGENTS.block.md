<!-- This block is managed by Dex: `dex init` rewrites it. Put your own notes outside the dex:start/dex:end markers. -->

## Working on these decks (Dex)

This folder holds slide decks built with **Dex**. Dex is the engine, installed separately. This folder is only content.

### Folder structure

```text
decks/<slug>/slides.md     one deck per folder; the slug is its URL (/<slug>/)
decks/<slug>/assets/       images and files that deck uses
decks/<slug>/layouts/      layouts only that deck uses (same files as local layouts)
layouts/<name>/            local layouts for every deck here (template.html, style.css, layout.md)
themes/<name>/             local colour themes (theme.css, theme.md)
dex.yaml                   folder settings (written by dex init): `theme: <name>` is the default theme of every deck here
tikz/preamble.tex          shared TikZ styles and macros for every deck's diagrams
decks/<slug>/tikz.tex      one deck's own TikZ styles (loaded after tikz/preamble.tex)
.dex/cache/                rendered diagrams: commit it, so builds need TeX only for new ones
dist/                      the built site: generated, never edit it by hand
```

### The deck format

Don't guess the syntax: read the reference that matches the installed engine.

- `dex docs` is the complete deck format (front matter, slides, directives, diagrams, utility classes, making content fit).
- `dex docs layouts` lists the layouts available here (built-in and local): what each is for, its slots, an example, and how to make a new one. `dex docs layouts --deck <slug>` adds that deck's own layouts.
- `dex docs themes` lists the colour themes available here, the folder's default, and how to make one.

### Rules

- **Slide ids are permanent.** Every slide starts with `::slide{#id ...}`. Once a deck is published, ids key deep links (`/<slug>/#<id>`) and discussions: never rename, renumber or reuse one. Reword headings freely instead.
- Choose short, descriptive ids when creating slides (`cors-preflight`, not `slide-12`).
- Keep each deck's files inside its own folder. Reference assets relatively (`assets/x.svg`) and give every image alt text.
- Don't add CSS or HTML styling to fix one slide. Use layouts, utility classes, or split the slide.
- When the same slide arrangement keeps recurring, create a layout and document it in its `layout.md`: a local layout (`dex new layout <name>`) when several decks could use it, or a deck layout (`dex new layout <name> --deck <slug>`) when only one deck needs it. A layout can't reuse the name of a wider one (built-in, then local).
- **The theme is the author's choice.** Don't change a deck's `theme:`, change `dex.yaml`, or create or edit themes unless the user asks. When they ask for other colours, check `dex docs themes` for an existing theme first, and otherwise follow the `author-theme` skill.
- Draw diagrams in ```` ```tikz alt="..." ```` blocks (see "Diagrams" in `dex docs`). Use the slide colours (`DexInk`, `DexAccent`, `DexAccentSoft`…) so they work in light and dark mode, and put shared `\tikzset` styles in `tikz/preamble.tex` instead of repeating them in every block.

### Commands

```sh
dex check [slug...]     # validate decks: errors and warnings with file:line and a fix
dex fit [slug...]       # find slides whose content doesn't fit (headless browser)
dex shot <slug> [id...] # save slides as images (light + dark) in .dex/shots/ to look at them
dex dev                 # live preview at http://localhost:5173/
dex build               # build the site into dist/
dex docs [topic]        # the reference (see above)
dex new layout <name>   # create a local layout in layouts/<name>/ (--deck <slug>: in that deck)
dex new theme <name>    # create a local colour theme in themes/<name>/ (only when asked)
dex init                # refresh these instructions and the skills after a Dex upgrade (keeps dex.yaml)
dex init --theme <name> # set the folder's default theme in dex.yaml (only when asked)
```

### Done means

1. `dex check` reports no errors and no warnings for the decks you touched.
2. `dex fit` reports no overflow for them.
3. You looked at the changed slides: `dex shot <slug> <id...>` and open the images (or `dex dev`, in light and dark mode: `d` toggles). For diagrams, check that labels fit their boxes and arrows don't cross boxes.
4. You reported any judgement calls (splits, new ids, dropped content) to the author.

### Skills

{{skills}}
