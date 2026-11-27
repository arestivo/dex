---
name: author-theme
description: Create or change a colour theme in this content folder's themes/ (a deck's colours in light and dark mode). Use only when the user asks for different colours, a new look, or a theme, never on your own initiative.
metadata:
  generatedBy: dex
---

# Create or change a colour theme

A theme sets a deck's colours (backgrounds, text, accent, title slides, callouts, code and diagram colours), with a light and a dark version. Fonts, sizes and layouts are not part of it.

## 1. Only when asked

A deck's theme is the author's choice. Don't create a theme, change one, change a deck's `theme:` or change `dex.yaml` unless the user asked for it. If colours look wrong while you work on something else, tell the user instead.

## 2. Prefer an existing theme

Run `dex docs themes`: it lists every theme available here (built-in and local), with their main colours, and which theme the folder uses by default. If one fits what the user asked for, use it and stop:

- for one deck: `theme: <name>` in that deck's front matter;
- for every deck: `theme: <name>` in `dex.yaml` at the root of the content folder.

Change only the decks the user named.

## 3. Create it

```sh
dex new theme <name>
```

This writes `themes/<name>/theme.css`, listing every colour token at its default value, and `themes/<name>/theme.md`. Names are lowercase letters, digits and dashes, and can't reuse a built-in name.

## 4. Set the colours (`theme.css`)

Read "Making themes" in `dex docs themes`. The rules that matter most:

- One `:root { … }` rule that sets colour tokens only. The token table in `dex docs themes` says what each one colours.
- Each value is `light-dark(#light, #dark)`, or one hex colour for both modes. No colour names, `rgb()` or `var()`.
- Design both modes: a dark-mode background is a dark colour of its own, not the light one inverted. Keep the accent recognisably the same hue in both.
- Delete the lines you don't change: they keep the default values.
- If you change `--color-accent`, change `--tone-info` and `--tone-info-bg` to match. Diagrams use them as `DexAccent` and `DexAccentSoft`.
- Keep callout colours (`--tone-warning`, `--tone-error`, `--tone-success`) meaning what they mean: they must stay distinguishable from each other and from the accent.

## 5. Keep it readable

`dex check` warns when text and background colours are too close (contrast below 4.5:1), naming the mode and the two tokens. Fix every warning: make one of the two colours lighter or darker. Don't silence it by removing the token.

## 6. Document it (`theme.md`)

- `description`: one line in the front matter saying what it looks like.
- `## When to use`: which decks it is for.

## 7. Verify

1. Select the theme in the deck the user named (`theme: <name>`).
2. `dex check`: no errors and no theme warnings. Diagrams are re-rendered in the new colours, which needs TeX the first time (see `dex docs`, "Diagrams").
3. `dex shot <slug> <ids...>` for a title slide, a text slide with a link, callouts, code and a diagram, then open the light and dark images. Check that text is easy to read, title slides look intentional, and diagram boxes and arrows stand out.
4. `dex docs themes`: the theme appears with its description.

## 8. Report

Tell the author the theme's name, what it looks like, which decks now use it, and any colours you were unsure about.
