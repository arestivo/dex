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

describe('local layouts', () => {
  it('renders a slide with a local layout and its scoped style', async () => {
    const page = await open('#motto')
    expect(await current(page)).toBe('motto')
    expect(await page.locator('#motto figure.quote .quote__source').textContent()).toContain(
      'Dijkstra',
    )
    const style = (selector: string) =>
      page.evaluate(
        (s) => getComputedStyle(document.querySelector(s) as Element).fontStyle,
        selector,
      )
    expect(await style('#motto .quote__text')).toBe('italic')
    // Scoped: the same class outside a quote slide is not styled.
    await page.evaluate(() => {
      const probe = Object.assign(document.createElement('p'), {
        className: 'quote__text',
        id: 'probe',
      })
      document.querySelector('#first .slide__body')?.append(probe)
    })
    expect(await style('#probe')).toBe('normal')
  })
})

describe('deck layouts', () => {
  const banner = (page: Page) =>
    page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('#banner .banner') as Element)
      return { transform: style.textTransform, spacing: style.letterSpacing }
    })

  it('renders a deck layout with its own deck style only', async () => {
    const demo = await open('#banner')
    expect(await current(demo)).toBe('banner')
    expect(await banner(demo)).toEqual({ transform: 'uppercase', spacing: 'normal' })

    // Another deck has a deck layout with the same name and a different style.
    const other = await demo.context().newPage()
    await other.goto(new URL('other/#banner', inject('baseUrl')).href)
    const style = await banner(other)
    expect(style.transform).toBe('none')
    expect(style.spacing).not.toBe('normal')
  })
})

describe('diagrams', () => {
  const visible = (page: Page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('#diagram .diagram__render')]
        .filter((svg) => getComputedStyle(svg).display !== 'none')
        .map((svg) => (svg.classList.contains('diagram__render--dark') ? 'dark' : 'light')),
    )

  it('shows only the rendering that matches the mode, and follows the toggle', async () => {
    const page = await open('#diagram')
    await page.emulateMedia({ colorScheme: 'light' })
    expect(await page.getAttribute('#diagram figure.diagram', 'aria-label')).toBe(
      'Decide leads to Act, which leads to Observe.',
    )
    expect(await visible(page)).toEqual(['light'])
    await page.keyboard.press('d')
    expect(await visible(page)).toEqual(['dark'])
    await page.keyboard.press('d')
    expect(await visible(page)).toEqual(['light'])
  })

  it('follows the OS preference when there is no override', async () => {
    const page = await open('#diagram')
    await page.emulateMedia({ colorScheme: 'dark' })
    expect(await visible(page)).toEqual(['dark'])
  })

  it('prints the light rendering, even in dark mode', async () => {
    const page = await open('#diagram')
    await page.emulateMedia({ colorScheme: 'dark', media: 'print' })
    expect(await visible(page)).toEqual(['light'])
  })
})

describe('typeface', () => {
  it('sets slide text in the bundled Fira Sans', async () => {
    const page = await open('#first')
    const font = await page.evaluate(async () => {
      await document.fonts.ready
      const text = document.querySelector('#first li') as Element
      return {
        family: getComputedStyle(text).fontFamily,
        loaded: [...document.fonts].some(
          (face) => face.family.replaceAll('"', '') === 'Fira Sans' && face.status === 'loaded',
        ),
      }
    })
    expect(font.family).toMatch(/^"?Fira Sans"?,/)
    expect(font.loaded).toBe(true)
  })
})

describe('light and dark mode', () => {
  const background = (page: Page) =>
    page.evaluate(
      () =>
        getComputedStyle(document.querySelector('.slide[data-current]') as Element).backgroundColor,
    )

  it('toggles with d and persists the choice', async () => {
    const page = await open('#first')
    await page.emulateMedia({ colorScheme: 'light' })
    const light = await background(page)
    await page.keyboard.press('d')
    const dark = await background(page)
    expect(dark).not.toBe(light)
    expect(await page.getAttribute('html', 'data-color-mode')).toBe('dark')
    await page.reload()
    expect(await background(page)).toBe(dark)
  })

  it('names the control after the mode', async () => {
    const page = await open('#first')
    expect(await page.locator('.viewer-controls__button[aria-label="Dark mode"]').count()).toBe(1)
  })

  it('keeps a choice saved by an earlier version', async () => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      colorScheme: 'light',
    })
    await context.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('dex:theme', 'dark')
        sessionStorage.setItem('seeded', '1')
      }
    })
    const page = await context.newPage()
    await page.goto(`${DECK}#first`)
    expect(await page.getAttribute('html', 'data-color-mode')).toBe('dark')
    expect(
      await page.evaluate(() => [
        localStorage.getItem('dex:mode'),
        localStorage.getItem('dex:theme'),
      ]),
    ).toEqual(['dark', null])
    await page.reload()
    expect(await page.getAttribute('html', 'data-color-mode')).toBe('dark')
  })
})

describe('colour themes', () => {
  const colours = (page: Page) =>
    page.evaluate(() => {
      const slide = getComputedStyle(document.querySelector('.slide') as Element)
      return { background: slide.backgroundColor, text: slide.color }
    })
  const openDeck = async (slug: string, colorScheme: 'light' | 'dark', media?: 'print') => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      colorScheme,
    })
    const page = await context.newPage()
    if (media) await page.emulateMedia({ media })
    await page.goto(new URL(`${slug}/#intro`, inject('baseUrl')).href)
    return page
  }

  it("uses the deck's own theme, in light and dark mode", async () => {
    const page = await openDeck('themed', 'light')
    expect(await page.getAttribute('html', 'data-theme')).toBe('forest')
    expect(await colours(page)).toEqual({
      background: 'rgb(253, 253, 248)',
      text: 'rgb(28, 42, 32)',
    })
    await page.keyboard.press('d')
    expect(await colours(page)).toEqual({
      background: 'rgb(15, 22, 17)',
      text: 'rgb(225, 234, 223)',
    })
  })

  it('uses the folder theme for decks without their own, and on the index', async () => {
    const page = await openDeck('other', 'light')
    expect(await page.getAttribute('html', 'data-theme')).toBe('slate')
    expect((await colours(page)).text).toBe('rgb(26, 34, 48)')
    await page.goto(inject('baseUrl'))
    expect(await page.getAttribute('html', 'data-theme')).toBe('slate')
  })

  it('prints with the light values of the theme', async () => {
    const page = await openDeck('themed', 'dark', 'print')
    expect((await colours(page)).background).toBe('rgb(253, 253, 248)')
  })
})

describe('without JavaScript', () => {
  it('shows every slide as a document and scrolls to the fragment', async () => {
    const page = await open('#details', { javaScriptEnabled: false })
    const slides = await page.$$eval(
      '.slide',
      (all) => all.filter((slide) => getComputedStyle(slide).display !== 'none').length,
    )
    expect(slides).toBe(12)
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
