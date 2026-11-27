# Design

## Context

`slideElement` in `src/core/compile.ts` builds each `<section class="slide">` from the layout template, with `data-number` and the label `Slide n of N: <title>`. Layouts can already print `{{slide.number}}` and `{{slide.total}}`, but no built-in layout does, so nothing visible carries the number. The viewer's counter is chrome: created by JavaScript, outside the slide, hidden in print. Layout CSS is wrapped in `@layer layouts { @scope (.slide[data-layout=…]) }`, a layer above `components`. Slides have `position: relative`, and the bottom padding is `--slide-padding-block` (1.6em).

## Goals / Non-Goals

**Goals:**
- A number that is part of the slide, so every view (presentation, document, print, `dex shot`) shows it with no extra code.
- Layouts keep control, with no new configuration format.

**Non-Goals:**
- A deck or folder setting to turn numbers off, or other formats (`12`, `Slide 12`). A layout can restyle the number, and a setting can come later if decks need one.
- Numbering only some slides, or skipping title slides in the count: the number is the slide's position, as in the URL's positional links (`#12`) and the viewer's counter.

## Decisions

- **A real element, added at build time.** After filling the template, `slideElement` appends `<div class="slide__number" aria-hidden="true">12 / 68</div>` as the slide's last child. Alternative: CSS generated content (`.slide::after { content: attr(data-number) … }`). Rejected: a pseudo-element is harder for layout authors to find and target, it takes the `::after` a layout might want for decoration, and screen readers read generated content inconsistently. Alternative: put `{{slide.number}} / {{slide.total}}` in each built-in template. Rejected: every local layout would have to copy it, and layouts made before this change would have no number.
- **`aria-hidden`.** The slide's label already says "Slide 12 of 68"; reading `12 / 68` again would be noise.
- **Placement in `styles/components/slide.css`.** It is absolutely positioned in the bottom-right corner, inside the slide's bottom and right padding (about `0.7em` from each edge), at about `0.65em` with tabular figures, with `pointer-events: none`. It inherits the slide's text colour and has `opacity: 0.7`, so it follows each layout's text colour with no per-layout rule. Alternative: `--color-muted`. Rejected: it is a grey for the slide background, unreadable on inverse slides (2.6:1 on the default section background) and on dark local layouts. At 70%, the default text colour still clears 4.5:1: 5.9:1 in light mode, 7.7:1 in dark mode and on section slides. Being inside the padding, it can't cause overflow and can't sit on content that fits. Being in `em`, it scales with the slide and prints at the same size relative to the page.
- **Layouts override it in their own CSS.** The `layouts` layer beats `components`, so `.slide__number { … }` in a layout's `style.css` wins without extra specificity. `title` hides it (`display: none`). The guide, the starter `style.css` (a commented example) and the `author-layout` skill show how to hide or restyle it.
- **Search skips it.** `slideText` in `src/client/search.ts` skips elements with the `slide__number` class, like visually hidden text.
- **Migration.** `migrate-remark-deck` gets one line: Dex numbers slides itself, so drop remark's `slideNumberFormat` and any hand-written numbers.

## Risks / Trade-offs

- [The number sits under the viewer controls (bottom right of the window) while they are visible] → the controls fade after a moment of inactivity, and the number is always there in print. The user chose this position.
- [70% opacity lowers contrast: a theme whose text only just reaches 4.5:1 gives a number below it] → the number is secondary, small text; the theme contrast check still guarantees the slide text itself. A layout can set the opacity back to 1.
- [Content slides that are already full show the number close to their last line] → it stays inside the padding, so `dex fit` keeps catching real overflow. `dex fit` is run on the `http` deck as part of the verification.
