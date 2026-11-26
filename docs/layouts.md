# Layouts

A layout decides where a slide's content goes. Each slide picks one with `::slide{#id layout=<name>}`; without `layout=` it uses `default`. How to fill slots is in `dex docs` (section "Layouts and slots").

## Available layouts

| Layout | Use for | Slots |
| --- | --- | --- |
| `default` | most slides: a title bar and a body | `title`, default |
| `title` | the deck's first slide | `title`, `subtitle`, default, `footer` |
| `section` | chapter dividers, listed by `::toc` | `title`, default |
| `center` | a single centred diagram, quote or statement | `title`, default |
| `two-columns` | side-by-side content | `title`, default, `left`, `right` |

## Making a layout

Layouts belong to the **Dex engine**, not to content folders: everything below is done in the engine repository, and every content folder gets the new layout. A layout is a folder in the engine's `layouts/`. Adding one needs no code: create the folder and use it with `::slide{#id layout=<folder-name>}`.

```text
layouts/
  quote/
    template.html   ← required: where the slide's content goes
    style.css       ← optional: styles for slides using this layout
```

The folder name is the layout name and must match `^[a-z][a-z0-9-]*$`. The `default` layout must exist.

### template.html

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

### style.css

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

- use the design tokens from the engine's `styles/tokens.css` (`--color-*`, `--space-*`, `--radius-*`) rather than raw values, so both themes work;
- size things in `em` so they scale with the slide;
- the slide is a CSS grid with one column (`grid-template-rows` is up to you) and a size container, so `cqh`/`cqw` are percentages of the slide;
- `@import` and `@layer` are not allowed: the wrapper adds the layer;
- layout styles beat component styles (callouts, code...), and utility classes beat layout styles.

### Checklist for a new layout

1. Create `layouts/<name>/template.html` with a leading comment listing its slots.
2. Add `style.css` if needed.
3. Use it in a deck and run `dex check` (template errors such as unknown variables show up here).
4. Look at it with `dex dev`, in both themes (`d` toggles the theme).
5. Run `dex fit` if the layout changes how much content fits.
6. Add it to the "Available layouts" table at the top of this document (the engine's `docs/layouts.md`).
