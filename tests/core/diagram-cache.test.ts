import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CACHE_DIR, createTexRenderer } from '../../src/core/diagrams/render.ts'
import type { TexJob, TexResult } from '../../src/core/diagrams/tex.ts'
import { PROJECT_ROOT } from '../helpers.ts'

const tokensCss = readFileSync(join(PROJECT_ROOT, 'styles/tokens.css'), 'utf8')
const A = '\\begin{tikzpicture}\\node {A};\\end{tikzpicture}'
const B = '\\begin{tikzpicture}\\node {B};\\end{tikzpicture}'

let root: string
let jobs: TexJob[]
const fakeCompile = async (job: TexJob): Promise<TexResult> => {
  jobs.push(job)
  const theme = job.palette.includes('\\DexDarktrue') ? 'dark' : 'light'
  return {
    svg: `<?xml version='1.0'?>\n<!-- dvisvgm -->\n<svg data-theme="${theme}">${job.source}</svg>`,
  }
}
const renderer = (extra: Partial<Parameters<typeof createTexRenderer>[0]> = {}) =>
  createTexRenderer({ root, tokensCss, compile: fakeCompile, ...extra })
const write = (path: string, text: string) => {
  mkdirSync(join(root, path, '..'), { recursive: true })
  writeFileSync(join(root, path), text)
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dex-cache-'))
  jobs = []
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('diagram cache', () => {
  it('renders each block in both modes and stores normalised SVGs', async () => {
    const [outcome] = await renderer()('talk', [A])
    expect(outcome).toEqual({
      svg: {
        light: `<svg data-theme="light">${A}</svg>`,
        dark: `<svg data-theme="dark">${A}</svg>`,
      },
    })
    expect(jobs).toHaveLength(2)
    expect(readdirSync(join(root, CACHE_DIR)).sort()).toEqual([
      expect.stringMatching(/^[0-9a-f]{64}\.dark\.svg$/),
      expect.stringMatching(/^[0-9a-f]{64}\.light\.svg$/),
    ])
  })

  it('compiles nothing the second time', async () => {
    await renderer()('talk', [A, B])
    jobs = []
    await renderer()('talk', [A, B])
    expect(jobs).toEqual([])
  })

  it('recompiles only an edited block', async () => {
    await renderer()('talk', [A, B])
    jobs = []
    await renderer()('talk', [A, `${B} % edited`])
    expect(jobs.map((job) => job.source)).toEqual([`${B} % edited`, `${B} % edited`])
  })

  it('recompiles only the deck whose preamble changed', async () => {
    await renderer()('talk', [A])
    await renderer()('other', [A])
    jobs = []
    write('decks/talk/tikz.tex', '\\tikzset{x/.style={}}')
    await renderer()('talk', [A])
    await renderer()('other', [A])
    expect(jobs).toHaveLength(2)
    expect(jobs[0]?.deckPreamble).toEqual({
      path: 'decks/talk/tikz.tex',
      content: '\\tikzset{x/.style={}}',
    })
  })

  it('recompiles everything when a file in tikz/ changes', async () => {
    write('tikz/preamble.tex', '% v1')
    await renderer()('talk', [A])
    await renderer()('other', [B])
    jobs = []
    write('tikz/extra.tex', '% new file')
    await renderer()('talk', [A])
    await renderer()('other', [B])
    expect(jobs).toHaveLength(4)
  })

  it('serves cached diagrams without TeX on the PATH', async () => {
    await renderer()('talk', [A])
    const real = createTexRenderer({ root, tokensCss, path: '' })
    const [outcome] = await real('talk', [A])
    expect(outcome).toHaveProperty('svg')
  })

  it('reports missing TeX files for uncached blocks, without running TeX', async () => {
    // xelatex and dvisvgm exist, but kpsewhich finds none of the files diagrams load.
    const bin = join(root, 'bin')
    mkdirSync(bin)
    for (const [name, body] of [
      ['xelatex', 'exit 1'],
      ['dvisvgm', 'exit 1'],
      ['kpsewhich', 'exit 1'],
    ] as const) {
      writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`)
      chmodSync(join(bin, name), 0o755)
    }
    const real = createTexRenderer({ root, tokensCss, path: bin })
    const [outcome] = await real('talk', [A])
    expect(outcome).toEqual({
      error: {
        file: 'block',
        message: expect.stringMatching(
          /needs TeX: TeX can't find standalone\.cls \(package standalone\), .*FiraSans\.sty \(package fira\).*nix develop/,
        ),
      },
    })
  })

  it('reports missing programs for uncached blocks', async () => {
    const real = createTexRenderer({ root, tokensCss, path: '' })
    const [outcome] = await real('talk', [A])
    expect(outcome).toEqual({
      error: {
        file: 'block',
        message: expect.stringMatching(
          /needs TeX: xelatex, dvisvgm not found.*README.*nix develop/,
        ),
      },
    })
  })

  it('does not cache failures', async () => {
    const failing = createTexRenderer({
      root,
      tokensCss,
      compile: async () => ({ error: { file: 'block', line: 1, message: 'boom' } }),
    })
    expect(await failing('talk', [A])).toEqual([
      { error: { file: 'block', line: 1, message: 'boom' } },
    ])
    expect(() => readdirSync(join(root, CACHE_DIR))).toThrow()
  })
})

describe('diagram cache with themes', () => {
  const forest = new Map([['color-accent', { light: '1E6B3A', dark: '7FD69A' }]])

  it('gives a deck on the default theme the same keys as before themes', async () => {
    await renderer()('talk', [A])
    jobs = []
    await renderer()('talk', [A], new Map())
    expect(jobs).toEqual([])
  })

  it("uses the theme's colours in the palettes, and misses only that deck's diagrams", async () => {
    await renderer()('talk', [A])
    await renderer()('other', [A])
    jobs = []
    await renderer()('talk', [A], forest)
    expect(jobs).toHaveLength(2)
    expect(jobs.find((job) => job.palette.includes('\\DexDarkfalse'))?.palette).toContain(
      '\\definecolor{DexAccent}{HTML}{1E6B3A}',
    )
    expect(jobs.find((job) => job.palette.includes('\\DexDarktrue'))?.palette).toContain(
      '\\definecolor{DexAccent}{HTML}{7FD69A}',
    )
    jobs = []
    await renderer()('other', [A])
    expect(jobs).toEqual([])
  })

  it('recompiles when the theme colours change, and only then', async () => {
    await renderer()('talk', [A], forest)
    jobs = []
    await renderer()('talk', [A], new Map(forest))
    expect(jobs).toEqual([])
    await renderer()('talk', [A], new Map([['color-accent', { light: '1E6B3B', dark: '7FD69A' }]]))
    expect(jobs).toHaveLength(2)
  })
})
