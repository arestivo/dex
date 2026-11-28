# Design

## Context

- **Rendering.** `createTexRenderer` (`src/core/diagrams/render.ts`) returns each block's light and dark SVG text, from `.dex/cache/diagrams/<key>.<mode>.svg` or freshly from TeX.
- **The figure.** `diagramFigure` (`figure.ts`) parses both SVGs into hast, prefixes their ids so several can share a page, and puts them in a `figure.diagram` with `role="img"` and the alt text.
- **Showing one mode.** CSS (`styles/components/diagram.css`, `styles/print.css`) shows the rendering for the current mode by class: `.diagram__render--light` or `--dark`.
- **Build.** The Vite plugin compiles decks in `buildStart` and emits pages and assets in `generateBundle`, under `_app/` for engine files.
- **Dev.** `dex dev` renders pages on request in `handleDevRequest`.

See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- The deck page holds no diagram SVG, and the renderings are separate files with stable, content-derived names.
- Nothing changes for authors, the cache or TeX.

**Non-Goals:**
- **One rendering per diagram with CSS variables.** Colours that TeX derives itself, such as `DexAccent!30` mixes and shadings, can't map back to variables.
- **Making "Save page as" keep the diagrams.**

## Decisions

### Files named by content hash, under `_app/diagrams/`

The name is the first 16 hex digits of the SHA-256 of the normalised SVG text, plus `.svg`.

- **Why the content and not the cache key:** a name derived from the bytes changes exactly when the file changes, which is what browser caching needs. Identical renderings collapse to one file even when their cache keys differ (another preamble that changes nothing, say).
- **Why `_app/`:** it is the engine's folder in the output. Deck folders belong to authors, and an author could have a `decks/<slug>/diagrams/` folder of their own.
- **URLs:** deck pages refer to the files as `../_app/diagrams/<hash>.svg`, matching how they already refer to the bundle, so the site stays portable.

Alternative: `<slug>/diagrams/<cache-key>.<mode>.svg`. That loses sharing between decks, and a cache key doesn't change when only the normaliser changes.

### Two `<img>` elements instead of inline SVG

`diagramFigure` emits, inside the same `figure.diagram[role=img][aria-label]`:

```html
<img class="diagram__render diagram__render--light" src="…" alt="" style="width: Nem">
<img class="diagram__render diagram__render--dark" src="…" alt="" style="width: Nem">
```

- **Alt text:** the figure keeps the alt text, and the images are decorative (`alt=""`), exactly as the SVGs are `aria-hidden` today.
- **Size:** each image takes its intrinsic aspect ratio from the SVG's `width`, `height` and `viewBox`. The width still comes from `svgWidthEm`, and `max-width: 100%; height: auto` still applies.
- **Classes and styles:** the class names don't change, so the mode and print rules in CSS keep working. Only selectors that named `svg` need changing.
- **Ids:** id prefixing (`prefixIds`) is no longer needed, because each SVG is its own document. It is removed.
- **Loading:** the images are `loading="lazy"`. See the next decision.

### Lazy images, then background loading

Measured on a local server, with the time until the first slide shows:

| Deck | Inline | Files, eager | Files, lazy |
| --- | --- | --- | --- |
| `from-specs-to-code` | 0.76–0.90 s | 1.62–1.75 s | 0.36–0.50 s |
| `css3` | 1.05–1.21 s | 1.45–1.49 s | 0.92–1.08 s |

Eager files are the slowest. Chromium parses each SVG image as its own document on the main thread (about 13 ms for these), whether or not it is shown. The deck's script runs after all of them, so the spinner stays up. With `loading="lazy"`, a `display: none` image isn't fetched at all, so a deck opens with only the current slide's diagram.

What lazy loading alone would break, and how each is covered:
- **Mode switch.** The other mode's rendering is hidden, so it would only be fetched on the switch. The viewer's background loader (`src/client/preload.ts`) loads every diagram after the first slide is shown, by setting `loading = 'eager'` a few images at a time in idle callbacks. It starts with the current and following slides, and moves a slide's images to the front of the queue when that slide is shown. The main thread stays free for navigation.
- **Print.** Chromium loads lazy images before printing (checked: the PDF is the same as with eager images). The loader also switches every remaining image to eager on `beforeprint`, for browsers that don't.
- **`dex fit` and `dex shot`.** `waitForImages` first makes every image eager, then waits. Otherwise a diagram on a hidden slide would never load, and fit would measure it as empty.
- **No JavaScript.** The document view scrolls, and lazy images load as they come into view, which is what lazy loading is for.

Alternative considered: `data-src` and no `src` until the viewer sets it. This breaks the document view without JavaScript, and `loading="lazy"` already does the deferring.

Alternative: one `<picture>` with a `prefers-color-scheme` source. It ignores the viewer's light/dark toggle, so it would need JavaScript to swap images, and it would break the document view without JavaScript.

### Compile returns the files, the plugin publishes them

`diagramFigure` names each rendering (a pure `diagramFileName(svg)` in `figure.ts`, using `createHash` from `node:crypto` as `render.ts` already does: hashing is computation, not I/O). `CompiledDeck` gains `diagrams: ReadonlyMap<string, string>`, which maps each file name to its SVG text, and the figure's `src` is `../_app/diagrams/<name>`.

- **In builds:** the plugin emits every deck's files once, keyed by name, so the files are de-duplicated.
- **In dev:** `handleDevRequest` answers `/_app/diagrams/<name>.svg` from the last compiled decks, with `Content-Type: image/svg+xml`.

### Checks wait for images

`src/cli/browser.ts` gets `waitForImages(page)`, which resolves when every `img` is `complete`, or after its decode promise. `fit.ts` calls it after `goto`. `shot.ts` calls it after `goto` and before each capture; images don't reload when the hash changes, but waiting again costs nothing.

## Risks / Trade-offs

- **A diagram can appear a moment late** when a slide is shown before its file has arrived, for example on a deep link straight to a diagram, or when jumping far ahead right after opening. → The background loader fetches the current and next slides first, and repeat visits are cached.
- **The background loader costs main-thread time**, about 13 ms per rendering, in idle callbacks. → It works in small batches, so a key press is never delayed by more than one batch.
- **More requests:** about 160 for `from-specs-to-code`. → HTTP/2 multiplexes them, and each is small and cacheable. The total bytes don't grow.
- **"Save page as" no longer keeps the diagrams.** → Printing to PDF still works, and the built site is the shareable artefact.
- **An older viewer bundle cached alongside a new page:** not an issue, because the bundle and the stylesheet are content-hashed already.

## Migration Plan

Nothing to migrate. The next `dex build` writes the new layout. `.dex/cache/` is unchanged, so no diagram is re-rendered.
