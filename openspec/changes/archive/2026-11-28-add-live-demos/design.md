# Design

## Context

- **Directives.** They become hast-ready mdast in `src/core/markdown/directives.ts`. Anything that module doesn't know is an error.
- **Slide-level passes.** `notes.ts` and `steps.ts` already run on a slide's whole top-level content, after notes are extracted and before `assignSlots`. That is what lets a step's number, or here a demo's result, cross slot boundaries.
- **Templates in hast.** Speaker notes already render a `<template>` whose `content` is a hast root, so the HTML serialiser handles template content.
- **Presenter.** The presenter window copies slides with `cloneNode(true)`.
- **Search.** The search walks slide text with a TreeWalker, skipping some elements and classes.
- **`css3`'s example layouts** put the code in the default slot and an iframe in a `result` slot, sometimes inside a `:::step`.

See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- One source for the code shown and the code run.
- A result that is plain page content: no request, works without JavaScript, prints, follows the slide.
- Results that can be placed in another slot, so existing two-column layouts keep working.

**Non-Goals:**
- **Demos that need a viewport.** Media queries, `vw`/`vh`, `position: fixed` and root selectors stay with iframes. The docs say so.
- **Scaling `px` lengths with the slide** (see Risks).
- **Editing demos live, or a "result only" mode.**

## Decisions

### The name is `:::demo`

`:::example` is already a callout tone, used 35 times in existing decks. "Demo" says what it is: running code.

### Declarative shadow DOM for isolation

The result is rendered as:

```html
<div class="demo-result">
  <template shadowrootmode="open" shadowrootclonable>
    <style>:host{display:block}</style>
    <style>/* the demo's css block */</style>
    <!-- the demo's html block -->
  </template>
</div>
```

The browser's HTML parser attaches the shadow root while parsing, so no script is involved. That covers the document view without JavaScript and print.

- **Isolation** is exactly what the spec asks for. Selectors in the demo's `<style>` only match inside the shadow root. Page selectors don't cross into it, while inherited properties (font, colour, `color-scheme`) and custom properties (the theme tokens) do. So `light-dark()` and `var(--color-accent)` work inside demos.
- **`shadowrootclonable`** lets `cloneNode(true)` copy the shadow root, which the presenter's stages rely on. Without it, clones would be empty boxes.
- **Search:** a TreeWalker doesn't enter shadow roots, so the search naturally skips the result. A test pins that down.

Alternatives considered:
- **`@scope` with inline styles.** Slide and layout CSS would leak into the demo, which is wrong for teaching CSS: a layout's `p` margin would appear in a lesson about margins.
- **`<iframe srcdoc>`.** It solves the drifting copies, but not the cost of a separate document or the lack of inheritance.
- **A custom element.** It needs JavaScript, which would break the document view and print without it.

### A slide-level pass, `src/core/markdown/demos.ts`

It runs after `extractNotes` and before `numberSteps` and `assignSlots`, on the slide's top-level content. For each `:::demo`, it:

1. checks the children: one `html` code block, at most one `css` block, nothing else;
2. keeps the code blocks in a `div.demo` wrapper, so layouts can style it and Shiki highlights them as usual;
3. builds the result: an mdast node whose `data.hName` is `div.demo-result`, and whose `hChildren` hold the `template` element. Its `content` is the HTML parsed with `hast-util-from-html` as a fragment, after the two `<style>` elements.

The result is inserted after the demo, or replaces the slide's single `::demo-result` leaf directive, wherever that is in the tree. Notes go through the same pass in a "forbidden" mode, as steps do. `directives.ts` then treats `demo`/`demo-result` nodes as already handled, the same way it does for steps.

**Serialising the attributes:** `shadowrootmode` and `shadowrootclonable` are set as literal property names on the hast `template`. They are checked in a render test, because `property-information` may not know them yet and could rename them.

### The result box

`styles/components/demo.css` (in the `components` layer) gives `.demo-result` a minimal frame: `display: block`, a subtle border and padding in `em`, and `min-width: 0`. Layouts can restyle it, as `css3`'s `result` slot does for iframes today.

Inside the shadow root, only `:host { display: block }` is added. The demo gets no reset of its own, so lessons see the browser's defaults, as in a real page.

## Risks / Trade-offs

- **Browser support.** Declarative shadow DOM is in all current engines, and `shadowrootclonable` in current Chromium, Firefox and Safari. Without support, the template stays inert and the result is missing. → The e2e tests cover Chromium (what `dex shot`/`fit` use). The docs name the requirement.
- **`px` lengths don't scale with the slide** (inside the result, `1em` is the slide's text size, but `100px` is always 100 CSS pixels). → The docs say to write demo sizes in `em` when they should scale. `css3`'s iframes had the same limit, which they worked around with `vw`.
- **Viewport features behave like the main page.** Media queries see the browser window, and `vw` is the window's width. → Documented as the reason to keep an iframe. The `css3` migration will keep iframes for the few demos that need them.
- **Demos aren't sandboxed** like the iframes were. → Decks are written by trusted authors (project context). Demos are defined as HTML and CSS only, and the docs say so. Nothing relies on whether a `<script>` inside a demo runs; a demo that needs JavaScript keeps its iframe.
