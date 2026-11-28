# Tasks

## 1. Hide slides while loading

- [x] 1.1 Add `:root[data-loading] .slide{display:none}` to `LOADING_STYLE` in `src/core/render/html.ts`, with a comment on why: the first layout of a whole deck is about half of the time to the first slide. Verify with a render test that deck pages carry the rule, and that pages without a script don't carry the loading style at all.
- [x] 1.2 Add an e2e test, with an init script that watches the loading attribute. While loading, no `.slide` has a layout box. When the viewer is ready, only the current slide has one. Verify that the existing loading-indicator tests (slow load, script fails, no JavaScript, dark mode) still pass.

## 2. Integration

- [x] 2.1 Run `pnpm verify` and `pnpm test:e2e` inside `nix develop`, under the memory cap. Both must pass.
- [x] 2.2 Run `openspec validate faster-first-slide --strict`.
- [x] 2.3 Re-measure the four decks of `slides_using_decks`, built to a scratch folder, against the table in proposal.md.

## Workflow follow-up

- Archive the change, then commit and push when the user asks.
