---
description: The deck's opening slide. Falls back to the front matter's title, subtitle and author.
---

## When to use

The first slide of every deck. It usually needs no content at all: empty slots show the deck's `title`, `subtitle` and `author` from the front matter.

## Slots

- `title`: the deck title (fallback: front matter `title`).
- `subtitle`: a subtitle (fallback: front matter `subtitle`).
- default: optional extra content below the subtitle.
- `footer`: bottom line (fallback: the author's name). Use it for a linked author or a date.

## Example

```markdown
::slide{#title layout=title}

::slot{name=footer}

[Ana Silva](https://example.org/~ana) · March 2026
```
