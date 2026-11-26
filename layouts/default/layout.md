---
description: Most slides. A title bar and a body.
---

## When to use

Any slide that has a heading and some content: text, lists, code, tables, images. Start here and switch only when another layout fits better.

## Slots

- `title`: filled automatically by the slide's leading heading.
- default: everything else.

## Example

````markdown
::slide{#request-line}

# Request

The first line holds the **method**, the **path** and the **version**:

```http
GET /index.html HTTP/1.1
```
````
