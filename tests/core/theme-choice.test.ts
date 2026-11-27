import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatDiagnostic } from '../../src/core/diagnostics.ts'
import type { DiagramRenderer } from '../../src/core/diagrams/render.ts'
import { compileWorkspace } from '../../src/core/workspace.ts'
import { FIXTURES } from '../helpers.ts'

let root: string
const deck = (slug: string, theme?: string) =>
  writeFileSync(
    join(root, 'decks', slug, 'slides.md'),
    `---\ntitle: ${slug}\n${theme === undefined ? '' : `theme: ${theme}\n`}---\n\n::slide{#one}\n\n# One\n\nText.\n`,
  )
const settings = (text: string) => writeFileSync(join(root, 'dex.yaml'), text)
const themesOf = async () => {
  const result = await compileWorkspace({ root })
  return {
    decks: Object.fromEntries(result.decks.map((d) => [d.slug, d.theme])),
    folder: result.theme,
    lines: result.diagnostics.map(formatDiagnostic),
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dex-theme-choice-'))
  cpSync(join(FIXTURES, 'themes'), root, { recursive: true })
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('choosing a theme', () => {
  it('uses default when nothing names a theme', async () => {
    expect(await themesOf()).toEqual({ decks: { demo: 'default' }, folder: 'default', lines: [] })
  })

  it('uses the folder theme from dex.yaml', async () => {
    settings('theme: ocean\n')
    expect(await themesOf()).toEqual({ decks: { demo: 'ocean' }, folder: 'ocean', lines: [] })
  })

  it("prefers the deck's own theme to the folder theme", async () => {
    settings('theme: ocean\n')
    deck('demo', 'default')
    expect((await themesOf()).decks).toEqual({ demo: 'default' })
  })

  it('reports an unknown deck theme at the front matter, listing the themes', async () => {
    deck('demo', 'nope')
    const { lines } = await themesOf()
    expect(lines).toEqual([
      'decks/demo/slides.md:3 error Unknown theme "nope". Available: default, ember, forest, high-contrast, ocean, slate. Run `dex docs themes` to see them.',
    ])
  })

  it('reports an unknown folder theme at dex.yaml, and falls back to default', async () => {
    settings('# folder settings\ntheme: nope\n')
    const { decks, folder, lines } = await themesOf()
    expect(decks).toEqual({ demo: 'default' })
    expect(folder).toBe('default')
    expect(lines).toEqual([
      'dex.yaml:2 error Unknown theme "nope". Available: default, ember, forest, high-contrast, ocean, slate. Run `dex docs themes` to see them.',
    ])
  })

  it('reports problems in dex.yaml', async () => {
    settings('theme: ocean\nport: 1\n')
    expect((await themesOf()).lines).toEqual([
      'dex.yaml:2 error Unknown key "port" in dex.yaml. Allowed keys: theme.',
    ])
  })
})

describe('diagrams use the deck theme', () => {
  it('passes the theme colours to the renderer', async () => {
    const fence = '```'
    writeFileSync(
      join(root, 'decks', 'demo', 'slides.md'),
      `---\ntitle: d\ntheme: ocean\n---\n\n::slide{#one}\n\n${fence}tikz alt="x"\n\\begin{tikzpicture}\\node {A};\\end{tikzpicture}\n${fence}\n`,
    )
    const seen: unknown[] = []
    const diagramRenderer: DiagramRenderer = async (_deck, sources, colours) => {
      seen.push(colours?.get('color-accent'))
      return sources.map(() => ({ svg: { light: '<svg></svg>', dark: '<svg></svg>' } }))
    }
    const result = await compileWorkspace({ root, diagramRenderer })
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(seen).toEqual([{ light: '0B6E70', dark: '5FD4D6' }])
  })
})
