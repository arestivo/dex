/** Marks the deck idle (hiding chrome and cursor) after a period without pointer activity. */

const IDLE_AFTER = 2500

export function trackIdle(deck: HTMLElement): void {
  let timer: number | undefined
  const wake = (): void => {
    deck.removeAttribute('data-idle')
    window.clearTimeout(timer)
    timer = window.setTimeout(() => deck.setAttribute('data-idle', ''), IDLE_AFTER)
  }
  for (const type of ['pointermove', 'pointerdown', 'keydown'] as const) {
    document.addEventListener(type, wake, { passive: true })
  }
  wake()
}
