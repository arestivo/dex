# Proposal

## Why

Every TikZ diagram is inlined into its deck's HTML twice, once in light and once in dark mode. In decks that use diagrams, that is most of the page:

| Deck | Page size | Inline SVG share |
| --- | --- | --- |
| `from-specs-to-code` | 3.4 MB | 97% (82 SVGs) |
| `css3` | 1.8 MB | 78% (28 SVGs) |

The whole page must download and parse before the first slide shows, so these decks sit behind the loading spinner much longer than others. Nothing is cached between visits, and nothing is reused between builds.

## What Changes

- **Diagram files.** The build writes each rendering to its own file, `_app/diagrams/<hash>.svg`, named by a hash of its content. The deck page refers to the files with relative URLs instead of containing the SVG.
- **Sharing and caching.** Identical renderings share one file, across decks too. An unchanged diagram keeps its URL from build to build, so browsers can cache it.
- **Unchanged behaviour:** each diagram is still a figure with its alt text, shown in the rendering for the current mode, printed in its light rendering (every diagram, loaded or not), and sized like the slide's text. `dex dev` serves the same files from memory.
- **Lazy loading, then background loading.** Diagrams are `loading="lazy"`, so the first slide never waits for them. Loading 164 SVG files eagerly made `from-specs-to-code` slower than the inline version (1.6 s against 0.8 s), because the browser processes each one on the main thread. Lazy, it takes 0.4 s. Once the first slide is shown, the viewer loads the rest in the background, current and next slides first, so moving on and switching mode don't wait.
- **Checks wait for images.** `dex fit` and `dex shot` wait until the page's images have loaded before they measure or capture, since diagrams are no longer part of the page itself.
- **Not changed:** the `.dex/cache/` format, the cache keys, how TeX is run, and the no-JS document view.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `diagrams`: diagrams are published as separate, content-named SVG files referenced by the deck page; both renderings load up front. The capability's Purpose sentence ("inline SVG figures") is updated by hand at archive time.
- `deck-build`: the built site includes `_app/diagrams/`; `dex fit` and `dex shot` wait for images before measuring or capturing.

## Impact

- **Core:**
  - `src/core/diagrams/figure.ts` builds two `<img>` elements instead of inlining the SVG, and its id prefixing is no longer needed.
  - `src/core/compile.ts` and `src/core/model.ts` collect each deck's diagram files (name to SVG text).
- **Build:** `src/build/vite-plugin.ts` emits the files under `_app/diagrams/` in builds and serves them in dev.
- **Styles:** `styles/components/diagram.css` and `styles/print.css` select the renderings as images instead of inline SVGs. Their behaviour is unchanged.
- **CLI:** `src/cli/browser.ts` gets an image-wait helper, used by `fit.ts` and `shot.ts`.
- **Tests:**
  - the figure and compile unit tests;
  - the CLI build test (the files exist, the page holds no `<svg>`);
  - the e2e diagram tests (mode switching, print);
  - the `dex shot` test.
