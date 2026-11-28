# Proposal

## Why

Decks that teach HTML and CSS show code next to its rendered result. Today the only way to do that is an `<iframe>` pointing to a hand-written HTML file. `css3` does this 51 times. That approach has three problems:

- **Two copies drift apart.** The code on the slide and the code that runs are written separately. In `css3`'s `color-text-color` slide, the slide shows `p { color: green; }`, but the example file uses `<p style="color: green">`.
- **Every example is a separate page.** Each one is fetched, parsed and laid out, even on hidden slides. Each file repeats about 40 lines of "stage" CSS to imitate the slide's size and light/dark mode.
- **They don't follow the slide.** An iframe can't inherit the slide's text size, light/dark mode or theme. With `loading="lazy"`, iframes print as empty boxes.

## What Changes

- **A `:::demo` block.** It holds an `html` code block and, optionally, a `css` code block. Dex shows the code as usual, then renders the result *from that same code* in a box isolated from the slide. The example's CSS can't affect the slide, and the slide's CSS doesn't reach into the example; only inherited properties like font and colour do.
- **Placing the result.** By default the result follows the code. A `::demo-result` line elsewhere in the slide moves it there, for example into a layout's `result` slot or inside a `:::step`.
- **Behaviour:**
  - The result is part of the page: no file, no request, no separate document.
  - It is drawn by the browser from the HTML, so it works without JavaScript, prints, and shows in the presenter window.
  - It inherits the slide's text size, light/dark mode and theme colours.
  - The search matches the code, not the rendered result, so a match isn't counted twice.
- **Errors:** `dex check` reports, each with how to fix it:
  - a `:::demo` with no `html` block;
  - more than one `html` or `css` block;
  - anything other than those code blocks;
  - a `::demo-result` with no `:::demo`, or with more than one, on its slide;
  - a demo inside speaker notes or inside another demo.
- **Docs:** the authoring reference documents demos, including what they can't do (see below). The `author-deck` skill says to prefer `:::demo` over iframes.
- **Not included:**
  - **Demos that need their own window** keep using iframes: media queries, `vw`/`vh`, `position: fixed`, and `html`/`body`/`:root` selectors behave differently in an isolated box than in a page.
  - **JavaScript-only demos.**
  - **A "result only" option** that hides the code.
  - **Migrating `css3`.** That is content work in its own folder, done afterwards by an agent following the new docs.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `deck-format`: the `:::demo` and `::demo-result` directives and their errors.
- `deck-viewer`: demos in print, without JavaScript, in the presenter window and in search.

## Impact

- **Core:**
  - a new `src/core/markdown/demos.ts`, which checks demos, builds the result and places it, on the slide's whole content before slots are assigned (like `steps.ts`);
  - `compile.ts` and `directives.ts`, which add `demo` and `demo-result` to the vocabulary;
  - rendering a `<template shadowrootmode>` with hast.
- **Styles:** `styles/components/demo.css` for the result box (`.demo-result`), in the `components` layer.
- **Viewer:** the search must not count the result's text. Presenter clones must keep the result.
- **Docs and scaffold:** `docs/authoring.md`, `scaffold/skills/author-deck/SKILL.md`, and a migration note for iframe examples.
- **Tests:**
  - core tests for parsing, placement and errors;
  - e2e tests for rendering, isolation, mode, print, no JavaScript, the presenter and search.
