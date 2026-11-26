---
description: A chapter divider. Section slides are what ::toc lists.
---

## When to use

To open each part of a deck. Every `section` slide appears in the deck's table of contents (`::toc`), so use it for real chapters only. An index slide holding `::toc` can also use this layout (it is left out of its own list).

## Slots

- `title`: the chapter name (the slide's leading heading).
- default: optional short content under the title (a one-line summary, a list of references).

## Example

```markdown
::slide{#headers layout=section}

# Headers
```
