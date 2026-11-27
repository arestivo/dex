# Making layouts

A layout decides where a slide's content goes and how it looks. It is a folder with an HTML template, an optional stylesheet and usage notes, and adding one needs no code. To see the layouts you can already use, run `dex docs layouts` (add `--deck <slug>` to include that deck's own layouts).

Layouts live in three places:

- **Built-in layouts**: `layouts/<name>/` in the Dex engine, available in every content folder. Adding or changing one is a change to the engine.
- **Local layouts**: `layouts/<name>/` in a content folder, next to `decks/`. They are available to every deck in that folder.
- **Deck layouts**: `decks/<slug>/layouts/<name>/`, available only to that deck.

Which one to make:

- a **local layout** when several decks could use it, so the decks stay consistent (the usual choice);
- a **deck layout** when only one talk needs it (say, the arrangement of one case study), or when the deck folder should be self-contained, so it can be moved to another content folder with its layouts.

Names must not clash with a wider layout: a local layout can't reuse a built-in name, and a deck layout can't reuse a built-in or local name (`dex check` reports it, and the wider layout is used). Pick a new name instead. Two decks may each have a deck layout with the same name: each deck gets its own.

The quickest start is `dex new layout <name>`, which creates a working local layout to edit (`dex new layout <name> --deck <slug>` creates a deck layout instead, in `decks/<slug>/layouts/<name>/`):

```text
layouts/
  quote/
    template.html   ← required: where the slide's content goes
    style.css       ← optional: styles for slides using this layout
    layout.md       ← recommended: what it is for and how to use it
```

The folder name is the layout name and must match `^[a-z][a-z0-9-]*$`. Slides use it with `::slide{#id layout=<folder-name>}`.

## template.html

An HTML fragment (no `<html>`/`<body>`) that becomes the inside of the slide's `<section class="slide" data-layout="quote">`. Mark where content goes with `<slot>` elements:

```html
<!--
  quote: a large centred quotation with its source underneath.
  Slots: (default), source
-->
<figure class="quote">
  <blockquote><slot></slot></blockquote>
  <figcaption><slot name="source">Unknown author</slot></figcaption>
</figure>
```

- `<slot></slot>` is the **default slot**: content that is not under a `::slot{name=...}` line.
- `<slot name="x"></slot>` is a **named slot**, filled by content after `::slot{name=x}`.
- Children of a slot are its **fallback**, shown when the slide doesn't fill it.
- A slot named `title` is special: if the slide starts with a heading, the heading moves there automatically.
- Slides can only fill slots the template declares. Anything else is a check error that lists the available slots.
- HTML comments are stripped from the output, so start every template with a comment that names its slots.

**Variables.** Text and attribute values can use these, HTML-escaped:

| Variable | Value |
| --- | --- |
| `{{deck.title}}`, `{{deck.subtitle}}` | from the front matter |
| `{{deck.author.name}}`, `{{deck.author.url}}` | from the front matter |
| `{{deck.lang}}` | the deck language |
| `{{slide.id}}`, `{{slide.number}}`, `{{slide.total}}` | this slide |

Missing optional values are empty, and unknown variables are errors. Variables are only replaced in the template, never in slide content (so `{{x}}` in a code sample is safe).

**Structure conventions** (shared styles in the engine's `styles/components/slide.css`):

- `header.slide__header` holds the title and is hidden when empty;
- `div.slide__body` holds the main content and scrolls if it overflows;
- name layout-specific elements BEM-style (`.quote__source`). Blocks with `__` in their class don't get the automatic spacing that content blocks get.

## style.css

Plain CSS, automatically wrapped so it only applies to slides using this layout:

```css
@layer layouts {
  @scope (.slide[data-layout="quote"]) {
    /* your file here */
  }
}
```

So in `style.css`:

- `:scope` is the slide itself, and any other selector only matches inside slides with this layout:

  ```css
  :scope {
    align-content: center;
    background: var(--color-inverse-bg);
    color: var(--color-inverse-text);
  }

  blockquote {
    font-size: 1.6em;
  }
  ```

- use the design tokens from the engine's `styles/tokens.css` (`--color-*`, `--space-*`, `--radius-*`) rather than raw values, so light and dark mode (and every colour theme) work;
- size things in `em` so they scale with the slide;
- the slide is a CSS grid with one column (`grid-template-rows` is up to you) and a size container, so `cqh`/`cqw` are percentages of the slide;
- `@import` and `@layer` are not allowed: the wrapper adds the layer;
- layout styles beat component styles (callouts, code...), and utility classes beat layout styles;
- a deck layout's styles are also limited to its deck (the scope is `.deck[data-deck="<slug>"] .slide[data-layout="<name>"]`), so same-named deck layouts in two decks never affect each other. You write the file the same way.

## layout.md

Usage notes for people and agents. `dex docs layouts` shows them next to the layout, and `dex check` warns when a layout has none or has no description.

```markdown
---
description: A large centred quotation with its source underneath.
---

## When to use

For a single memorable quotation. Not for long passages.

## Slots

- default: the quotation.
- `source`: who said it (fallback: "Unknown author").

## Example

(a complete `::slide{...}` using the layout, in a fenced markdown block)
```

- `description` is one line. It appears in the list of layouts.
- The slot names are read from the template and listed automatically: the "Slots" section explains *how* to fill them.
- Keep the example complete and valid, so it can be copied as-is.

## Checklist for a new layout

1. Decide whether it is a local or a deck layout (see above). Run `dex new layout <name>`, or `dex new layout <name> --deck <slug>` (or create `template.html` by hand), with a leading comment listing its slots.
2. Edit `template.html` and `style.css`.
3. Fill in `layout.md`: the description, when to use it, the slots, and an example.
4. Use it in a deck and run `dex check` (template errors such as unknown variables show up here).
5. Look at it with `dex dev`, in light and dark mode (`d` toggles).
6. Run `dex fit` if the layout changes how much content fits.
7. Check that `dex docs layouts` (with `--deck <slug>` for a deck layout) lists it with its description and notes.
