/**
 * Diagram renderings are published as files under `_app/diagrams/`, in builds
 * and in `dex dev`. Uses the viewer fixture, whose diagram is in its committed
 * cache, so no TeX is needed.
 */
import { appendFileSync, cpSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startDevServer } from '../../src/build/site.ts'
import { contentLocations } from '../../src/core/config.ts'
import { FIXTURES, runDex } from '../helpers.ts'

const DIAGRAM_SRC = /src="\.\.\/(_app\/diagrams\/[0-9a-f]{16}\.svg)"/g

let folder: string
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'dex-diagram-files-'))
  cpSync(join(FIXTURES, 'viewer'), folder, { recursive: true })
})
afterEach(() => {
  rmSync(folder, { recursive: true, force: true })
})

const builtDiagrams = async () => {
  const { code, stderr } = await runDex(folder, 'build')
  expect(code, stderr).toBe(0)
  const page = readFileSync(join(folder, 'dist/demo/index.html'), 'utf8')
  const files = readdirSync(join(folder, 'dist/_app/diagrams')).sort()
  return { page, files, srcs: [...page.matchAll(DIAGRAM_SRC)].map(([, src]) => src) }
}

describe('dex build and diagrams', () => {
  it('publishes each rendering as a file the deck page refers to', async () => {
    const { page, files, srcs } = await builtDiagrams()
    expect(files).toHaveLength(2)
    expect(srcs.map((src) => src?.replace('_app/diagrams/', '')).sort()).toEqual(files)
    for (const file of files) {
      expect(readFileSync(join(folder, 'dist/_app/diagrams', file), 'utf8')).toMatch(/^<svg\b/)
    }
    // The figure is in the page; the drawing isn't.
    expect(page).toContain('<figure class="diagram" role="img"')
    expect(page).not.toMatch(/<svg[^>]*viewBox='/)
  }, 120_000)

  it('keeps the names when other content changes', async () => {
    const first = await builtDiagrams()
    appendFileSync(join(folder, 'decks/demo/slides.md'), '\nOne more line.\n')
    const second = await builtDiagrams()
    expect(second.files).toEqual(first.files)
  }, 180_000)
})

describe('dex dev and diagrams', () => {
  it('serves the files the deck page refers to, and 404 for others', async () => {
    const server = await startDevServer(contentLocations({ folder, dist: join(folder, 'dist') }), {
      logLevel: 'silent',
      port: 0,
    })
    try {
      const base = server.resolvedUrls?.local[0] ?? ''
      const page = await (await fetch(new URL('demo/', base))).text()
      const srcs = [...page.matchAll(DIAGRAM_SRC)].map(([, src]) => src ?? '')
      expect(srcs).toHaveLength(2)
      for (const src of srcs) {
        const response = await fetch(new URL(src, base))
        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toBe('image/svg+xml')
        expect(await response.text()).toMatch(/^<svg\b/)
      }
      const missing = await fetch(new URL('_app/diagrams/0000000000000000.svg', base))
      expect(missing.status).toBe(404)
    } finally {
      await server.close()
    }
  }, 60_000)
})
