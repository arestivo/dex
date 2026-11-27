import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { paletteTex, parseColourTokens } from '../../src/core/diagrams/palette.ts'
import { compileTikz } from '../../src/core/diagrams/tex.ts'
import { describeMissingTex, missingTex } from '../../src/core/diagrams/toolchain.ts'
import { builtInLayouts, compile, PROJECT_ROOT } from '../helpers.ts'

/** The fenced example under "## Example" in a layout's notes. */
function example(notes: string): string | undefined {
  const section = notes.split('## Example')[1] ?? ''
  const open = /^(`{3,})markdown\s*$/m.exec(section)
  if (!open?.[1]) return undefined
  const rest = section.slice((open.index ?? 0) + open[0].length + 1)
  const close = new RegExp(`^${open[1]}\\s*$`, 'm').exec(rest)
  return close ? rest.slice(0, close.index) : undefined
}

describe('built-in layout notes (layout.md)', () => {
  for (const [name, layout] of builtInLayouts) {
    describe(name, () => {
      it('has a description and usage notes', () => {
        expect(layout.description).not.toBe('')
        expect(layout.notes).toMatch(/## When to use/)
      })

      it('has an example that compiles without errors', async () => {
        const source = example(layout.notes ?? '')
        expect(source, 'an ```markdown example under ## Example').toBeDefined()
        const { diagnostics } = await compile(source ?? '')
        expect(diagnostics.items.filter((d) => d.severity === 'error')).toEqual([])
        // The default layout is used when no layout= is given.
        if (name !== 'default') expect(source).toContain(`layout=${name}`)
      })
    })
  }
})

describe('docs/authoring.md diagrams', () => {
  const doc = readFileSync(join(PROJECT_ROOT, 'docs/authoring.md'), 'utf8')
  const section = doc.slice(doc.indexOf('## Diagrams'), doc.indexOf('## Utility classes'))
  const blocks = (lang: string) =>
    [...section.matchAll(new RegExp(`^(\`{3,})${lang}[^\\n]*\\n([\\s\\S]*?)^\\1$`, 'gm'))].map(
      ([, , body = '']) => body,
    )
  const tikzExamples = blocks('tikz')
  const latex = blocks('latex')
  const preamble = latex.find((block) => block.startsWith('% tikz/preamble.tex')) ?? ''
  const ownColours = latex.find((block) => block.includes('\\ifDexDark')) ?? ''
  const tokens = parseColourTokens(readFileSync(join(PROJECT_ROOT, 'styles/tokens.css'), 'utf8'))

  it('documents the block syntax, colours, preambles and dex shot', () => {
    expect(tikzExamples.length).toBeGreaterThanOrEqual(2)
    expect(preamble).toContain('\\tikzset')
    expect(ownColours).toContain('\\definecolor{Brand}')
    for (const name of [
      'DexInk',
      'DexAccentSoft',
      'tikz/preamble.tex',
      'decks/<slug>/tikz.tex',
      'dex shot',
      '.dex/cache/',
    ]) {
      expect(section).toContain(name)
    }
  })

  const missing = describeMissingTex(missingTex())
  it.skipIf(missing !== '')(
    `compiles every tikz example in both themes (needs TeX${missing ? `; ${missing}` : ''})`,
    async () => {
      const folder = mkdtempSync(join(tmpdir(), 'dex-doc-examples-'))
      try {
        mkdirSync(join(folder, 'tikz'))
        writeFileSync(join(folder, 'tikz/preamble.tex'), preamble)
        const deckPreamble = { path: 'decks/doc/tikz.tex', content: ownColours }
        const sources = [
          ...tikzExamples,
          '\\begin{tikzpicture}\\node[fill=Brand] {Brand};\\end{tikzpicture}',
        ]
        for (const theme of ['light', 'dark'] as const) {
          for (const source of sources) {
            const result = await compileTikz({
              source,
              palette: paletteTex(tokens, theme),
              tikzDir: join(folder, 'tikz'),
              deckPreamble,
            })
            expect(result, source).toHaveProperty('svg')
          }
        }
      } finally {
        rmSync(folder, { recursive: true, force: true })
      }
    },
    120_000,
  )
})
