/// <reference lib="dom" />
/**
 * End-to-end checks of the deck viewer against the built fixture deck
 * (tests/fixtures/viewer), in the system Chromium. Run with `pnpm test:e2e`.
 */
import { type Browser, chromium, type Page } from 'playwright-core'
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from 'vitest'
import { findChromium, showEveryStep, waitForImages } from '../../src/cli/browser.ts'

const DECK = new URL('demo/', inject('baseUrl')).href
let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch({ executablePath: findChromium() })
})

afterAll(async () => {
  await browser.close()
})

// Each test opens its own context; closing them keeps the suite's memory flat.
afterEach(async () => {
  await Promise.all(browser.contexts().map((context) => context.close()))
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

describe('presenter mode', () => {
  /** Opens the deck and its presenter window (with s) in one browser context. */
  const openBoth = async (fragment = '#first', slug = 'demo') => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const deckPage = await context.newPage()
    await deckPage.goto(new URL(`${slug}/${fragment}`, inject('baseUrl')).href)
    const [presenter] = await Promise.all([
      context.waitForEvent('page'),
      deckPage.keyboard.press('s'),
    ])
    await presenter.waitForFunction(() => document.querySelector('.presenter') !== null)
    return { deckPage, presenter }
  }
  const view = (page: Page) =>
    page.evaluate(() => {
      const text = (selector: string) => document.querySelector(selector)?.textContent?.trim() ?? ''
      return {
        current: text(
          '.presenter__stage[aria-label="Current slide"] .slide h1, .presenter__stage[aria-label="Current slide"] .slide h2',
        ),
        next: text('.presenter__stage[aria-label="Next slide"]'),
        notes: text('.presenter__notes'),
        position: text('.presenter__position'),
        timer: text('.presenter__elapsed'),
        deckHidden:
          getComputedStyle(document.querySelector('main.deck') as Element).display === 'none',
      }
    })

  it('opens with s and shows the current and next slides, the notes and the position', async () => {
    const { presenter } = await openBoth()
    expect(new URL(presenter.url()).searchParams.has('presenter')).toBe(true)
    const shown = await view(presenter)
    expect(shown).toMatchObject({ current: 'First', position: '4 / 13', deckHidden: true })
    expect(shown.next).toContain('Second')
    expect(shown.notes).toContain('Mention the third item first.')
    expect(await presenter.$$eval('.presenter [id]', (all) => all.length)).toBe(0)
  })

  it('says when a slide has no notes, and when the deck is the end', async () => {
    const { presenter } = await openBoth('#last')
    expect(await view(presenter)).toMatchObject({
      next: 'End of the deck',
      notes: 'No notes for this slide.',
    })
  })

  it("says when the deck's notes aren't published", async () => {
    const { presenter } = await openBoth('#intro', 'other')
    expect((await view(presenter)).notes).toBe("Speaker notes aren't published for this deck.")
  })

  it('keeps both windows on the same slide, whichever one moves', async () => {
    const { deckPage, presenter } = await openBoth()
    await presenter.keyboard.press('ArrowRight')
    await deckPage.waitForFunction(() => location.hash === '#second')
    expect(await current(deckPage)).toBe('second')
    expect(new URL(presenter.url()).hash).toBe('#second')

    await deckPage.click('.viewer-controls button[aria-label="Next slide"]')
    await presenter.waitForFunction(
      () => document.querySelector('.presenter__position')?.textContent === '6 / 13',
    )
    expect((await view(presenter)).current).toBe('Third')

    await presenter.close()
    await deckPage.keyboard.press('ArrowRight')
    expect(await current(deckPage)).toBe('details')
  })

  it('starts the timer at the first slide change, and pauses it', async () => {
    const { presenter } = await openBoth()
    await presenter.waitForTimeout(1200)
    expect((await view(presenter)).timer).toBe('00:00')
    await presenter.keyboard.press('ArrowRight')
    await presenter.waitForTimeout(1300)
    expect((await view(presenter)).timer).toBe('00:01')
    await presenter.click('.presenter__timer button:first-of-type')
    const paused = (await view(presenter)).timer
    await presenter.waitForTimeout(1200)
    expect((await view(presenter)).timer).toBe(paused)
    await presenter.click('.presenter__timer button:last-of-type')
    expect((await view(presenter)).timer).toBe('00:00')
  })
})

describe('steps', () => {
  /** The visibility of each step of a slide, in step order. */
  const steps = (page: Page, root = 'main.deck', id = 'reveal') =>
    page.evaluate(
      ([root, id]) =>
        [...document.querySelectorAll(`${root} ${id ? `#${id}` : '.slide'} [data-step]`)]
          .sort(
            (a, b) =>
              Number((a as HTMLElement).dataset.step) - Number((b as HTMLElement).dataset.step),
          )
          .map((step) => getComputedStyle(step).visibility),
      [root, id] as const,
    )
  const hidden = ['hidden', 'hidden', 'hidden', 'hidden']
  const visible = ['visible', 'visible', 'visible', 'visible']
  const revealedUpTo = (count: number) =>
    visible.map((_, index) => (index < count ? 'visible' : 'hidden'))

  it('open hidden on a deep link, keeping their space', async () => {
    const page = await open('#reveal')
    expect(await steps(page)).toEqual(hidden)
    const layout = await page.evaluate(() => {
      const slide = document.getElementById('reveal') as Element
      const step = slide.querySelector('[data-step="3"]') as Element
      const always = [...slide.querySelectorAll('p')].find((p) => p.textContent === 'Always shown.')
      return {
        stepHeight: step.getBoundingClientRect().height,
        always: always === undefined ? '' : getComputedStyle(always).visibility,
      }
    })
    expect(layout.stepHeight).toBeGreaterThan(0)
    expect(layout.always).toBe('visible')
  })

  it('reveal one at a time in source order, then advance', async () => {
    const page = await open('#reveal')
    for (let count = 1; count <= 4; count++) {
      await page.keyboard.press('ArrowRight')
      expect(await current(page)).toBe('reveal')
      expect(await steps(page)).toEqual(revealedUpTo(count))
    }
    await page.keyboard.press('ArrowRight')
    expect(await current(page)).toBe('last')
  })

  it('hide in reverse order, then go back, and are hidden again on return', async () => {
    const page = await open('#reveal')
    for (let press = 0; press < 5; press++) await page.keyboard.press('ArrowRight')
    expect(await current(page)).toBe('last')
    await page.keyboard.press('ArrowLeft')
    expect(await current(page)).toBe('reveal')
    expect(await steps(page)).toEqual(hidden)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowLeft')
    expect(await steps(page)).toEqual(revealedUpTo(1))
    await page.keyboard.press('ArrowLeft')
    expect(await steps(page)).toEqual(hidden)
    expect(await current(page)).toBe('reveal')
    await page.keyboard.press('ArrowLeft')
    expect(await current(page)).toBe('banner')
  })

  it('are revealed by the next control', async () => {
    const page = await open('#reveal')
    await page.click('.viewer-controls button[aria-label="Next slide"]')
    expect(await current(page)).toBe('reveal')
    expect(await steps(page)).toEqual(revealedUpTo(1))
  })

  it('are all shown when the search lands in a hidden one', async () => {
    const page = await open('#title')
    await page.keyboard.press('Control+f')
    await page.keyboard.type('forty')
    expect(await current(page)).toBe('reveal')
    expect(await steps(page)).toEqual(visible)
  })

  it('are all shown in print and without JavaScript', async () => {
    const printed = await open('#reveal')
    await printed.emulateMedia({ media: 'print' })
    expect(await steps(printed)).toEqual(visible)
    const plain = await open('#reveal', { javaScriptEnabled: false })
    expect(await steps(plain)).toEqual(visible)
  })

  it('are all shown for dex fit and dex shot', async () => {
    const page = await open('#reveal')
    await showEveryStep(page)
    expect(await steps(page)).toEqual(visible)
  })

  describe('in the presenter window', () => {
    const openBoth = async (fragment: string) => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
      const deckPage = await context.newPage()
      await deckPage.goto(`${DECK}${fragment}`)
      const [presenter] = await Promise.all([
        context.waitForEvent('page'),
        deckPage.keyboard.press('s'),
      ])
      await presenter.waitForFunction(() => document.querySelector('.presenter') !== null)
      return { deckPage, presenter }
    }
    const position = (page: Page) => page.textContent('.presenter__position')
    const faint = (page: Page) =>
      page.$$eval('.presenter__stage--current [data-step]', (all) =>
        all.map((step) => [getComputedStyle(step).visibility, getComputedStyle(step).opacity]),
      )

    it('show the upcoming steps faintly, and the step in the position', async () => {
      const { presenter } = await openBoth('#reveal')
      expect(await position(presenter)).toBe('12 / 13 · step 0 of 4')
      expect(await faint(presenter)).toEqual(Array(4).fill(['visible', '0.3']))
    })

    it('keep both windows on the same step', async () => {
      const { deckPage, presenter } = await openBoth('#reveal')
      await presenter.keyboard.press('ArrowRight')
      await deckPage.waitForFunction(() =>
        document.querySelector('#reveal [data-step="1"]')?.hasAttribute('data-revealed'),
      )
      expect(await steps(deckPage)).toEqual(revealedUpTo(1))
      expect(await current(deckPage)).toBe('reveal')
      expect(await position(presenter)).toBe('12 / 13 · step 1 of 4')
      expect((await faint(presenter))[0]).toEqual(['visible', '1'])

      await deckPage.keyboard.press('ArrowRight')
      await presenter.waitForFunction(
        () =>
          document.querySelector('.presenter__position')?.textContent === '12 / 13 · step 2 of 4',
      )
    })

    it('show the next slide with its steps hidden', async () => {
      const { presenter } = await openBoth('#banner')
      expect(await steps(presenter, '.presenter__stage[aria-label="Next slide"]', '')).toEqual(
        hidden,
      )
    })
  })
})

describe('controls', () => {
  const controlsShown = (page: Page) =>
    page.evaluate(() => {
      const opacity = (selector: string) =>
        getComputedStyle(document.querySelector(selector) as Element).opacity
      return { controls: opacity('.viewer-controls'), progress: opacity('.viewer-progress') }
    })
  const hidden = { controls: '0', progress: '0' }
  const shown = { controls: '1', progress: '1' }
  /** Waits for the opacity transitions to finish. */
  const settle = (page: Page) => page.waitForTimeout(500)

  it('start hidden and stay hidden while navigating with the keyboard', async () => {
    const page = await open('#first')
    await settle(page)
    expect(await controlsShown(page)).toEqual(hidden)
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
    await settle(page)
    expect(await current(page)).toBe('details')
    expect(await controlsShown(page)).toEqual(hidden)
  })

  it('appear when the mouse moves, and hide again when it stops', async () => {
    const page = await open('#first')
    await page.mouse.move(200, 200)
    await page.mouse.move(400, 300, { steps: 5 })
    await settle(page)
    expect(await controlsShown(page)).toEqual(shown)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(3000)
    expect(await controlsShown(page)).toEqual(hidden)
  })

  it('show while a control has keyboard focus', async () => {
    const page = await open('#first')
    const inControls = () =>
      page.evaluate(() => document.activeElement?.closest('.viewer-controls') !== null)
    for (let i = 0; i < 5 && !(await inControls()); i++) await page.keyboard.press('Tab')
    expect(await inControls()).toBe(true)
    await settle(page)
    expect((await controlsShown(page)).controls).toBe('1')
  })
})

describe('loading indicator', () => {
  /** Opens the deck with its script delayed (or failing), without waiting for it. */
  const openLoading = async (
    script: 'delay' | 'fail',
    options: { colorScheme?: 'light' | 'dark' } = {},
  ) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...options })
    const page = await context.newPage()
    let release = () => {}
    const released = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route(/\/_app\/.*\.js$/, async (route) => {
      if (script === 'fail') return route.abort()
      await released
      return route.continue()
    })
    await page.goto(`${DECK}#first`, { waitUntil: 'commit' })
    await page.waitForSelector('body', { state: 'attached' })
    return { page, release }
  }
  const state = (page: Page) =>
    page.evaluate(() => {
      const root = document.documentElement
      const indicator = getComputedStyle(root, '::after')
      return {
        loading: root.hasAttribute('data-loading'),
        body: getComputedStyle(document.body).visibility,
        indicator: indicator.content,
        delay: indicator.animationDelay,
        text: getComputedStyle(root).color,
        visibleSlides: [...document.querySelectorAll('.slide')].filter(
          (slide) => getComputedStyle(slide).display !== 'none',
        ).length,
      }
    })

  it('hides the page behind a delayed spinner until the viewer is ready', async () => {
    const { page, release } = await openLoading('delay')
    await page.waitForTimeout(400)
    expect(await state(page)).toMatchObject({
      loading: true,
      body: 'hidden',
      indicator: '""',
      delay: '0.3s, 0s',
    })
    release()
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-loading'))
    expect(await state(page)).toMatchObject({
      body: 'visible',
      indicator: 'none',
      visibleSlides: 1,
    })
    expect(await current(page)).toBe('first')
  })

  it('follows the dark mode while loading', async () => {
    const { page, release } = await openLoading('delay', { colorScheme: 'dark' })
    expect((await state(page)).text).toBe('rgb(255, 255, 255)')
    release()
  })

  it('reveals the document view when the script never runs', async () => {
    const { page } = await openLoading('fail')
    expect((await state(page)).loading).toBe(true)
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-loading'), null, {
      timeout: 8000,
    })
    expect(await state(page)).toMatchObject({ body: 'visible', visibleSlides: 13 })
  })

  it('never hides the page without JavaScript', async () => {
    const page = await open('#first', { javaScriptEnabled: false })
    expect(await state(page)).toMatchObject({ loading: false, body: 'visible', visibleSlides: 13 })
  })
})

describe('slide numbers', () => {
  const number = (page: Page, id: string) =>
    page.evaluate((slideId) => {
      const slide = document.getElementById(slideId) as Element
      const element = slide.querySelector('.slide__number') as Element
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      const frame = slide.getBoundingClientRect()
      return {
        text: element.textContent,
        visible: style.display !== 'none',
        colour: style.color,
        slideColour: getComputedStyle(slide).color,
        opacity: style.opacity,
        right: frame.right - box.right,
        bottom: frame.bottom - box.bottom,
        ariaHidden: element.getAttribute('aria-hidden'),
      }
    }, id)

  it('shows n / N in the bottom-right corner, in the slide text colour at 70%', async () => {
    const page = await open('#first')
    const shown = await number(page, 'first')
    expect(shown).toMatchObject({
      text: '4 / 13',
      visible: true,
      opacity: '0.7',
      ariaHidden: 'true',
    })
    expect(shown.colour).toBe(shown.slideColour)
    expect(shown.right).toBeGreaterThan(0)
    expect(shown.right).toBeLessThan(40)
    expect(shown.bottom).toBeGreaterThan(0)
    expect(shown.bottom).toBeLessThan(30)
  })

  it('hides it on title slides and uses the light text colour on section slides', async () => {
    const page = await open('#title')
    expect((await number(page, 'title')).visible).toBe(false)
    await page.keyboard.press('ArrowRight')
    const section = await number(page, 'index')
    expect(section.visible).toBe(true)
    expect(section.colour).toBe(section.slideColour)
    expect(section.colour).not.toBe((await number(page, 'first')).slideColour)
  })

  it('numbers every slide but the title without JavaScript', async () => {
    const page = await open('', { javaScriptEnabled: false })
    const visible = await page.$$eval('.slide__number', (all) =>
      all
        .filter((element) => getComputedStyle(element).display !== 'none')
        .map((e) => e.textContent),
    )
    expect(visible).toEqual(Array.from({ length: 12 }, (_, index) => `${index + 2} / 13`))
  })

  it('prints the numbers', async () => {
    const page = await open('#first')
    await page.emulateMedia({ media: 'print' })
    expect((await number(page, 'second')).visible).toBe(true)
    expect((await number(page, 'title')).visible).toBe(false)
  })

  it('is not matched by the search', async () => {
    const page = await open('#title')
    await page.keyboard.press('Control+f')
    await page.keyboard.type('/ 13')
    expect(await page.textContent('.viewer-search__count')).toBe('No matches')
  })
})

describe('search', () => {
  const count = (page: Page) => page.textContent('.viewer-search__count')
  const barHidden = (page: Page) =>
    page.evaluate(() => document.querySelector<HTMLElement>('.viewer-search')?.hidden)
  const highlighted = (page: Page) =>
    page.evaluate(() => ({
      all: CSS.highlights.get('dex-search')?.size ?? 0,
      current: [...(CSS.highlights.get('dex-search-current') ?? [])].map(String),
    }))
  const highlightColours = (page: Page) =>
    page.evaluate(() => {
      const text = document.querySelector(
        '.slide[data-current] p, .slide[data-current] li',
      ) as Element
      const style = (name: string) => {
        const computed = getComputedStyle(text, `::highlight(${name})`)
        return [computed.backgroundColor, computed.color]
      }
      return { match: style('dex-search'), current: style('dex-search-current') }
    })
  const search = async (page: Page, text: string) => {
    await page.keyboard.press('Control+f')
    await page.keyboard.type(text)
  }

  it('opens in the top-right corner with Ctrl+F, focused, instead of the browser find', async () => {
    const page = await open('#title')
    expect(await barHidden(page)).toBe(true)
    await page.evaluate(() => {
      document.addEventListener('keydown', (event) => {
        ;(window as unknown as { prevented: boolean }).prevented = event.defaultPrevented
      })
    })
    await page.keyboard.press('Control+f')
    expect(await barHidden(page)).toBe(false)
    expect(await page.evaluate(() => (window as unknown as { prevented: boolean }).prevented)).toBe(
      true,
    )
    expect(await page.evaluate(() => document.activeElement?.className)).toBe(
      'viewer-search__field',
    )
    const box = await page.locator('.viewer-search').boundingBox()
    expect(box?.y).toBeLessThan(40)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeGreaterThan(1240)
  })

  it('selects the search text when Ctrl+F is pressed again', async () => {
    const page = await open('#title')
    await search(page, 'preflight')
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.keyboard.press('Control+f')
    expect(
      await page.evaluate(() => {
        const field = document.activeElement as HTMLInputElement
        return [field.className, field.selectionStart, field.selectionEnd]
      }),
    ).toEqual(['viewer-search__field', 0, 9])
  })

  it('jumps to the first match as you type, highlighting every match, across formatting', async () => {
    const page = await open('#title')
    await search(page, 'preflight')
    expect(await current(page)).toBe('first')
    expect(page.url()).toBe(`${DECK}#first`)
    expect(await count(page)).toBe('1 of 2')
    expect(await highlighted(page)).toEqual({ all: 2, current: ['preflight'] })
    expect(await page.textContent('.viewer-search .visually-hidden')).toMatch(
      /^1 of 2\. Slide 4 of \d+: First$/,
    )
  })

  it('starts from the slide shown, and ignores case and accents', async () => {
    const page = await open('#second')
    await search(page, 'FUNCAO')
    expect(await current(page)).toBe('last')
    expect(await highlighted(page)).toEqual({ all: 1, current: ['Função'] })
  })

  it('moves with F3, Shift+F3 and Enter, wrapping around', async () => {
    const page = await open('#title')
    await search(page, 'preflight')
    await page.keyboard.press('Enter')
    expect([await current(page), await count(page)]).toEqual(['second', '2 of 2'])
    await page.keyboard.press('Enter')
    expect([await current(page), await count(page)]).toEqual(['first', '1 of 2'])
    await page.keyboard.press('Shift+Enter')
    expect([await current(page), await count(page)]).toEqual(['second', '2 of 2'])
    // F3 works wherever the focus is.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.keyboard.press('F3')
    expect([await current(page), await count(page)]).toEqual(['first', '1 of 2'])
    await page.keyboard.press('Shift+F3')
    expect([await current(page), await count(page)]).toEqual(['second', '2 of 2'])
    expect((await highlighted(page)).current).toEqual(['preflight'])
  })

  it('says when there are no matches and stays on the slide', async () => {
    const page = await open('#second')
    await search(page, 'zzzz')
    expect(await count(page)).toBe('No matches')
    expect(await current(page)).toBe('second')
    expect(await highlighted(page)).toEqual({ all: 0, current: [] })
  })

  it('closes with Esc, clearing the highlights and giving the keys back to the deck', async () => {
    const page = await open('#title')
    await search(page, 'preflight')
    await page.keyboard.press('Escape')
    expect(await barHidden(page)).toBe(true)
    expect(await highlighted(page)).toEqual({ all: 0, current: [] })
    expect(await current(page)).toBe('first')
    await page.keyboard.press('ArrowRight')
    expect(await current(page)).toBe('second')
  })

  it('stays visible while the controls hide for inactivity', async () => {
    const page = await open('#title')
    await search(page, 'preflight')
    await page.evaluate(() => document.querySelector('.deck')?.setAttribute('data-idle', ''))
    expect(
      await page.evaluate(
        () => getComputedStyle(document.querySelector('.viewer-search') as Element).opacity,
      ),
    ).toBe('1')
  })

  it('highlights in the colours of the mode and the theme', async () => {
    const page = await open('#title')
    await search(page, 'preflight')
    expect(await highlightColours(page)).toEqual({
      match: ['rgb(255, 211, 77)', 'rgb(27, 33, 48)'],
      current: ['rgb(255, 138, 61)', 'rgb(27, 33, 48)'],
    })
    await page.keyboard.press('Escape')
    await page.keyboard.press('d')
    expect(await highlightColours(page)).toEqual({
      match: ['rgb(107, 82, 0)', 'rgb(255, 255, 255)'],
      current: ['rgb(179, 71, 0)', 'rgb(255, 255, 255)'],
    })
    await page.addStyleTag({
      content: '@layer themes { :root[data-theme] { --color-search-current: #00aa55; } }',
    })
    expect((await highlightColours(page)).current[0]).toBe('rgb(0, 170, 85)')
  })

  it('never prints the bar or the highlights', async () => {
    const page = await open('#title')
    await search(page, 'preflight')
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
    expect(await highlighted(page)).toEqual({ all: 0, current: [] })
    await page.emulateMedia({ media: 'print' })
    expect(
      await page.evaluate(
        () => getComputedStyle(document.querySelector('.viewer-search') as Element).display,
      ),
    ).toBe('none')
    await page.emulateMedia({ media: 'screen' })
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
    expect((await highlighted(page)).all).toBe(2)
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

  /** Whether both renderings of the #diagram slide's diagram have loaded. */
  const bothLoaded = (page: Page) =>
    page.waitForFunction(
      () =>
        [...document.querySelectorAll<HTMLImageElement>('#diagram img.diagram__render')].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      null,
      { timeout: 10_000 },
    )

  it('are lazy files, not requested before the first slide shows', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    // Record, as the viewer reveals the page, how many diagram images were requested.
    await context.addInitScript(() => {
      new MutationObserver((_, observer) => {
        if (document.documentElement?.hasAttribute('data-loading') !== false) return
        observer.disconnect()
        const images = [...document.querySelectorAll<HTMLImageElement>('img.diagram__render')]
        ;(window as unknown as { atReady: unknown }).atReady = {
          images: images.length,
          lazy: images.filter((img) => img.loading === 'lazy').length,
          fetched: performance
            .getEntriesByType('resource')
            .filter((entry) => entry.name.includes('/_app/diagrams/')).length,
        }
        // The init script runs before <html> exists: watch the whole document.
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-loading'] })
    })
    const page = await context.newPage()
    // Opened on a slide without diagrams.
    await page.goto(`${DECK}#first`)
    await page.waitForFunction(() => 'atReady' in window)
    expect(await page.evaluate(() => (window as unknown as { atReady: unknown }).atReady)).toEqual({
      images: 2,
      lazy: 2,
      fetched: 0,
    })
    const srcs = await page.$$eval('#diagram img.diagram__render', (all) =>
      all.map((img) => new URL((img as HTMLImageElement).src).pathname),
    )
    for (const src of srcs) expect(src).toMatch(/\/_app\/diagrams\/[0-9a-f]{16}\.svg$/)
    expect(await page.$$eval('#diagram svg', (all) => all.length)).toBe(0)
  })

  it('load in the background once the first slide is shown', async () => {
    const page = await open('#first')
    await bothLoaded(page)
  })

  it('print right away, without visiting the diagram slide', async () => {
    const page = await open('#first')
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
    await page.emulateMedia({ media: 'print' })
    await bothLoaded(page)
    const light = await page.$eval('#diagram .diagram__render--light', (img) => ({
      shown: getComputedStyle(img).display !== 'none',
      width: img.getBoundingClientRect().width,
    }))
    expect(light.shown).toBe(true)
    expect(light.width).toBeGreaterThan(0)
  })

  it('are all loaded once dex fit and dex shot have waited for images', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await context.newPage()
    // Don't let goto wait for the load event: the helper must do the waiting.
    await page.goto(`${DECK}#diagram`, { waitUntil: 'commit' })
    await waitForImages(page)
    const unloaded = await page.$$eval(
      'img',
      (all) =>
        all.filter(
          (img) =>
            !(img as HTMLImageElement).complete || (img as HTMLImageElement).naturalWidth === 0,
        ).length,
    )
    expect(unloaded).toBe(0)
  })

  it('switch mode without a new request', async () => {
    const page = await open('#diagram')
    // The shown slide's renderings, both modes, are loaded first.
    await bothLoaded(page)
    const requests: string[] = []
    page.on('request', (request) => {
      requests.push(request.url())
    })
    await page.keyboard.press('d')
    await page.keyboard.press('d')
    await page.waitForTimeout(300)
    expect(requests.filter((url) => url.includes('/_app/diagrams/'))).toEqual([])
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
    expect(slides).toBe(13)
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
