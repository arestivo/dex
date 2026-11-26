/// <reference lib="dom" />
/**
 * End-to-end checks of the deck viewer against the built fixture deck
 * (tests/fixtures/viewer), in the system Chromium. Run with `pnpm test:e2e`.
 */
import { type Browser, chromium, type Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { findChromium } from '../../src/cli/browser.ts'

const DECK = new URL('demo/', inject('baseUrl')).href
let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch({ executablePath: findChromium() })
})

afterAll(async () => {
  await browser.close()
})

async function open(
  fragment: string,
  options: { javaScriptEnabled?: boolean } = {},
): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...options })
  const page = await context.newPage()
  await page.goto(`${DECK}${fragment}`)
  return page
}

const current = (page: Page) =>
  page.evaluate(() => document.querySelector('.slide[data-current]')?.id)

describe('presentation mode', () => {
  it('shows exactly the deep-linked slide', async () => {
    const page = await open('#second')
    expect(await current(page)).toBe('second')
    const visible = await page.$$eval(
      '.slide',
      (slides) => slides.filter((slide) => getComputedStyle(slide).display !== 'none').length,
    )
    expect(visible).toBe(1)
  })

  it('navigates with the keyboard, within bounds, updating the fragment without history entries', async () => {
    const page = await open('#second')
    const length = await page.evaluate(() => history.length)
    await page.keyboard.press('ArrowRight')
    expect(await current(page)).toBe('third')
    expect(page.url()).toBe(`${DECK}#third`)
    expect(await page.evaluate(() => history.length)).toBe(length)
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowLeft')
    expect(await current(page)).toBe('title')
    await page.keyboard.press('End')
    await page.keyboard.press('ArrowRight')
    expect(await current(page)).toBe('last')
  })

  it('returns to the previous slide with Back after following a link', async () => {
    const page = await open('#index')
    await page.click('.slide[data-current] .toc a[href="#details"]')
    expect(await current(page)).toBe('details')
    await page.goBack()
    expect(await current(page)).toBe('index')
  })

  it('supports remark-style positional links and rewrites them', async () => {
    const page = await open('#5')
    expect(await current(page)).toBe('second')
    expect(page.url()).toBe(`${DECK}#second`)
  })

  it('falls back to the first slide for unknown fragments', async () => {
    expect(await current(await open('#does-not-exist'))).toBe('title')
  })

  it('shows progress and announces slide changes', async () => {
    const page = await open('')
    expect(await page.textContent('.viewer-controls__counter')).toMatch(/^1 \/ \d+$/)
    await page.click('.viewer-controls__button[aria-label="Next slide"]')
    expect(await page.textContent('.viewer-live')).toMatch(/^Slide 2 of \d+: Index$/)
  })

  it('ignores shortcuts while typing in a field', async () => {
    const page = await open('#index')
    await page.evaluate(() =>
      document.body.append(Object.assign(document.createElement('input'), { id: 'probe' })),
    )
    await page.focus('#probe')
    await page.keyboard.press('n')
    expect(await current(page)).toBe('index')
  })

  it('goes to the next slide on a left swipe', async () => {
    const page = await open('#first')
    await page.evaluate(() => {
      const deck = document.querySelector('.deck') as HTMLElement
      const touch = (x: number) =>
        new Touch({ identifier: 1, target: deck, clientX: x, clientY: 300 })
      deck.dispatchEvent(
        new TouchEvent('touchstart', { touches: [touch(600)], changedTouches: [touch(600)] }),
      )
      deck.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(400)] }))
    })
    expect(await current(page)).toBe('second')
  })

  it('copies the deep link of the current slide', async () => {
    const page = await open('#first')
    await page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(DECK).origin })
    await page.click('.viewer-controls__button[aria-label="Copy link to this slide"]')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${DECK}#first`)
    expect(await page.textContent('.viewer-toast')).toBe('Link copied')
  })
})

describe('theme', () => {
  it('toggles with d and persists the override', async () => {
    const page = await open('#first')
    await page.emulateMedia({ colorScheme: 'light' })
    const background = () =>
      page.evaluate(
        () =>
          getComputedStyle(document.querySelector('.slide[data-current]') as Element)
            .backgroundColor,
      )
    const light = await background()
    await page.keyboard.press('d')
    const dark = await background()
    expect(dark).not.toBe(light)
    await page.reload()
    expect(await background()).toBe(dark)
  })
})

describe('without JavaScript', () => {
  it('shows every slide as a document and scrolls to the fragment', async () => {
    const page = await open('#details', { javaScriptEnabled: false })
    const slides = await page.$$eval(
      '.slide',
      (all) => all.filter((slide) => getComputedStyle(slide).display !== 'none').length,
    )
    expect(slides).toBe(9)
    const top = await page.evaluate(
      () => document.getElementById('details')?.getBoundingClientRect().top ?? -1,
    )
    expect(top).toBeGreaterThanOrEqual(0)
    expect(top).toBeLessThan(40)
  })
})

describe('print', () => {
  it('prints one page per slide', async () => {
    const page = await open('')
    const total = await page.$$eval('.slide', (all) => all.length)
    const pdf = (await page.pdf({ preferCSSPageSize: true })).toString('latin1')
    const counts = [...pdf.matchAll(/\/Count (\d+)/g)].map((match) => Number(match[1]))
    expect(Math.max(...counts)).toBe(total)
  })
})
