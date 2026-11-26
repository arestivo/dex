# Writing decks

This is the complete reference for the deck format. Each deck is one Markdown file with a few extensions ("directives"). Decks live in a content folder (see [Files](#files)). Run `dex check` there after every change: it reports every problem with its file, line, slide and a suggested fix.

- [Files](#files)
- [Front matter](#front-matter)
- [Slides](#slides)
- [Slide ids and deep links](#slide-ids-and-deep-links)
- [Layouts and slots](#layouts-and-slots)
- [Content](#content)
- [Directives](#directives)
- [Utility classes](#utility-classes)
- [Assets and links](#assets-and-links)
- [Making content fit](#making-content-fit)
- [Complete example](#complete-example)

## Files

```text
<content folder>/       ← where you run `dex` (or --folder <dir>)
  decks/
    http/               ← the folder name is the deck's slug (URL: /http/)
      slides.md         ← the deck
      assets/           ← images and other files the deck uses
        request.svg
  dist/                 ← `dex build` output (or --dist <dir>)
```

- The slug must match `^[a-z][a-z0-9-]*$` (lowercase letters, digits, dashes).
- A folder without `slides.md` is ignored.
- Only the assets that slides actually reference are published. The check warns about unused ones.

## Front matter

`slides.md` starts with a YAML block:

```yaml
---
title: HTTP                      # required
subtitle: Hypertext Transfer Protocol
description: For search engines and link previews.
author:                          # or just: author: Ana Silva
  name: Ana Silva
  url: https://example.org/~ana
lang: en                         # BCP 47; default en
---
```

Any other key is an error.

## Slides

Slides are separated by a line containing only `---`. Separators inside fenced code blocks are ignored. Every slide **starts** with a slide declaration:

```markdown
::slide{#status-codes}

# Status codes

- 200 OK
- 404 Not Found

---

::slide{#rest layout=section}

# REST
```

The declaration takes:

| Part | Meaning | Default |
| --- | --- | --- |
| `#id` | the slide's permanent id (required) | none |
| `layout=name` | the layout, a folder in `layouts/` | `default` |
| `.class` | extra classes on the slide, e.g. `.small` | none |

## Slide ids and deep links

Every slide is reachable at `<deck-url>#<id>`, e.g. `/http/#cors-preflight`. Ids:

- match `^[a-z][a-z0-9-]*$` and are unique within the deck;
- are **permanent**: they key deep links and, later, slide discussions. Don't rename an id once a deck is published. Reword the heading freely instead;
- are not derived from content or position, so reordering slides or editing headings never breaks a link.

Pick a short, descriptive id when you create a slide (`cors-preflight`, not `slide-42`). The check suggests one from the heading if you forget.

Links like `#12` (remark.js style, by position) still work: the viewer opens slide 12 and rewrites the URL to its id.

## Layouts and slots

A layout decides where content goes. Built-in layouts:

| Layout | Use for | Slots |
| --- | --- | --- |
| `default` | most slides: a title bar and a body | `title`, default |
| `title` | the deck's first slide | `title`, `subtitle`, default, `footer` |
| `section` | chapter dividers, listed by `::toc` | `title`, default |
| `center` | a single centred diagram, quote or statement | `title`, default |
| `two-columns` | side-by-side content | `title`, default, `left`, `right` |

**Slots.** Content goes to the layout's *default* slot unless you start a named slot with `::slot{name=...}`, which runs until the next `::slot` or the end of the slide:

```markdown
::slide{#compare layout=two-columns}

# GET vs POST

Both send requests, but:

::slot{name=left}

- Parameters in the URL
- Cacheable

::slot{name=right}

- Parameters in the body
- Not cacheable
```

**Automatic title.** If the layout has a `title` slot and the slide starts with a heading, that heading goes to the `title` slot. You almost never write `::slot{name=title}`.

**Fallbacks.** A slot you don't fill shows the layout's fallback. The `title` layout falls back to the front matter's title, subtitle and author, so an empty title slide works:

```markdown
::slide{#title layout=title}
```

To add a layout, see [layouts.md](layouts.md).

## Content

Standard CommonMark plus GitHub extensions: **bold**, *italic*, `code`, lists, ordered lists (a list can start at any number: `4. Fourth`), tables, ~~strikethrough~~, task lists, autolinks, blockquotes and images.

Inline HTML is allowed (`<small>`, `<br>`, `<kbd>`, `<img ... style="height: 30cqh">`...). Prefer Markdown and directives, and use HTML only for what they can't express.

Fenced code blocks with a language are highlighted at build time, in both themes:

````markdown
```php
<?php echo "Hello"; ?>
```
````

Any [Shiki language](https://shiki.style/languages) works (`http`, `php`, `javascript`, `html`, `css`, `sql`, `bash`, `json`...). An unknown language renders as plain text and the check warns. Leave the language out for plain text.

## Directives

Directives follow the generic directive syntax: `:name` inline, `::name` for one line, `:::name` … `:::` around blocks. Unknown directive names are errors. A bare `:word` in prose, such as `domain:port`, is left alone.

### Callouts

```markdown
:::info
scheme://domain:port/path?query_string#fragment_id
:::

:::warning[Careful]
Send headers **before** any output.
:::
```

Tones: `info`, `warning`, `error`, `success` and `example`. The optional `[label]` becomes the callout's title. Inside a callout, a line starting with `#` is a heading: escape it as `\#content`.

### Wrappers

```markdown
:::div{.smaller}
A long code block or table.
:::

Requests use :span[GET]{.badge} or :span[POST]{.badge}.
```

`:::div{.class ...}` wraps blocks and `:span[text]{.class}` wraps inline text. They take classes only (see [utility classes](#utility-classes)).

To nest a container directive in another, give the outer one more colons:

```markdown
::::div{.columns}
:::info
Left
:::
:::warning
Right
:::
::::
```

### Table of contents

```markdown
::slide{#index layout=section}

# Index

::toc
```

`::toc` lists every `section` slide in order, linking to each one. The slide holding the `::toc` is left out of the list.

## Utility classes

Use them in `:::div{...}`, `:span[...]{...}` or on the slide itself (`::slide{#x .small}`):

| Class | Effect |
| --- | --- |
| `.large` | text 120% |
| `.small` | text 85% |
| `.smaller` | text 72% |
| `.tiny` | text 60% |
| `.center` | centre text (and tables, code, images) |
| `.muted` | secondary text colour |
| `.accent` | accent colour |
| `.columns` | children side by side in equal columns |
| `.badge` | small highlighted label |

They live in [styles/utilities.css](../styles/utilities.css). Keep that list short.

## Assets and links

- Reference files relative to the deck folder: `![Request](assets/request.svg)`. A missing file is an error. Paths that leave the deck folder (`../`) are errors, and root-relative paths (`/x.png`) are warnings, because they break when the site is served from a sub-path.
- Always give images alt text: `![What the diagram shows](assets/x.svg)`.
- Link to another slide with `[text](#slide-id)`. Links to ids that don't exist are errors.
- External links (`https://...`, `mailto:`) are not checked.

## Making content fit

Slides are 16:9 and scale with the window. Text never shrinks automatically. When a slide is too full:

1. split it into two slides (often the best option);
2. move side-by-side material into `layout=two-columns` or `:::div{.columns}`;
3. shrink a block with `:::div{.small}` / `{.smaller}`, or the whole slide with `::slide{#x .small}`;
4. size a single image with HTML: `<img src="assets/x.png" alt="..." style="height: 40cqh">` (`cqh` is a percentage of the slide height).

`dex fit` builds the site, opens every slide in a headless browser at 1280×720 and 1024×768 and reports any slide or code block that needs scrolling.

## Complete example

````markdown
---
title: Example
author: Ana Silva
---

::slide{#title layout=title}

---

::slide{#index layout=section}

# Index

::toc

---

::slide{#basics layout=section}

# Basics

---

::slide{#requests}

# Requests

A request has a **method**, a **path** and **headers**:

```http
GET /index.html HTTP/1.1
Host: example.com
```

:::info[Tip]
Use :span[curl -v]{.badge} to see the headers.
:::

---

::slide{#compare layout=two-columns}

# GET vs POST

::slot{name=left}

- Parameters in the URL

::slot{name=right}

- Parameters in the body

Back to the [index](#index).
````
