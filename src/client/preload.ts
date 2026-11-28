/**
 * Loads diagram renderings in the background. They are `loading="lazy"`, so
 * opening a deck doesn't wait for them: the browser processes each SVG image
 * on the main thread, and a deck can have hundreds. Once the first slide is
 * shown, this makes them eager a few at a time, in idle time: the current
 * slide and the ones after it first, then the rest. A slide that is shown
 * moves to the front, and printing makes every one eager at once.
 */

/** Diagram renderings (see src/core/diagrams/figure.ts). */
const SELECTOR = 'img.diagram__render'
/** Images made eager together: each costs main-thread time, so keep batches small. */
const BATCH = 4
/** A batch that hasn't loaded by then doesn't hold up the others. */
const BATCH_TIMEOUT_MS = 5000

export type Schedule = (task: () => void) => void

export interface Preloader {
  /** Loads this slide's diagrams, and the next slide's, before the others. */
  prioritise(index: number): void
}

/** Slide order for loading: from `start` to the end, then the slides before it. */
export function preloadOrder(count: number, start: number): number[] {
  const first = Math.min(Math.max(start, 0), Math.max(count - 1, 0))
  return Array.from({ length: count }, (_, offset) => (first + offset) % count)
}

const idle: Schedule = (task) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(task, { timeout: 1000 })
  else setTimeout(task, 50)
}

export function startPreloading(
  slides: readonly Element[],
  current: number,
  options: { readonly schedule?: Schedule; readonly batch?: number } = {},
): Preloader {
  const schedule = options.schedule ?? idle
  const batch = options.batch ?? BATCH
  const imagesOf = (index: number) => [
    ...(slides[index]?.querySelectorAll<HTMLImageElement>(SELECTOR) ?? []),
  ]
  let queue = preloadOrder(slides.length, current).flatMap(imagesOf).filter(isLazy)
  let running = false

  function pump(): void {
    queue = queue.filter(isLazy)
    const next = queue.splice(0, batch)
    if (next.length === 0) {
      running = false
      return
    }
    Promise.race([Promise.all(next.map(load)), delay(BATCH_TIMEOUT_MS)]).then(() => schedule(pump))
  }

  function run(): void {
    if (running) return
    running = true
    schedule(pump)
  }

  window.addEventListener('beforeprint', () => {
    for (const image of queue) image.loading = 'eager'
    queue = []
  })
  run()

  return {
    prioritise(index) {
      const first = [...imagesOf(index), ...imagesOf(index + 1)].filter(isLazy)
      queue = [...first, ...queue.filter((image) => !first.includes(image))]
      run()
    },
  }
}

function isLazy(image: HTMLImageElement): boolean {
  return image.loading === 'lazy'
}

/** Makes the image eager and resolves once it has loaded (or failed). */
function load(image: HTMLImageElement): Promise<void> {
  image.loading = 'eager'
  if (image.complete && image.naturalWidth > 0) return Promise.resolve()
  return new Promise((done) => {
    image.addEventListener('load', () => done(), { once: true })
    image.addEventListener('error', () => done(), { once: true })
  })
}

function delay(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms))
}
