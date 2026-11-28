/// <reference lib="dom" />
/**
 * List bullets stay visible however small the slide is (a phone in portrait),
 * against the built viewer fixture.
 */
import { type Browser, chromium } from 'playwright-core'
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

describe('list bullets', () => {
  // At these widths Chromium's built-in disc isn't drawn at all (text of 6-7px).
  for (const width of [1280, 330, 300, 280]) {
    it(`are drawn on a slide ${width}px wide`, async () => {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
        deviceScaleFactor: 2.625,
      })
      const page = await context.newPage()
      await page.goto(`${DECK}#first`)
      // The area left of the first item, where its bullet is drawn.
      const clip = await page.$eval('#first li', (li) => {
        const item = li.getBoundingClientRect()
        const indent = parseFloat(getComputedStyle(li.parentElement as Element).paddingInlineStart)
        return { x: item.left - indent, y: item.top, width: indent, height: item.height }
      })
      const withBullet = await page.screenshot({ clip })
      await page.addStyleTag({ content: '#first ul { list-style: none !important; }' })
      const without = await page.screenshot({ clip })
      expect(withBullet.equals(without)).toBe(false)
      await context.close()
    })
  }
})
