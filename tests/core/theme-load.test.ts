import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatDiagnostic } from '../../src/core/diagnostics.ts'
import { loadThemeSet, themesCss } from '../../src/core/themes/load.ts'
import { themeableTokens } from '../../src/core/themes/parse.ts'
import { FIXTURES, PROJECT_ROOT } from '../helpers.ts'

const TOKENS = themeableTokens(readFileSync(join(PROJECT_ROOT, 'styles/tokens.css'), 'utf8'))
let root: string
const write = (path: string, text: string) => {
  mkdirSync(join(root, path, '..'), { recursive: true })
  writeFileSync(join(root, path), text)
}
const theme = (folder: string, name: string, css: string, notes?: string) => {
  write(`${folder}/${name}/theme.css`, css)
  if (notes !== undefined) write(`${folder}/${name}/theme.md`, notes)
}
const load = () => {
  const set = loadThemeSet(
    root,
    [
      { dir: 'engine', origin: 'built-in' },
      { dir: 'themes', origin: 'local' },
    ],
    TOKENS,
  )
  return { themes: set.themes, lines: set.diagnostics.items.map(formatDiagnostic) }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dex-themes-'))
  theme('engine', 'default', ':root {}', '---\ndescription: Default.\n---\n')
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('loadThemeSet', () => {
  it('loads built-in and local themes with their colours and lines', () => {
    theme(
      'themes',
      'ocean',
      ':root {\n  --color-accent: light-dark(#0b6e70, #5fd4d6);\n}',
      '---\ndescription: Teal.\n---\nNotes.',
    )
    const { themes, lines } = load()
    expect(lines).toEqual([])
    expect(themes.get('default')).toMatchObject({ origin: 'built-in', css: '' })
    const ocean = themes.get('ocean')
    expect(ocean).toMatchObject({
      origin: 'local',
      description: 'Teal.',
      notes: 'Notes.',
      file: 'themes/ocean/theme.css',
    })
    expect(ocean?.colours.get('color-accent')).toEqual({ light: '0B6E70', dark: '5FD4D6' })
    expect(ocean?.lines.get('color-accent')).toBe(2)
    expect(ocean?.css).toBe(
      '@layer themes {\n  :root[data-theme="ocean"] {\n    --color-accent: light-dark(#0B6E70, #5FD4D6);\n  }\n}\n',
    )
  })

  it('rejects a local theme that reuses a built-in name and keeps the built-in', () => {
    theme('themes', 'default', ':root { --color-accent: #111111; }', '---\ndescription: x\n---\n')
    const { themes, lines } = load()
    expect(themes.get('default')?.origin).toBe('built-in')
    expect(lines).toEqual([
      'themes/default/theme.css error "default" is a built-in theme: local themes cannot replace built-in ones. Rename this folder (e.g. themes/default-custom/).',
    ])
  })

  it('reports format problems at their line, and still loads the rest', () => {
    theme(
      'themes',
      'bad',
      ':root {\n  --color-accent: light-dark(#1d5fd6, #7ea9ff);\n  --space-2: 1em;\n}',
      '---\ndescription: x\n---\n',
    )
    const { themes, lines } = load()
    expect(themes.get('bad')?.colours.size).toBe(1)
    expect(lines).toEqual([
      'themes/bad/theme.css:3 error `--space-2` is not a colour token: themes only set colour tokens. Run `dex docs themes` for the list.',
    ])
  })

  it('warns about a missing theme.md, and the theme still works', () => {
    theme('themes', 'bare', ':root {}')
    const { themes, lines } = load()
    expect(themes.has('bare')).toBe(true)
    expect(lines).toEqual([
      'themes/bare/theme.md warning Theme "bare" has no theme.md: add one with a description and usage notes, so people and agents know when and how to use it.',
    ])
  })

  it('rejects invalid names and folders without theme.css', () => {
    write('themes/Bad_Name/theme.css', ':root {}')
    write('themes/empty/notes.txt', '')
    expect(load().lines).toEqual([
      'themes/Bad_Name error Invalid theme name "Bad_Name": theme folders must match /^[a-z][a-z0-9-]*$/.',
      'themes/empty/theme.css error Theme "empty" has no theme.css.',
    ])
  })

  it('requires the built-in default theme', () => {
    rmSync(join(root, 'engine/default'), { recursive: true })
    expect(load().lines).toEqual([
      'engine/default/theme.css error The "default" theme is required.',
    ])
  })
})

describe('contrast check', () => {
  it('passes the default colours', () => {
    expect(load().lines).toEqual([])
  })

  it('warns about a hard-to-read pair, per mode, at the line the theme sets', () => {
    theme(
      'themes',
      'murky',
      ':root {\n  --color-bg: light-dark(#ffffff, #12141a);\n  --color-muted: light-dark(#5a6376, #2a2f3a);\n}',
      '---\ndescription: x\n---\n',
    )
    expect(load().lines).toEqual([
      'themes/murky/theme.css:3 warning Muted text on the background: hard to read in dark mode (contrast 1.37:1 between --color-muted and --color-bg, below 4.5:1). Make one of the two colours lighter or darker.',
    ])
  })

  it('checks links that follow the accent', () => {
    theme('themes', 'pale', ':root {\n  --color-accent: #bbbbbb;\n}', '---\ndescription: x\n---\n')
    const lines = load().lines
    expect(
      lines.some((line) => line.includes('Links on the background: hard to read in light mode')),
    ).toBe(true)
  })
})

describe('themesCss', () => {
  it('scopes each theme under :root[data-theme] in the themes layer', () => {
    const set = loadThemeSet(
      join(FIXTURES, 'themes'),
      [
        { dir: join(PROJECT_ROOT, 'themes'), origin: 'built-in' },
        { dir: 'themes', origin: 'local' },
      ],
      TOKENS,
    )
    expect(set.diagnostics.items).toEqual([])
    const css = themesCss(set.themes.values())
    expect(css).toContain('@layer themes {\n  :root[data-theme="ocean"] {')
    expect(css).toContain('--color-inverse-text: #F3F5FA;')
    expect(css).not.toContain('data-theme="default"')
  })
})

describe('built-in themes', () => {
  const set = loadThemeSet(PROJECT_ROOT, [{ dir: 'themes', origin: 'built-in' }], TOKENS)

  it('are default plus at least four others', () => {
    expect([...set.themes.keys()].sort()).toEqual(
      expect.arrayContaining(['default', 'ember', 'forest', 'high-contrast', 'slate']),
    )
  })

  it('load with no diagnostics, contrast included, in both modes', () => {
    expect(set.diagnostics.items.map(formatDiagnostic)).toEqual([])
  })

  it('all have a description', () => {
    for (const theme of set.themes.values()) expect(theme.description).not.toBe('')
  })
})
