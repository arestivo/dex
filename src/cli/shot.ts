/// <reference lib="dom" />
/**
 * `dex shot <slug> [id...]`: saves PNG images of slides, in light and dark
 * mode, so people and agents can look at what they made.
 * Images go to `<folder>/.dex/shots/<slug>/<id>-<mode>.png`.
 * Returns the exit code.
 */
import { mkdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { styleText } from 'node:util'
import { chromium } from 'playwright-core'
import { buildSite, startPreview } from '../build/site.ts'
import type { ContentLocations } from '../core/config.ts'
import { formatDiagnostic, hasErrors, sortDiagnostics } from '../core/diagnostics.ts'
import { compileWorkspace } from '../core/workspace.ts'
import { MODE_STORAGE_KEY } from '../shared/constants.ts'
import { findChromium } from './browser.ts'

export const SHOTS_DIR = join('.dex', 'shots')
const VIEWPORT = { width: 1280, height: 720 } as const
const MODES = ['light', 'dark'] as const

export async function runShot(content: ContentLocations, args: readonly string[]): Promise<number> {
  const [slug, ...ids] = args
  const fail = (message: string): number => {
    console.error(styleText('red', message))
    return 1
  }
  if (slug === undefined) return fail('Usage: dex shot <slug> [slide-id...]')

  const { decks, diagnostics } = await compileWorkspace(
    { root: content.root, decksDir: content.decksDir },
    [slug],
  )
  if (hasErrors(diagnostics)) {
    for (const diagnostic of sortDiagnostics(diagnostics)) {
      if (diagnostic.severity === 'error')
        console.error(styleText('red', formatDiagnostic(diagnostic)))
    }
    return fail(`The deck "${slug}" has errors: nothing was saved.`)
  }
  const deck = decks.find((candidate) => candidate.slug === slug)
  if (deck === undefined) return fail(`No deck "${slug}".`)

  const known = new Set(deck.slides.map((slide) => slide.id))
  const unknown = ids.filter((id) => !known.has(id))
  if (unknown.length > 0) {
    return fail(`Not a slide of "${slug}": ${unknown.join(', ')}. Nothing was saved.`)
  }
  const targets = ids.length > 0 ? ids : deck.slides.map((slide) => slide.id)

  await buildSite(content, { logLevel: 'warn' })
  const server = await startPreview(content, { logLevel: 'error', port: 0 })
  const base = server.resolvedUrls?.local[0]
  if (base === undefined) throw new Error('The preview server did not report a URL.')

  const dir = join(content.root, SHOTS_DIR, slug)
  mkdirSync(dir, { recursive: true })
  const browser = await chromium.launch({ executablePath: findChromium() })
  try {
    for (const mode of MODES) {
      const context = await browser.newContext({ viewport: VIEWPORT, colorScheme: mode })
      // Same as the viewer's toggle: an explicit mode, applied before first paint.
      await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
        MODE_STORAGE_KEY,
        mode,
      ] as const)
      const page = await context.newPage()
      await page.goto(new URL(`${slug}/#${targets[0]}`, base).href)
      // The viewer chrome floats over the slide: keep it out of the images.
      await page.addStyleTag({
        content: '.viewer-controls, .viewer-progress, .viewer-toast { display: none !important; }',
      })
      for (const id of targets) {
        await page.evaluate(async (slide) => {
          location.hash = slide
          await document.fonts.ready
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
        }, id)
        const file = join(dir, `${id}-${mode}.png`)
        await page.locator('.slide[data-current]').screenshot({ path: file })
        console.log(relative(content.root, file))
      }
      await context.close()
    }
  } finally {
    await browser.close()
    await server.close()
  }
  return 0
}
