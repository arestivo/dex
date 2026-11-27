import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DIAGRAM_COLOURS,
  DIAGRAM_THEMES,
  paletteTex,
  parseColourTokens,
} from '../../src/core/diagrams/palette.ts'
import { PROJECT_ROOT } from '../helpers.ts'

const tokens = parseColourTokens(readFileSync(join(PROJECT_ROOT, 'styles/tokens.css'), 'utf8'))

describe('parseColourTokens', () => {
  it('reads light-dark() pairs and plain hex values', () => {
    const parsed = parseColourTokens(
      '--a: light-dark(#ffffff, #12141a);\n--b: #f3f5fa;\n--c: var(--a);',
    )
    expect(Object.fromEntries(parsed)).toEqual({
      a: { light: 'FFFFFF', dark: '12141A' },
      b: { light: 'F3F5FA', dark: 'F3F5FA' },
    })
  })
})

describe('diagram palettes', () => {
  for (const theme of DIAGRAM_THEMES) {
    it(`defines every Dex colour with the token values (${theme})`, () => {
      const tex = paletteTex(tokens, theme)
      for (const [colour, token] of Object.entries(DIAGRAM_COLOURS)) {
        const value = tokens.get(token)?.[theme]
        expect(value, `--${token}`).toMatch(/^[0-9A-F]{6}$/)
        expect(tex).toContain(`\\definecolor{${colour}}{HTML}{${value}}`)
      }
    })
  }

  it('sets \\ifDexDark only for the dark palette', () => {
    expect(paletteTex(tokens, 'light')).toContain('\\DexDarkfalse')
    expect(paletteTex(tokens, 'dark')).toContain('\\DexDarktrue')
  })

  it('uses different values per theme', () => {
    expect(paletteTex(tokens, 'light')).toContain('{DexInk}{HTML}{1B2130}')
    expect(paletteTex(tokens, 'dark')).toContain('{DexInk}{HTML}{E4E7EE}')
  })

  it('fails loudly when a token disappears', () => {
    expect(() => paletteTex(new Map(), 'light')).toThrow(/needs the CSS token --color-text/)
  })
})
