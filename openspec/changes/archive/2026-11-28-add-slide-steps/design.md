# Design

## Context

- **Directives.** They are turned into hast-ready mdast in `src/core/markdown/directives.ts`. Anything that module doesn't know is an error.
- **Order of compilation.** Speaker notes are taken out of a slide's top-level mdast (`notes.ts`) before `assignSlots` splits the content into slots. Each slot is then compiled to hast separately.
- **Viewer state.** The viewer (`viewer.ts`) keeps a single `current` index. It shows a slide by setting `data-current`, and publishes the slide id through `sync.ts`.
- **Presenter.** The presenter (`presenter.ts`) clones slides into two `.deck` stages.
- **Search.** The search moves to a match through `navigation.show(index)`.
- **Fit and shot.** `dex fit` and `dex shot` open the built page in Chromium and move between slides by setting `location.hash`.

## Goals / Non-Goals

**Goals:**
- Steps are marked and numbered at build time, so the viewer only toggles attributes. This follows "rendering is build time".
- The step logic (what next/previous do) is a pure module with unit tests.
- Without JavaScript, nothing changes: the hidden state only exists under the viewer's present mode.

**Non-Goals:**
- An explicit reveal order (`{step=3}`), steps that show together, or effects other than appearing (fade, highlight, dim the previous step).
- Steps in the URL: a reload or deep link opens the slide with its steps hidden, as the spec says.
- Steps inside diagrams.

## Decisions

### Markup: `.step` with `data-step="n"`, revealed with `data-revealed`

**What is generated:**
- `:::step` becomes `<div class="step" data-step="1">`.
- `:step[…]` becomes `<span class="step" data-step="2">`.
- `:::steps` leaves no wrapper of its own. Its list is emitted as is, and each top-level `<li>` gets `class="step"` and `data-step`.

**What the viewer does:** it sets `data-revealed` on the steps numbered ≤ k. Steps are hidden by:

```css
.deck[data-mode="present"] .slide .step:not([data-revealed]) { visibility: hidden; }
```

**Why `visibility`:** it keeps the space, so nothing moves as steps appear, and it removes the step from the accessibility tree. That covers the spec's "keeps its space" and "hidden from assistive technology".

**Alternatives considered:**
- `opacity: 0`: screen readers would still read the step, and links inside it stay focusable.
- `display: none`: the layout jumps, and `dex fit` measures less than the audience will eventually see.
- The `.dex-hidden`/`.dex-show` pair of classes the request suggested: a state attribute fits the viewer's existing `data-current` convention, and needs one marker class instead of two.

### Numbering happens before slots are split

A new `src/core/markdown/steps.ts` runs on the slide's top-level mdast right after notes are extracted and before `assignSlots`. It walks the slide in source order, so steps are numbered in source order whatever slot they end up in.

At the same time it:
- sets the `hName` and `hProperties` of the step nodes;
- reports nested steps;
- reports a `:::steps` block that isn't exactly one list;
- reports attributes on a step.

`directives.ts` then treats `step`/`steps` as already handled, and doesn't call them unknown. `extractNotes`' notes content goes through the same walker in a "forbidden" mode, so a step in notes is an error.

Alternative: number the steps in hast after slot filling. This would follow DOM order, which a layout template can rearrange, and the spec asks for source order.

### Pure step logic in `src/client/steps.ts`

The module has:
- `forward(revealed, total)`, which returns `{ reveal: n }` or `'next-slide'`;
- `back(revealed)`, which returns `{ reveal: n }` or `'previous-slide'`;
- `applySteps(slide, revealed)`, which sets the attributes.

The viewer and the presenter both keep `revealed` beside `current`. Any change of slide resets it to 0, including Home/End, links and the other window. This is done in one place, `show()`, when `target !== current`.

Moving back to the previous slide arrives with its steps hidden, as the user asked, rather than fully revealed.

### Sync message carries the step

The message becomes `{ slide, step }`. Following a message means `go(index)` followed by setting `revealed = step`. A window publishes after every reveal and every hide, as well as after every slide change. The no-echo rule (`following`) is unchanged. Both windows come from the same build, so the old message shape needs no compatibility handling.

### Presenter shows upcoming steps faintly

Inside `.presenter__stage`, a later rule sets steps that aren't revealed to `visibility: visible; opacity: 0.3`. The rule is in the same viewer layer and is more specific.

The current stage's clone gets the same `data-revealed` attributes as the deck slide. The next stage's clone gets none, so it shows the next slide as the audience will first see it: its steps hidden, in the plain present-mode rule.

The position reads `12 / 68 · step 1 of 3` only for slides with steps.

### Search reveals every step of the slide it lands on

`navigation.show(index)` becomes "go to the slide and reveal all its steps". It applies even when the match is on the current slide, because the match may be in a hidden step.

Alternative: reveal only up to the step that holds the match. This needs a range-to-step lookup for little benefit, and search is for looking things up, not for presenting.

### Print, fit and shot

`styles/print.css` (the `print` layer, which wins over `viewer`) makes every `.step` visible.

`dex fit` and `dex shot` add an unlayered style tag (`.step { visibility: visible !important }`) through a shared helper in `src/cli/browser.ts`. This avoids depending on viewer state.

For `fit`, the measurement would be the same anyway, since `visibility` keeps the layout. The override makes that explicit and keeps the screenshots complete.

### Migration

`migrate-remark-deck` maps remark's `--` (a continuation that adds to the previous slide) to one Dex slide. The content after each `--` goes into its own `:::step` block, with one id for the whole slide.

## Risks / Trade-offs

- **The `.step` class name can clash** with a class an author uses in raw HTML or a layout. → The authoring reference lists it as reserved. Layouts own their own scoped classes.
- **Step order can surprise authors** when a template puts the right-hand slot first in the DOM. → Source order is the documented rule, and it is what the author reads.
- **Presenting with keys from both windows at once** can race: two windows post at the same moment. → The last message wins and both windows end up on the same state. This is the same behaviour as slide changes today.
- **A `:::steps` list inside a `:::step`** is a nested step, which is an error. → The message says to use one or the other.
