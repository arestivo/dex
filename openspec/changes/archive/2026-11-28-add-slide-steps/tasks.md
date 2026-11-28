# Tasks

## 1. Format: step directives

- [x] 1.1 Add `src/core/markdown/steps.ts`:
  - number the `:::step`, `:step[…]` and `:::steps` list items in source order, as `class="step"` and `data-step`;
  - report errors for nested steps, steps with attributes, and a `:::steps` block that isn't exactly one list.

  Wire it into `compile.ts` after notes are extracted and before `assignSlots`. Make `directives.ts` accept `step`/`steps` as handled. Verify with new `tests/core/steps.test.ts` covering every deck-format scenario, including source order across slots and a step inside a callout.
- [x] 1.2 Report a step inside `:::notes` as an error. Verify with a test in `tests/core/steps.test.ts`.
- [x] 1.3 Document steps in `docs/authoring.md`:
  - a "Steps" section with the three forms, source order and the errors;
  - `.step` listed as reserved.

  Add a steps line to `scaffold/skills/author-deck/SKILL.md`. Map remark `--` to `:::step` in `scaffold/skills/migrate-remark-deck/SKILL.md`. Verify that `dex docs` prints the new section.

- [x] 1.4 Add the agent rules to `scaffold/AGENTS.block.md`:
  - a "Steps" rule under Rules: use steps only when the author asks for them or the source deck had them. The default is a slide shown all at once. When used, keep them for content whose reveal matters, such as an answer after a question or one stage of a process at a time.
  - a note under "Done means": `dex shot` and `dex fit` show every step, so they check the full content; `dex dev` (press `→`) shows the reveal itself.

  Verify that `dex init` in a temporary folder writes both lines into its `AGENTS.md` block (the existing init tests stay green).

## 2. Viewer: revealing steps

- [x] 2.1 Add the pure `src/client/steps.ts` (`forward`, `back`, `applySteps`). Verify with `tests/client/steps.test.ts`: reveal, then advance; hide, then go back; a slide without steps.
- [x] 2.2 Use it in `viewer.ts`:
  - next/previous (keys, controls, swipe) reveal and hide steps;
  - any slide change resets to 0 revealed;
  - search's `show` reveals every step of the slide it lands on.

  Add the hiding rule to `styles/viewer/` and the show-all rule to `styles/print.css`. Verify with e2e tests:
  - deep link arrival;
  - reveal, then advance;
  - hide, then go back;
  - returning to a slide hides its steps;
  - the next control reveals;
  - search into a hidden step;
  - print media shows every step;
  - no-JS shows every step.
- [x] 2.3 Add a slide with steps (block, inline, list, across two slots) to `tests/fixtures/viewer/decks/demo/slides.md`. Verify that `pnpm verify` stays green and the fixture passes `dex check`.

## 3. Presenter and sync

- [x] 3.1 Extend `sync.ts` to post and follow `{ slide, step }`, and publish on every reveal and hide in both windows. Verify with an e2e test: pressing `→` in the presenter reveals the step in both windows.
- [x] 3.2 In `presenter.ts`, track the revealed steps:
  - mirror `data-revealed` on the current clone;
  - show the steps that aren't revealed faintly (`styles/viewer/presenter.css`);
  - show the next preview with its steps hidden;
  - show the position as `12 / 68 · step k of n` on slides with steps.

  Verify with e2e assertions on the position text, step opacity in the current stage, and the hidden steps in the next stage.

## 4. Fit and shot

- [x] 4.1 Add a helper in `src/cli/browser.ts` that adds an unlayered "show every step" style to a page. Use it in `fit.ts` and `shot.ts`. Verify with a CLI test that a fixture slide that only overflows once its steps are shown is reported, and that `dex shot` captures a slide with steps.
- [x] 4.2 Update the README, if its shortcut list mentions what `→` does. Verify that the wording matches the spec.

## 5. Integration

- [x] 5.1 Run `pnpm verify` and `pnpm test:e2e` inside `nix develop`, under the memory cap. Both must pass.
- [x] 5.2 Run `openspec validate add-slide-steps --strict`, and `dex check` plus `dex fit` on the local `http` deck. All must be clean.
- [x] 5.3 Screenshot the demo slide with steps:
  - the deck window part-way through its steps;
  - the presenter window showing faint steps and `· step k of n`.

  Look at both, in light and dark mode.

## Workflow follow-up

- Archive the change, then commit and push when the user asks.
