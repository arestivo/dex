---
name: author-layout
description: Create or change a local layout in this content folder's layouts/ (a reusable slide structure with its own template, style and usage notes). Use when slides keep repeating the same arrangement, or the user asks for a new kind of slide, a layout, or a template.
metadata:
  generatedBy: dex
---

# Create or change a local layout

A layout decides where a slide's content goes and how it looks. Local layouts live in `layouts/<name>/` and are available to every deck in this folder.

## 1. Decide whether a layout is the right tool

Run `dex docs layouts` first: it lists every layout already available (built-in and local), with what each is for.

Create a layout only for an arrangement that recurs, e.g. a quote with its source, a definition card, an exercise with a hint, or a code-versus-output comparison. For a single slide, use an existing layout, utility classes (see `dex docs`), or split the slide. Changing an existing local layout changes every slide that uses it: check where it is used first (`grep -rn "layout=<name>" decks/`).

Local layouts cannot reuse a built-in name (`default`, `title`, `section`, `center`, `two-columns`).

## 2. Create it

```sh
dex new layout <name>
```

This writes `layouts/<name>/template.html`, `style.css` and `layout.md` as a working starting point. Names are lowercase letters, digits and dashes.

## 3. Write the template (`template.html`)

Read "Making layouts" in `dex docs layouts` for the details. The rules that matter most:

- Mark where content goes with `<slot></slot>` (the default slot) and `<slot name="x"></slot>` (named slots, filled after `::slot{name=x}` in a slide). Children of a slot are its fallback.
- Keep the `title` slot convention: a slot named `title` automatically receives the slide's leading heading. Reuse `header.slide__header` and `div.slide__body` when the layout has a title bar and a body.
- Name your own elements BEM-style after the layout (`.quote`, `.quote__source`).
- Keep the leading comment up to date: what the layout is for and its slots.

## 4. Style it (`style.css`)

- `:scope` is the slide. Every selector only matches inside slides using this layout.
- Use design tokens (`--color-*`, `--space-*`, `--radius-*`) instead of raw colours and sizes, so light and dark themes both work.
- Size in `em`: slides scale with the window, and `em` scales with them. `cqh`/`cqw` are percentages of the slide.
- No `@import` and no `@layer` (Dex adds the layer). Don't style anything outside the slide.

## 5. Document it (`layout.md`)

People and other agents learn the layout only from this file (shown by `dex docs layouts`):

- `description`: one line in the front matter, saying what the layout is for. `dex check` warns while it is empty.
- `## When to use`: which slides it is for, and when another layout is better.
- `## Slots`: how to fill each slot. The slot names themselves are listed automatically.
- `## Example`: a complete, valid slide using the layout in a fenced `markdown` block.

## 6. Verify

1. Use the layout in at least one real slide.
2. `dex check`: no errors and no warnings for the layout (template variables, CSS rules, `layout.md`).
3. `dex fit`: slides using the layout fit at both sizes.
4. `dex dev`: look at those slides in both themes (`d` toggles), with short and long content.
5. `dex docs layouts`: the layout appears with its description and notes.

## 7. Report

Tell the author the layout's name, what it is for, which slides now use it, and any slides you changed to use it.
