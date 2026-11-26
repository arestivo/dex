---
name: migrate-remark-deck
description: Recreate an existing remark.js slide deck (a remark markdown file plus its assets) as a Dex deck in this content folder. Use when the user asks to migrate, port, convert or move a remark deck, or gives a remark slides URL such as `https://example.org/slides/?s=http`.
metadata:
  generatedBy: dex
---

# Migrate a remark.js deck

You are recreating a remark.js deck as a Dex deck in this content folder. This is a careful rewrite by hand, not a mechanical conversion. Keep the author's content and intent, and make it fit the Dex format and 16:9 slides.

**First run `dex docs`** and read the whole deck format reference. Also run `dex docs layouts` to see the available layouts. The mapping below assumes you know that reference.

## Inputs

- **Source**: a remark site URL such as `https://example.org/slides/?s=http`, or a local remark checkout. In remark sites the deck is `<root>/markdown/<name>.md` and assets are `<root>/assets/<name>/...`, relative to the folder holding `index.html`.
- **Slug**: the new deck folder name. Default: the remark name (`http`).

Ask only if the source is missing or ambiguous.

## Procedure

1. **Fetch the source** into a temporary folder (not this content folder): `curl -sfL -o <tmp>/<name>.md <root>/markdown/<name>.md`. Read the whole file.
2. **Fetch assets**: list every `assets/<name>/...` reference (Markdown images *and* HTML `src`/`href`). Download each into `decks/<slug>/assets/`, dropping the `<name>/` prefix. Check that each download is a real file, not an HTML error page.
3. **Write `decks/<slug>/slides.md`** using the mapping below.
4. **Validate**: run `dex check <slug>` and fix every error and warning. Repeat until clean.
5. **Check fit**: run `dex fit <slug>` and fix every overflow (see "Making content fit" in `dex docs`). Repeat until clean.
6. **Look at it**: run `dex dev` and open `/<slug>/`. Check the title slide, the index, images, tables and the densest slides, in both themes (`d` toggles).
7. **Report** to the user: the slide count, the judgement calls you made (splits, retitles, dropped constructs), anything you couldn't map, and any likely typos you noticed but did **not** fix.

## Mapping remark.js → Dex

| remark.js | Dex |
| --- | --- |
| `name: x` + `layout: true` template slides (`inverse`, `normal`) | Drop them. Layouts replace templates. |
| `.indexlink[...]` navigation icons | Drop. The viewer has its own controls. |
| first `template: inverse` slide (deck title + author) | `::slide{#title layout=title}`. Put the title, subtitle and author in the front matter; use `::slot{name=footer}` for an author link. |
| `template: inverse` + `name: x` (chapter divider) | `::slide{#x layout=section}` |
| index slide with `.indexlist[ 1. [A](#a) ... ]` | `::slide{#index layout=section}` + `# Index` + `::toc` (check that the generated list matches the old one) |
| `name: x` on any slide | `#x`: **keep remark names as ids**, so old links like `?s=http#cors` still find the slide |
| a slide without `name:` | invent a short, descriptive, unique id from the heading (`status-4xx`, not `slide-37`) |
| `class: center, middle` | `layout=center` |
| `.box_info[x]` / `.box_warning[x]` / `.box_error[x]` / `.box_success[x]` / `.box_example[x]` | `:::info` / `:::warning` / `:::error` / `:::success` / `:::example` blocks |
| `.small[...]`, `.smaller[...]`, `.tiny[...]`, `.center[...]` (blocks) | `:::div{.small}` etc. |
| `<small>` wrapping a code block | `:::div{.smaller}` |
| `.pull-left[...]` + `.pull-right[...]`, `.left-column`/`.right-column` | `layout=two-columns` with `::slot{name=left}` / `::slot{name=right}` |
| `.key[Ctrl]` | `<kbd>Ctrl</kbd>` |
| `.red[x]` and other inline colour classes | `:span[x]{.accent}` (or `**x**`) |
| other `.class[...]` | the closest utility class listed in `dex docs`. If none fits, ask instead of inventing CSS. |
| lists of `**Term**<TAB>description` | a two-column Markdown table |
| `<ol start="4"><li>...` | Markdown `4. ...` |
| `assets/<name>/x.png` | `assets/x.png` |
| `<img src=... style="width: 30%">` | `![alt](assets/x.png)`, or `<img src=... alt=... style="height: 30cqh">` when a size is needed |
| `\#text` at line start inside a box | keep the escape: `\#text` |
| `<i class="fa ...">` icons | remove, or replace with words |
| `--` incremental reveals | not supported: merge into one slide and report it |
| `???` speaker notes | not supported: drop and report |
| `count: false`, `background-image:`, `exclude: true` | report. Drop `exclude: true` slides only if the user agrees. |

## Rules

- **Content fidelity**: keep the text, examples and links. You may improve structure (tables, two columns, splitting dense slides, distinct titles for repeated "Some X" slides) but not meaning. Don't add new content.
- **Ids are permanent**: once chosen and published they key deep links and discussions. Choose them carefully, and don't rename existing ones in later edits.
- **Every image gets alt text** describing what it shows.
- **16:9**: remark decks were 4:3, so expect some slides to need splitting or two columns.
- **No new CSS for one slide.** Prefer layouts, utilities and splitting. If a pattern recurs across decks, suggest a new layout to the author. Layouts belong to the Dex engine (see `dex docs layouts`).
- **Don't run code formatters over decks or assets.** Markdown formatters can rewrite the YAML front matter and break the deck, and some (Biome 2.6) exhaust all memory on draw.io SVG exports.
