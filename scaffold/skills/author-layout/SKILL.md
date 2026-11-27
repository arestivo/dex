---
name: author-layout
description: Create or change a layout (a reusable slide structure with its own template, style and usage notes), either local in this content folder's layouts/ for every deck, or for one deck in decks/<slug>/layouts/. Use when slides keep repeating the same arrangement, or the user asks for a new kind of slide, a layout, or a template.
metadata:
  generatedBy: dex
---

# Create or change a layout

A layout decides where a slide's content goes and how it looks. There are two kinds you can make here:

- **local layouts** in `layouts/<name>/`, available to every deck in this folder;
- **deck layouts** in `decks/<slug>/layouts/<name>/`, available only to that deck.

## 1. Decide whether a layout is the right tool

Run `dex docs layouts --deck <slug>` first (for the deck you are working on): it lists every layout that deck can already use (built-in, local and its own), with what each is for.

Create a layout only for an arrangement that recurs, e.g. a quote with its source, a definition card, an exercise with a hint, or a code-versus-output comparison. For a single slide, use an existing layout, utility classes (see `dex docs`), or split the slide. Changing an existing local layout changes every slide that uses it: check where it is used first (`grep -rn "layout=<name>" decks/`).

Then choose the kind:

- **Local** when other decks could use it too. Shared layouts keep decks consistent, and this is the usual choice.
- **Deck** when only this deck needs it (one case study, one talk's recurring figure), or when the deck should stay self-contained so it can be moved to another content folder with its layouts.

Names can't clash with a wider layout: a local layout can't reuse a built-in name (`default`, `title`, `section`, `center`, `two-columns`), and a deck layout can't reuse a built-in or local name. Two decks may each have their own layout with the same name.

## 2. Create it

```sh
dex new layout <name>                # local: layouts/<name>/
dex new layout <name> --deck <slug>  # deck: decks/<slug>/layouts/<name>/
```

This writes `template.html`, `style.css` and `layout.md` as a working starting point. Names are lowercase letters, digits and dashes.

## 3. Write the template (`template.html`)

Read "Making layouts" in `dex docs layouts` for the details. The rules that matter most:

- Mark where content goes with `<slot></slot>` (the default slot) and `<slot name="x"></slot>` (named slots, filled after `::slot{name=x}` in a slide). Children of a slot are its fallback.
- Keep the `title` slot convention: a slot named `title` automatically receives the slide's leading heading. Reuse `header.slide__header` and `div.slide__body` when the layout has a title bar and a body.
- Name your own elements BEM-style after the layout (`.quote`, `.quote__source`).
- Keep the leading comment up to date: what the layout is for and its slots.

## 4. Style it (`style.css`)

- `:scope` is the slide. Every selector only matches inside slides using this layout (and, for a deck layout, only in that deck).
- Use design tokens (`--color-*`, `--space-*`, `--radius-*`) instead of raw colours and sizes, so light and dark mode, and every colour theme, work.
- Size in `em`: slides scale with the window, and `em` scales with them. `cqh`/`cqw` are percentages of the slide.
- No `@import` and no `@layer` (Dex adds the layer). Don't style anything outside the slide.
- Every slide gets a `.slide__number` (`12 / 68`, bottom right, in the slide's text colour at 70%). Leave it unless the layout needs otherwise: hide it with `.slide__number { display: none; }` (as `title` does), or move it if the layout puts content in the bottom-right corner.

## 5. Document it (`layout.md`)

People and other agents learn the layout only from this file (shown by `dex docs layouts`, with `--deck <slug>` for deck layouts):

- `description`: one line in the front matter, saying what the layout is for. `dex check` warns while it is empty.
- `## When to use`: which slides it is for, and when another layout is better.
- `## Slots`: how to fill each slot. The slot names themselves are listed automatically.
- `## Example`: a complete, valid slide using the layout in a fenced `markdown` block.

## 6. Verify

1. Use the layout in at least one real slide.
2. `dex check`: no errors and no warnings for the layout (template variables, CSS rules, `layout.md`).
3. `dex fit`: slides using the layout fit at both sizes.
4. `dex dev`: look at those slides in light and dark mode (`d` toggles), with short and long content.
5. `dex docs layouts` (with `--deck <slug>` for a deck layout): the layout appears with its description and notes.

## 7. Report

Tell the author the layout's name, whether it is local or for one deck, what it is for, which slides now use it, and any slides you changed to use it.
