import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatDiagnostic } from '../../src/core/diagnostics.ts'
import { compileWorkspace } from '../../src/core/workspace.ts'
import { runDex as dex, FIXTURES, PROJECT_ROOT } from '../helpers.ts'

const LAYOUTS = 'center, default, section, title, two-columns'

describe('compileWorkspace', () => {
  it('compiles decks, ignores folders without slides.md and warns about unused assets', async () => {
    const result = await compileWorkspace({ root: join(FIXTURES, 'clean') })
    expect(result.decks.map((deck) => deck.slug)).toEqual(['demo'])
    expect([...(result.decks[0]?.assets ?? [])]).toEqual(['assets/used.svg'])
    expect(result.diagnostics.map(formatDiagnostic)).toEqual([
      'decks/demo/assets/unused.svg warning Asset is not used by any slide.',
    ])
  })

  it('uses the engine layouts by default', async () => {
    const result = await compileWorkspace({ root: join(FIXTURES, 'clean') })
    expect([...result.layouts.keys()].sort().join(', ')).toBe(LAYOUTS)
  })

  it('accepts an absolute decks folder outside the content root', async () => {
    const result = await compileWorkspace({
      root: PROJECT_ROOT,
      decksDir: join(FIXTURES, 'clean', 'decks'),
    })
    expect(result.decks.map((deck) => deck.slug)).toEqual(['demo'])
    expect(result.diagnostics[0]?.file).toBe('tests/fixtures/clean/decks/demo/assets/unused.svg')
  })

  it('reports invalid deck folder names and broken decks', async () => {
    const result = await compileWorkspace({ root: join(FIXTURES, 'broken') })
    const lines = result.diagnostics.map(formatDiagnostic)
    expect(result.decks).toEqual([])
    expect(lines).toContain(
      'decks/Bad_Name/slides.md error Invalid deck folder name "Bad_Name": deck slugs must match /^[a-z][a-z0-9-]*$/.',
    )
    expect(lines).toContain(
      `decks/broken/slides.md:5 error [a] Unknown layout "nope". Available: ${LAYOUTS}.`,
    )
  })

  it('reports a missing decks folder', async () => {
    const result = await compileWorkspace({ root: join(FIXTURES, 'viewer', 'decks') })
    expect(result.diagnostics.map((d) => d.message)[0]).toMatch(/^No decks folder at .*--folder\.$/)
  })

  it('compiles only the requested decks and reports unknown ones', async () => {
    const result = await compileWorkspace({ root: join(FIXTURES, 'clean') }, ['demo', 'ghost'])
    expect(result.decks).toHaveLength(1)
    expect(result.diagnostics.map(formatDiagnostic)).toContain(
      'decks/ghost error No deck "ghost" (expected slides.md there).',
    )
  })
})

describe('compileWorkspace with deck layouts', () => {
  let root: string
  const write = (path: string, text: string) => {
    mkdirSync(join(root, path, '..'), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  const deck = (slug: string, layout: string) =>
    write(
      `decks/${slug}/slides.md`,
      `---\ntitle: ${slug}\n---\n\n::slide{#one layout=${layout}}\n\n# One\n\nText.\n`,
    )
  const deckLayout = (slug: string, name: string) => {
    write(`decks/${slug}/layouts/${name}/template.html`, '<slot name="title"></slot><slot></slot>')
    write(`decks/${slug}/layouts/${name}/style.css`, ':scope { color: red }')
    write(`decks/${slug}/layouts/${name}/layout.md`, '---\ndescription: Mine.\n---\n')
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'dex-deck-layouts-'))
    deck('http', 'request')
    deckLayout('http', 'request')
    deck('css', 'request')
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('lets a deck use its own layouts, and only that deck', async () => {
    const result = await compileWorkspace({ root })
    expect(result.decks.map((d) => [d.slug, d.slides[0]?.layout])).toEqual([['http', 'request']])
    expect(result.diagnostics.map(formatDiagnostic)).toEqual([
      `decks/css/slides.md:5 error [one] Unknown layout "request". Available: ${LAYOUTS}.`,
    ])
  })

  it('does not report deck layout files as unused assets', async () => {
    write('decks/http/assets/used.txt', 'x')
    const result = await compileWorkspace({ root }, ['http'])
    expect(result.diagnostics.map(formatDiagnostic)).toEqual([
      'decks/http/assets/used.txt warning Asset is not used by any slide.',
    ])
  })

  it('reports deck layout problems only for the decks being compiled', async () => {
    deck('bad', 'default')
    deckLayout('bad', 'title')
    const all = await compileWorkspace({ root })
    expect(all.diagnostics.map((d) => d.file)).toContain('decks/bad/layouts/title/template.html')
    const http = await compileWorkspace({ root }, ['http'])
    expect(http.diagnostics).toEqual([])
  })
})

describe('dex check', () => {
  it('uses the current folder as the content folder and exits 0 on clean decks', async () => {
    const { code, stdout } = await dex(join(FIXTURES, 'clean'), 'check')
    expect(code).toBe(0)
    expect(stdout).toContain(
      `1 deck(s), 2 slide(s), 5 layout(s) [${LAYOUTS}]: 0 error(s), 1 warning(s).`,
    )
  })

  it('accepts --folder', async () => {
    const { code, stdout } = await dex(PROJECT_ROOT, 'check', '--folder', join(FIXTURES, 'clean'))
    expect(code).toBe(0)
    expect(stdout).toContain('decks/demo/assets/unused.svg warning')
  })

  it('exits non-zero and prints diagnostics on errors', async () => {
    const { code, stdout } = await dex(join(FIXTURES, 'broken'), 'check')
    expect(code).toBe(1)
    expect(stdout).toContain('decks/broken/slides.md:9 error [a]')
  })

  it('checks only the named deck', async () => {
    const { code, stdout } = await dex(join(FIXTURES, 'broken'), 'check', 'broken')
    expect(code).toBe(1)
    expect(stdout).not.toContain('Bad_Name')
  })

  it('prints usage for unknown commands', async () => {
    const { code, stderr } = await dex(PROJECT_ROOT, 'frobnicate')
    expect(code).toBe(1)
    expect(stderr).toContain('Unknown command "frobnicate"')
    expect(stderr).toContain('Usage: dex <command>')
  })
})
