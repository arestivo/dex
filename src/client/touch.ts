/** Horizontal swipe detection for touch screens. */

const MIN_DISTANCE = 50

export function listenForSwipes(
  element: HTMLElement,
  onSwipe: (direction: 'left' | 'right') => void,
): void {
  let start: { x: number; y: number } | undefined

  element.addEventListener(
    'touchstart',
    (event) => {
      const touch = event.touches[0]
      start =
        event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : undefined
    },
    { passive: true },
  )

  element.addEventListener(
    'touchend',
    (event) => {
      const touch = event.changedTouches[0]
      if (start === undefined || touch === undefined) return
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      start = undefined
      if (Math.abs(dx) >= MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
        onSwipe(dx < 0 ? 'left' : 'right')
      }
    },
    { passive: true },
  )
}
