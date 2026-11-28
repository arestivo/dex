/// <reference lib="dom" />
/**
 * `dex fit [slug...]`: builds the site, opens every slide in headless
 * Chromium and reports content that does not fit (slide bodies or code
 * blocks that need scrolling). Returns the exit code: 1 on any overflow.
 */
import { join, relative } from 'node:path'
import { styleText } from 'node:util'
import { chromium } from 'playwright-core'
import { buildSite, startPreview } from '../build/site.ts'
import type { ContentLocations } from '../core/config.ts'
import { type Diagnostic, formatDiagnostic, hasErrors } from '../core/diagnostics.ts'
import { compileWorkspace, DECK_FILE } from '../core/workspace.ts'
import { findChromium, showEveryStep } from './browser.ts'

/** Viewports to test: projector 16:9 and an older 4:3 one. */
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
] as const

/** Pixels of overflow tolerated (sub-pixel rounding). */
const TOLERANCE = 2

export async function runFit(content: ContentLocations, slugs: readonly string[]): Promise<number> {
  const { decks, diagnostics: problems } = await compileWorkspace(
    { root: content.root, decksDir: content.decksDir },
    slugs,
  )
  if (hasErrors(problems)) {
    console.log(styleText('red', 'The decks have errors: run `dex check` first.'))
    return 1
  }

  await buildSite(content, { logLevel: 'warn' })
  const server = await startPreview(content, { logLevel: 'error', port: 0 })
  const base = server.resolvedUrls?.local[0]
  if (base === undefined) throw new Error('The preview server did not report a URL.')

  const browser = await chromium.launch({ executablePath: findChromium() })
  const diagnostics: Diagnostic[] = []

  try {
    for (const deck of decks) {
      const file = relative(content.root, join(content.decksDir, deck.slug, DECK_FILE))
      const lines = new Map(deck.slides.map((slide) => [slide.id, slide.line]))
      const seen = new Set<string>()

      for (const viewport of VIEWPORTS) {
        const page = await browser.newPage({ viewport })
        await page.goto(new URL(`${deck.slug}/`, base).href)
        await showEveryStep(page)
        const overflows = await page.evaluate(measureOverflow, TOLERANCE)
        await page.close()

        for (const { id, what, vertical, horizontal } of overflows) {
          const key = `${id} ${what}`
          if (seen.has(key)) continue
          seen.add(key)
          const amount = [
            vertical > 0 ? `${vertical}px too tall` : '',
            horizontal > 0 ? `${horizontal}px too wide` : '',
          ]
            .filter(Boolean)
            .join(', ')
          const line = lines.get(id)
          diagnostics.push({
            severity: 'error',
            file,
            ...(line === undefined ? {} : { line }),
            slideId: id,
            message: `Content does not fit at ${viewport.width}x${viewport.height}: ${what} is ${amount}. Split the slide, use a two-column layout, or add .small/.smaller.`,
          })
        }
      }
    }
  } finally {
    await browser.close()
    await server.close()
  }

  for (const diagnostic of diagnostics) console.log(styleText('red', formatDiagnostic(diagnostic)))
  const slides = decks.reduce((total, deck) => total + deck.slides.length, 0)
  console.log(
    `\n${slides} slide(s) in ${decks.length} deck(s) checked: ${diagnostics.length} overflow(s).`,
  )
  return diagnostics.length > 0 ? 1 : 0
}

interface Overflow {
  id: string
  what: string
  vertical: number
  horizontal: number
}

/** Runs in the page: visits each slide and measures scrollable overflow. */
async function measureOverflow(tolerance: number): Promise<Overflow[]> {
  const found: Overflow[] = []
  const frame = () =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

  for (const slide of document.querySelectorAll<HTMLElement>('.slide')) {
    location.hash = slide.id
    await frame()
    for (const element of [slide, ...slide.querySelectorAll<HTMLElement>('.slide__body, pre')]) {
      const vertical = element.scrollHeight - element.clientHeight
      const horizontal = element.scrollWidth - element.clientWidth
      if (vertical > tolerance || horizontal > tolerance) {
        const what =
          element === slide
            ? 'the slide'
            : element.tagName === 'PRE'
              ? 'a code block'
              : 'the slide body'
        found.push({
          id: slide.id,
          what,
          vertical: vertical > tolerance ? vertical : 0,
          horizontal: horizontal > tolerance ? horizontal : 0,
        })
      }
    }
  }
  return found
}
