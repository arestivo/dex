---
description: A title, an optional intro, and two side-by-side columns.
---

## When to use

To compare two things or to put an explanation next to an example (text left, code or image right). Each column should be short. For several equal blocks inside a normal slide, the `.columns` utility class may be simpler.

## Slots

- `title`: the slide's leading heading.
- default: optional intro text above the columns.
- `left`, `right`: the two columns. Start each with `::slot{name=left}` / `::slot{name=right}`.

## Example

```markdown
::slide{#get-vs-post layout=two-columns}

# GET vs POST

::slot{name=left}

- Parameters in the URL
- Cacheable

::slot{name=right}

- Parameters in the body
- Not cacheable
```
