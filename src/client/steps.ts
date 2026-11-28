/**
 * Steps: parts of a slide revealed one at a time (see src/core/markdown/steps.ts).
 * The build numbers them (`data-step="1"`…); revealing the first k sets
 * `data-revealed` on them, and CSS hides the rest while presenting. The
 * navigation rules are pure so they can be tested without a page.
 */

/** What moving forward or back does on a slide with `total` steps, `revealed` shown. */
export type StepMove = { readonly reveal: number } | 'next-slide' | 'previous-slide'

export function forward(revealed: number, total: number): StepMove {
  return revealed < total ? { reveal: revealed + 1 } : 'next-slide'
}

export function back(revealed: number): StepMove {
  return revealed > 0 ? { reveal: revealed - 1 } : 'previous-slide'
}

/** Keeps a step count received from another window within the slide's steps. */
export function clampSteps(revealed: number, total: number): number {
  return Math.min(Math.max(Math.trunc(revealed), 0), total)
}

/** The slide's steps; their number is their position in the source. */
export function stepsOf(slide: Element): HTMLElement[] {
  return [...slide.querySelectorAll<HTMLElement>('[data-step]')]
}

/** Reveals the first `revealed` steps of the slide and hides the others. */
export function applySteps(slide: Element, revealed: number): void {
  for (const step of stepsOf(slide)) {
    step.toggleAttribute('data-revealed', Number(step.dataset.step) <= revealed)
  }
}

/** `step 1 of 3` for a slide with steps, nothing otherwise. */
export function describeSteps(revealed: number, total: number): string {
  return total === 0 ? '' : `step ${revealed} of ${total}`
}
