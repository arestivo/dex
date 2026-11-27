/**
 * Readability of a theme: WCAG 2 contrast ratios of the text/background
 * pairs that slides use, in each mode. Pure.
 */
import type { Mode } from '../diagrams/palette.ts'
import type { Colours } from './colours.ts'

/** WCAG AA for normal text. */
export const MIN_CONTRAST = 4.5

export interface ContrastPair {
  readonly foreground: string
  readonly background: string
  /** How the pair is described in messages: "muted text on the background". */
  readonly label: string
}

const TONES = ['info', 'warning', 'error', 'success', 'example'] as const

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { foreground: 'color-text', background: 'color-bg', label: 'text on the background' },
  { foreground: 'color-muted', background: 'color-bg', label: 'muted text on the background' },
  { foreground: 'color-link', background: 'color-bg', label: 'links on the background' },
  {
    foreground: 'color-inverse-text',
    background: 'color-inverse-bg',
    label: 'text on inverse (title and section) slides',
  },
  {
    foreground: 'color-search-text',
    background: 'color-search-match',
    label: 'search matches',
  },
  {
    foreground: 'color-search-text',
    background: 'color-search-current',
    label: 'the current search match',
  },
  ...TONES.map((tone) => ({
    foreground: `tone-${tone}`,
    background: `tone-${tone}-bg`,
    label: `${tone} callouts`,
  })),
]

export interface ContrastProblem extends ContrastPair {
  readonly mode: Mode
  readonly ratio: number
}

/** The pairs below `MIN_CONTRAST`, per mode. */
export function contrastProblems(colours: Colours): ContrastProblem[] {
  const problems: ContrastProblem[] = []
  for (const mode of ['light', 'dark'] as const) {
    for (const pair of CONTRAST_PAIRS) {
      const fg = colours.get(pair.foreground)?.[mode]
      const bg = colours.get(pair.background)?.[mode]
      if (fg === undefined || bg === undefined) continue
      const ratio = contrastRatio(fg, bg)
      if (ratio < MIN_CONTRAST) problems.push({ ...pair, mode, ratio })
    }
  }
  return problems
}

/** WCAG 2 contrast ratio of two six-digit hex colours (without `#`). */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (lighter + 0.05) / (darker + 0.05)
}

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
}
