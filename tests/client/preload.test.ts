// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { preloadOrder, type Schedule, startPreloading } from '../../src/client/preload.ts'

/** Slides holding one diagram (two renderings) each, named `<slide><mode>`. */
const deck = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const slide = document.createElement('section')
    slide.innerHTML = ['l', 'd']
      .map(
        (mode) => `<img class="diagram__render" loading="lazy" alt="" data-name="${index}${mode}">`,
      )
      .join('')
    return slide
  })

/** Runs scheduled tasks by hand, so each batch can be checked. */
const manual = () => {
  const tasks: (() => void)[] = []
  const schedule: Schedule = (task) => {
    tasks.push(task)
  }
  return { schedule, step: () => tasks.shift()?.() }
}

const eager = (slides: readonly Element[]) =>
  slides
    .flatMap((slide) => [...slide.querySelectorAll<HTMLImageElement>('img')])
    .filter((image) => image.loading === 'eager')
    .map((image) => image.dataset.name)

/** Fires load on every image made eager, so the next batch can start. */
const loadEager = async (slides: readonly Element[]) => {
  for (const slide of slides)
    for (const image of slide.querySelectorAll<HTMLImageElement>('img'))
      if (image.loading === 'eager') image.dispatchEvent(new Event('load'))
  await new Promise((done) => setTimeout(done, 0))
}

describe('background diagram loading', () => {
  it('orders slides from the current one, wrapping around', () => {
    expect(preloadOrder(5, 2)).toEqual([2, 3, 4, 0, 1])
    expect(preloadOrder(3, 9)).toEqual([2, 0, 1])
    expect(preloadOrder(0, 0)).toEqual([])
  })

  it('makes diagrams eager in small batches, current slide first, only when scheduled', async () => {
    const slides = deck(3)
    const { schedule, step } = manual()
    startPreloading(slides, 1, { schedule, batch: 2 })
    // Nothing happens until the scheduler runs: opening the deck doesn't wait.
    expect(eager(slides)).toEqual([])
    step()
    expect(eager(slides)).toEqual(['1l', '1d'])
    await loadEager(slides)
    step()
    expect(eager(slides)).toEqual(['1l', '1d', '2l', '2d'])
    await loadEager(slides)
    step()
    expect(eager(slides)).toEqual(['0l', '0d', '1l', '1d', '2l', '2d'])
  })

  it('moves a slide that is shown, and the next one, to the front', async () => {
    const slides = deck(5)
    const { schedule, step } = manual()
    const preloader = startPreloading(slides, 0, { schedule, batch: 2 })
    preloader.prioritise(3)
    step()
    expect(eager(slides)).toEqual(['3l', '3d'])
    await loadEager(slides)
    step()
    expect(eager(slides)).toEqual(['3l', '3d', '4l', '4d'])
  })

  it('makes every diagram eager before printing', () => {
    const slides = deck(3)
    startPreloading(slides, 0, { schedule: () => {}, batch: 2 })
    window.dispatchEvent(new Event('beforeprint'))
    expect(eager(slides)).toHaveLength(6)
  })
})
