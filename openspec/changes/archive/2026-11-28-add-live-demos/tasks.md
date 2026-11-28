# Tasks

## 1. Format: `:::demo` and `::demo-result`

- [x] 1.1 Add `src/core/markdown/demos.ts`:
  - check a demo's children (one `html` block, at most one `css` block, nothing else);
  - wrap the code in `div.demo`;
  - build `div.demo-result` with a `<template shadowrootmode="open" shadowrootclonable>` holding `:host{display:block}`, the CSS and the parsed HTML;
  - insert it after the demo, or at the slide's single `::demo-result`.

  Wire it into `compile.ts` after notes and before steps and slots. Make `directives.ts` treat handled demo nodes as known, and list `:::demo` and `::demo-result` in the unknown-directive message. Verify with `tests/core/demos.test.ts`, covering each deck-format scenario and the serialised template attributes.
- [x] 1.2 Report demos in speaker notes and nested demos, plus every error in the "Misplaced demos are errors" requirement, each with how to fix it. Verify with tests in `tests/core/demos.test.ts`, at the right source lines.
- [x] 1.3 Add `styles/components/demo.css` (components layer) for `.demo` and `.demo-result`, and import it in `styles/index.css`. Verify that `pnpm verify` passes and that the fixture demo renders (2.1).

## 2. Viewer

- [x] 2.1 Add a demo slide to `tests/fixtures/viewer/decks/demo/slides.md`. It uses a `two-columns` slide with `::demo-result` in the right slot inside a `:::step`, and a plain demo. Update the slide counts in the e2e tests. Verify with e2e tests:
  - the result renders, with the demo's colour;
  - the demo's CSS doesn't change the slide's other paragraph;
  - the slide's CSS doesn't reach the result;
  - `light-dark()` follows the toggle;
  - without JavaScript, it renders;
  - in print, it renders;
  - in both presenter stages, it renders;
  - the step reveals the result.
- [x] 2.2 Check the search counts a demo's text once (in the code). If the walker reaches into the result, skip `.demo-result`. Verify with an e2e search test.

## 3. Docs

- [x] 3.1 Document demos:
  - **`docs/authoring.md`:** a "Live demos" section (syntax, `::demo-result`, isolation, what needs an iframe instead, sizes in `em`), plus `:::demo` in the directive list;
  - **`scaffold/skills/author-deck/SKILL.md`:** prefer `:::demo` over iframes for HTML/CSS examples;
  - **`scaffold/AGENTS.block.md`:** a note on converting iframe examples to `:::demo` when a deck is edited, keeping iframes only for viewport demos.

  Verify that `dex docs` prints the section, and that `dex init` in a temporary folder writes the updated skill.

## 4. Integration

- [x] 4.1 Run `pnpm verify` and `pnpm test:e2e` inside `nix develop`, under the memory cap. Both must pass.
- [x] 4.2 Run `openspec validate add-live-demos --strict`.
- [x] 4.3 Take a `dex shot` of the fixture demo slide in light and dark mode, and look at it.

## Workflow follow-up

- Archive the change, then commit and push when the user asks.
- Afterwards, in `slides_using_decks`: migrate `css3`'s 51 iframe examples to `:::demo` (an agent following `dex docs`), keeping iframes for the few that need a viewport.
