# Tasks

## 1. Core: diagram files

- [x] 1.1 In `src/core/diagrams/figure.ts`:
  - add `diagramFileName(svg)` (16 hex digits of SHA-256, plus `.svg`);
  - make `diagramFigure` emit two `img.diagram__render` elements, with `src="../_app/diagrams/<name>"`, `alt=""` and the em width;
  - remove `prefixIds`.

  Verify with unit tests: the name is stable for the same SVG and differs for another; the figure has the role, the alt text and two images with the right classes and widths.
- [x] 1.2 Collect each deck's files in `compile.ts` as `CompiledDeck.diagrams` (name to SVG text), in `model.ts`. Verify with a compile test using a fake renderer: one block gives two entries whose names match the page's `src`s; the same block twice gives the same names.
- [x] 1.3 Update `styles/components/diagram.css` and `styles/print.css` only where a selector depends on `svg`, and check the mode and print rules still select the images. Verify with a grep for `svg` selectors in the diagram rules, covered by the e2e tests in 2.3.

## 2. Build and dev server

- [x] 2.1 In `src/build/vite-plugin.ts`, emit every deck's diagram files once under `_app/diagrams/` in `generateBundle`, de-duplicated by name. Verify with a CLI build test on a fixture with cached diagrams:
  - the files exist;
  - the deck page refers to them and holds no `<svg` for the diagram;
  - a second build after editing another slide keeps the same names.
- [x] 2.2 Serve `/_app/diagrams/<name>` in `dex dev` from the compiled decks, as `image/svg+xml`, and answer 404 for unknown names. Verify with a dev-server test that fetches a diagram URL taken from a deck page.
- [x] 2.3 Update the e2e diagram tests:
  - the matching rendering shows, and follows the toggle;
  - the OS preference is followed;
  - print uses the light rendering, even when the diagram's slide was never shown;
  - switching mode makes no new request.

  Verify that `pnpm test:e2e` passes.

## 3. Checks wait for images

- [x] 3.1 Add `waitForImages(page)` to `src/cli/browser.ts`, and call it in `fit.ts` (after loading) and `shot.ts` (before each capture). Verify with the `dex shot` e2e test for the `diagram` slide: the light and dark images differ and are larger than a capture without the diagram. Also verify with a fit test, on a fixture slide whose diagram makes it too tall, that the slide is reported.

## 4. Docs and spec

- [x] 4.1 Update the developer docs:
  - `AGENTS.md`'s "Diagrams are pre-rendered" bullet: the renderings become files under `_app/diagrams/`, and are no longer inlined;
  - any mention of inline SVG in `docs/authoring.md`.

  Verify with `grep -rn "inline" AGENTS.md docs/`, which should only show accurate mentions.

## 5. Integration

- [x] 5.1 Run `pnpm verify` and `pnpm test:e2e` inside `nix develop`, under the memory cap. Both must pass.
- [x] 5.2 Run `openspec validate diagram-files --strict`.
- [x] 5.3 Build `slides_using_decks` and record the new page sizes of `from-specs-to-code` and `css3` against 3.4 MB and 1.8 MB.

  Run `dex fit` there, and `dex shot` on a few diagram slides in light and dark mode, and look at the images.

## 6. Lazy loading (after measuring: eager files made opening slower)

- [x] 6.1 Add `loading="lazy"` to the diagram images in `figure.ts`, and update the figure unit test. Verify that `pnpm test` passes.
- [x] 6.2 Add `src/client/preload.ts`. Once the first slide is shown, it makes the diagram images eager in small idle-time batches: the current and following slides first, then the rest. It moves a slide to the front when the slide is shown, and makes everything eager on `beforeprint`. Start it from `viewer.ts`. Verify with a happy-dom unit test of the order and batching, and e2e tests:
  - opening on a slide without diagrams requests none before the first slide shows;
  - all renderings load within a few seconds;
  - after that, switching mode makes no request;
  - printing right away shows the diagram.
- [x] 6.3 Make `waitForImages` turn every image eager before waiting. Verify that the e2e test for the wait helper, and the `dex fit` test for a slide made too tall by its diagram, pass.
- [x] 6.4 Run `pnpm verify` and `pnpm test:e2e`, and run `openspec validate diagram-files --strict`.

  Re-measure `from-specs-to-code` and `css3` (time until the first slide shows) against the table in design.md, on a fresh build of `slides_using_decks`.

## Workflow follow-up

- At archive time, update the Purpose of `openspec/specs/diagrams/spec.md`: "theme-aware SVG figures, published as separate files" instead of "inline SVG figures".
- Archive the change, then commit and push when the user asks.
