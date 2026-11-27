import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { paletteTex, parseColourTokens } from '../../src/core/diagrams/palette.ts'
import { compileTikz, parseTexLog, type TexResult } from '../../src/core/diagrams/tex.ts'
import { describeMissingTex, missingTex } from '../../src/core/diagrams/toolchain.ts'
import { wrapperTex } from '../../src/core/diagrams/wrapper.ts'
import { PROJECT_ROOT } from '../helpers.ts'

const palette = paletteTex(
  parseColourTokens(readFileSync(join(PROJECT_ROOT, 'styles/tokens.css'), 'utf8')),
  'light',
)
const missing = describeMissingTex(missingTex())
const picture = (body: string) => `\\begin{tikzpicture}\n${body}\n\\end{tikzpicture}`
/** Whether an SVG uses the colour `hex` (RRGGBB), written in full or as #RGB. */
const hasColour = (svg: string, hex: string) => {
  const used = new Set(
    [...svg.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)].map(([, value = '']) =>
      (value.length === 3 ? [...value].map((c) => c + c).join('') : value).toLowerCase(),
    ),
  )
  return used.has(hex.toLowerCase())
}
const svgOf = (result: TexResult) => {
  if (!('svg' in result)) throw new Error(`expected an SVG, got ${JSON.stringify(result.error)}`)
  return result.svg
}

describe('wrapperTex', () => {
  it('sets diagram text in the slide typeface', () => {
    const { tex } = wrapperTex({ folderPreamble: false })
    expect(tex).toContain('\\usepackage[sfdefault]{FiraSans}')
    expect(tex).toContain('\\usepackage{FiraMono}')
  })
})

describe('parseTexLog', () => {
  const { inputs } = wrapperTex({ folderPreamble: true, deckPreamble: 'decks/talk/tikz.tex' })

  it('maps block errors to block lines', () => {
    expect(
      parseTexLog("./block.tex:3: Package pgf Error: No shape named `nowhere' is known.", inputs),
    ).toEqual({
      file: 'block',
      line: 3,
      message: "Package pgf Error: No shape named `nowhere' is known.",
    })
  })

  it('keeps preamble files and lines', () => {
    expect(parseTexLog('./tikz/preamble.tex:4: Undefined control sequence.', inputs)).toEqual({
      file: 'tikz/preamble.tex',
      line: 4,
      message: 'Undefined control sequence.',
    })
  })

  it('attributes wrapper errors to the inputted file, without a line', () => {
    const line = [...inputs].find(([, file]) => file === 'tikz/preamble.tex')?.[0]
    expect(
      parseTexLog(`./main.tex:${line}: File ended while scanning use of \\pgfkeys@@qset.`, inputs),
    ).toEqual({
      file: 'tikz/preamble.tex',
      message: 'File ended while scanning use of \\pgfkeys@@qset.',
    })
  })

  it('reports the error before an Emergency stop, with an install hint for missing files', () => {
    // Real log excerpts: TeX can't find a package loaded from the folder preamble.
    const line = [...inputs].find(([, file]) => file === 'tikz/preamble.tex')?.[0]
    const log = [
      "! LaTeX Error: File `nosuchpkg.sty' not found.",
      '',
      'Type X to quit or <RETURN> to proceed,',
      'Enter file name: ',
      `./main.tex:${line}: Emergency stop.`,
    ].join('\n')
    expect(parseTexLog(log, inputs)).toEqual({
      file: 'tikz/preamble.tex',
      message: expect.stringMatching(
        /^LaTeX Error: File `nosuchpkg\.sty' not found\. Install the TeX package that provides nosuchpkg\.sty .*nix develop/,
      ),
    })
  })

  it('reports a missing class at the block', () => {
    const log = "! LaTeX Error: File `standalone.cls' not found.\n\n./main.tex:2: Emergency stop."
    const error = parseTexLog(log, inputs)
    expect(error.file).toBe('block')
    expect(error.message).toMatch(/^LaTeX Error: File `standalone\.cls' not found\. Install/)
  })

  it('falls back to the first "!" line', () => {
    expect(parseTexLog('! Emergency stop.', inputs)).toEqual({
      file: 'block',
      message: 'Emergency stop.',
    })
  })
})

describe.skipIf(missing !== '')(`compileTikz (needs TeX${missing ? `; ${missing}` : ''})`, () => {
  let folder: string
  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'dex-tex-test-'))
  })
  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })
  const write = (path: string, text: string) => {
    mkdirSync(join(folder, path, '..'), { recursive: true })
    writeFileSync(join(folder, path), text)
  }

  it('renders an SVG with the palette colours', async () => {
    const svg = svgOf(
      await compileTikz({
        source: picture('\\node[draw=DexAccent,fill=DexAccentSoft] {A};'),
        palette,
      }),
    )
    expect(svg).toMatch(/^<\?xml/)
    expect(hasColour(svg, '1D5FD6')).toBe(true)
    expect(hasColour(svg, 'EAF1FE')).toBe(true)
  }, 60_000)

  it('loads the folder preamble, then the deck preamble (which wins)', async () => {
    write(
      'tikz/preamble.tex',
      '\\input{tikz/colours.tex}\n\\tikzset{box/.style={fill=FolderColour}}\n',
    )
    write('tikz/colours.tex', '\\definecolor{FolderColour}{HTML}{112233}\n')
    const deckOnly = svgOf(
      await compileTikz({
        source: picture('\\node[box] {A};'),
        palette,
        tikzDir: join(folder, 'tikz'),
        deckPreamble: {
          path: 'decks/talk/tikz.tex',
          content: '\\tikzset{box/.style={fill=DexError}}\n',
        },
      }),
    )
    expect(hasColour(deckOnly, 'B42318')).toBe(true)
    const folderOnly = svgOf(
      await compileTikz({
        source: picture('\\node[box] {A};'),
        palette,
        tikzDir: join(folder, 'tikz'),
      }),
    )
    // dvisvgm writes colours in their shortest form (#112233 -> #123): same colour.
    expect(hasColour(folderOnly, '112233')).toBe(true)
  }, 60_000)

  it('maps an error in the block to its line', async () => {
    const result = await compileTikz({
      source: picture('\\node (a) {A};\n\\draw (a) -- (nowhere);'),
      palette,
    })
    expect(result).toEqual({ error: expect.objectContaining({ file: 'block', line: 3 }) })
  }, 60_000)

  it('maps an error in a preamble to its file and line', async () => {
    write('tikz/preamble.tex', '% styles\n\n\\undefinedmacro\n')
    const result = await compileTikz({
      source: picture('\\node {A};'),
      palette,
      tikzDir: join(folder, 'tikz'),
    })
    expect(result).toEqual({
      error: { file: 'tikz/preamble.tex', line: 3, message: 'Undefined control sequence.' },
    })
  }, 60_000)

  it('never runs shell commands', async () => {
    const marker = join(folder, 'pwned')
    const source = picture(`\\immediate\\write18{touch ${marker}}\\node {A};`)
    await compileTikz({ source, palette })
    expect(existsSync(marker)).toBe(false)
  }, 60_000)

  it('cannot read files outside its folder', async () => {
    write('secret.tex', 'SECRET')
    const result = await compileTikz({
      source: picture(`\\node {\\input{${join(folder, 'secret.tex')}}};`),
      palette,
    })
    expect('error' in result).toBe(true)
  }, 60_000)
})
