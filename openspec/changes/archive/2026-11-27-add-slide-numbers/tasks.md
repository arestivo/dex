# Tasks

## 1. The number

- [x] 1.1 Append `<div class="slide__number" aria-hidden="true">n / N</div>` to every slide in `slideElement` (`src/core/compile.ts`), after the template's content. Verify with render tests: each slide has one number with the right text and `aria-hidden`, after the layout's own elements, and the slide label is unchanged.
- [x] 1.2 Style `.slide__number` in `styles/components/slide.css` (bottom-right corner, inside the padding, `em` sizes, the inherited text colour at `opacity: 0.7`, tabular figures, no pointer events). Hide it in `layouts/title/style.css`. Verify with e2e tests: the number is visible in the bottom-right corner of a content slide in presentation mode, hidden on the title slide, in the section slide's light text colour, present on every non-title slide without JavaScript, and shown in print media.

## 2. Search

- [x] 2.1 Skip `.slide__number` in `slideText` (`src/client/search.ts`). Verify with a unit test (a slide whose only `12` is its number has no match) and an e2e test (searching a number finds only slide text).

## 3. Docs and guidance

- [x] 3.1 Document the number: `docs/authoring.md` (every slide shows `n / N` bottom right, not on title slides), `docs/layouts.md` (the `.slide__number` element, its colour, and how to hide or restyle it), a commented example in `scaffold/layout/style.css`, a line in `scaffold/skills/author-layout/SKILL.md`, and a line in `scaffold/skills/migrate-remark-deck/SKILL.md` (drop remark's slide numbering). Verify that `dex docs` and `dex docs layouts` show it and the scaffold tests pass.

## 4. Integration

- [x] 4.1 Run `pnpm verify` and `pnpm test:e2e` inside `nix develop` (under the memory cap), `openspec validate add-slide-numbers --strict`, and `dex check` and `dex fit` on the local `http` deck. Look at a content, section and title slide with `dex shot`, in light and dark mode, and at a printed page.
