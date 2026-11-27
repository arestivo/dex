import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mergeColours } from '../../src/core/themes/colours.ts'
import { contrastProblems, contrastRatio } from '../../src/core/themes/contrast.ts'
import { themeableTokens } from '../../src/core/themes/parse.ts'
import { PROJECT_ROOT } from '../helpers.ts'

const TOKENS = themeableTokens(readFileSync(join(PROJECT_ROOT, 'styles/tokens.css'), 'utf8'))

describe('contrastRatio', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('000000', 'FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('FFFFFF', 'FFFFFF')).toBeCloseTo(1, 5)
    expect(contrastRatio('777777', 'FFFFFF')).toBeCloseTo(4.48, 2)
  })
})

describe('mergeColours', () => {
  it('keeps defaults, applies overrides and resolves var() defaults', () => {
    const merged = mergeColours(
      TOKENS,
      new Map([['color-accent', { light: '0B6E70', dark: '5FD4D6' }]]),
    )
    expect(merged.get('color-accent')).toEqual({ light: '0B6E70', dark: '5FD4D6' })
    expect(merged.get('color-link')).toEqual({ light: '0B6E70', dark: '5FD4D6' })
    expect(merged.get('color-bg')).toEqual({ light: 'FFFFFF', dark: '12141A' })
  })
})

describe('contrastProblems', () => {
  it('finds nothing in the default colours', () => {
    expect(contrastProblems(mergeColours(TOKENS, new Map()))).toEqual([])
  })

  it('checks search highlights against their text', () => {
    const merged = mergeColours(
      TOKENS,
      new Map([['color-search-current', { light: 'FF8A3D', dark: 'E0E0E0' }]]),
    )
    expect(contrastProblems(merged)).toEqual([
      expect.objectContaining({
        foreground: 'color-search-text',
        background: 'color-search-current',
        label: 'the current search match',
        mode: 'dark',
      }),
    ])
  })

  it('reports a pair in the mode where it fails', () => {
    const merged = mergeColours(
      TOKENS,
      new Map([['tone-warning', { light: '9A5B00', dark: '3A2E10' }]]),
    )
    expect(contrastProblems(merged)).toEqual([
      expect.objectContaining({
        foreground: 'tone-warning',
        background: 'tone-warning-bg',
        mode: 'dark',
      }),
    ])
  })
})
