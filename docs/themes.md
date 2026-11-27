# Making themes

A theme is a set of colours: the slide background, text, accent, title slides, callouts and code. It changes nothing else (fonts, sizes and layouts stay the same). Every theme has a light and a dark version, and the reader's light/dark mode picks which one is shown. Diagrams use the theme's colours too.

To see the themes you can already use, run `dex docs themes`.

## Choosing a theme

- A deck picks one in its front matter: `theme: forest`.
- `dex.yaml`, at the root of the content folder, sets the theme of every deck that doesn't pick one, and of the index page:

  ```yaml
  theme: slate
  ```

  `dex init` writes this file with `theme: default` when the folder has none, and `dex init --theme slate` writes (or changes) the theme in it. Otherwise `dex init` leaves an existing `dex.yaml` as it is.

- Otherwise, decks use `default`.

Changing a deck's theme re-renders its diagrams once (with TeX), because they are drawn in the theme's colours.

## Where themes live

- **Built-in themes**: in the Dex engine, available in every content folder.
- **Local themes**: `themes/<name>/` in a content folder, next to `decks/`. They can't reuse a built-in name.

```text
themes/
  ocean/
    theme.css   ← required: the colours
    theme.md    ← recommended: what it is for
```

The quickest start is `dex new theme <name>`, which writes a `theme.css` listing every colour at its default value.

## theme.css

One `:root` rule that sets colour tokens, and nothing else:

```css
:root {
  --color-accent: light-dark(#0b6e70, #5fd4d6);
  --color-inverse-bg: light-dark(#0c2a3a, #10364a);
  --color-inverse-text: #f3f5fa;
}
```

- Each value is `light-dark(<light mode>, <dark mode>)`, or one colour used in both modes.
- Colours are hex: `#rrggbb` or `#rgb`. Names, `rgb()`, `var()` and other CSS are errors, because Dex must read the colours to check them and to draw diagrams with them.
- Only the colour tokens listed below can be set. Tokens you leave out keep the default value, so a theme can be as small as one accent colour.
- Light and dark mode are separate designs: a dark-mode background is not the light one inverted. Check both.

## Readable colours

`dex check` measures the contrast of the colours slides put together, in both modes, and warns below 4.5:1 (the WCAG minimum for text):

- text, muted text and links on the slide background;
- text on title and section slides;
- each callout's text on its background.

Fix a warning by making one of the two colours lighter or darker. When you change `--color-accent`, check `--tone-info` too: by default it matches the accent.

## theme.md

```markdown
---
description: Teal accents and deep blue title slides.
---

## When to use

Which decks it is for, and what it looks like.
```

`dex docs themes` shows the description and notes, and `dex check` warns while the description is missing.

## Checklist for a new theme

1. Run `dex new theme <name>`.
2. Change the colours you want in `theme.css`, in both modes, and delete the lines you don't change.
3. Fill in `theme.md`.
4. Select it in one deck (`theme: <name>`) and run `dex check`: no errors and no contrast warnings.
5. Look at it: `dex shot <slug> <ids...>` for a title slide, a text slide with a link and callouts, code and a diagram, in both modes.
