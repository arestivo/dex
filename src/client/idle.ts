/**
 * Marks the deck idle (hiding chrome and cursor) after a period without
 * pointer activity. Only the pointer wakes it: presenting with the keyboard
 * leaves the slide uncovered. The deck starts idle.
 */

const IDLE_AFTER = 2500

export function trackIdle(deck: HTMLElement): void {
  let timer: number | undefined
  let last: { x: number; y: number } | undefined

  const wake = (): void => {
    deck.removeAttribute('data-idle')
    window.clearTimeout(timer)
    timer = window.setTimeout(() => deck.setAttribute('data-idle', ''), IDLE_AFTER)
  }

  // Browsers send pointer events without movement when the page changes under a
  // still cursor (on load, and on a slide change): only a change of position from
  // the last event counts, so the first event only records where the pointer is.
  document.addEventListener(
    'pointermove',
    (event) => {
      const moved = last !== undefined && (event.clientX !== last.x || event.clientY !== last.y)
      last = { x: event.clientX, y: event.clientY }
      if (moved) wake()
    },
    { passive: true },
  )
  document.addEventListener('pointerdown', wake, { passive: true })
  deck.setAttribute('data-idle', '')
}
