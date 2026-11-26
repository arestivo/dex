---
name: author-deck
description: Create a new Dex slide deck or edit an existing one in this content folder (add, change, split, reorder or restyle slides). Use for any request to write, change or fix slides, unless it is a migration from remark.js (use migrate-remark-deck).
metadata:
  generatedBy: dex
---

# Write or edit a Dex deck

## 1. Learn the format

Run `dex docs` and read it. It is the complete, current reference for the deck format: front matter, `::slide{...}` declarations, directives, utility classes and how to make content fit. Run `dex docs layouts` to see which layouts exist and what slots they have. Don't rely on memory or other projects: the syntax is specific to Dex.

## 2. Find or create the deck

- Existing deck: `decks/<slug>/slides.md`. Read the whole file before changing it: tone, structure and existing ids matter.
- New deck: create `decks/<slug>/slides.md`. The slug is lowercase letters, digits and dashes, and it becomes the URL (`/<slug>/`). Start with the front matter, a `title` slide, and an `index` section slide with `::toc` when the deck has sections.

## 3. Choose ids carefully

Every slide starts with `::slide{#id ...}`. Ids are permanent once published: they are the slide's deep link and will key its discussion.

- New slides: a short, descriptive, unique id (`cors-preflight`, not `slide-12` or `new-slide`).
- Existing slides: **never** rename, renumber or reuse an id, even when you reword, move or split the slide. When you split a slide, keep the original id on the first part and give the new part a new id.
- Deleting a slide breaks its links. Tell the author before deleting a slide that may already be published.

## 4. Write

- One idea per slide. Split rather than shrink.
- Prefer Markdown and the documented directives over raw HTML.
- Put images in `decks/<slug>/assets/`, reference them as `assets/<file>` and give them alt text.
- Use the layouts (`dex docs layouts`) and utility classes (`dex docs`). Don't invent CSS classes or inline styles to fix a single slide.
- If the same arrangement keeps recurring and no layout fits, create a local layout instead (see the `author-layout` skill).

## 5. Validate until clean

1. `dex check <slug>`: fix every error **and** warning. Each message gives the file, line, slide and a suggested fix.
2. `dex fit <slug>`: fix every slide whose content doesn't fit (split it, switch to `two-columns`, or use `.small`/`.smaller`).

Repeat both until they report nothing.

## 6. Look at it

Run `dex dev`, open `/<slug>/#<id>` for the slides you changed, and check them in both themes (`d` toggles).

## 7. Report

Tell the author what you changed, which ids you added, anything you split or removed, and every judgement call they might want to revisit.
