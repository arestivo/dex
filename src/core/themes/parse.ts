/**
 * The `theme.css` format: one `:root { … }` rule setting colour tokens, each
 * to `light-dark(<light>, <dark>)` or to one colour for both modes, colours
 * written as hex. Deliberately narrow, so every theme can be checked, turned
 * into diagram palettes and contrast-checked. Pure: strings in, data out.
 */
import type { ModeColour } from '../model.ts'

/** Prefixes of the tokens a theme may set (from the engine's `tokens.css`). */
export const THEMEABLE_PREFIXES = ['color-', 'tone-', 'code-'] as const

export interface TokenDefault {
  /** Without the leading `--`. */
  readonly name: string
  /** The declared value, as written in `tokens.css`. */
  readonly value: string
}

export type ThemeColour = ModeColour

export interface ThemeDeclaration extends ThemeColour {
  readonly token: string
  readonly line: number
}

export interface ThemeProblem {
  readonly line: number
  readonly message: string
}

export interface ParsedTheme {
  readonly declarations: readonly ThemeDeclaration[]
  readonly problems: readonly ThemeProblem[]
}

/** The colour tokens of `tokens.css`, in file order: what a theme may set. */
export function themeableTokens(tokensCss: string): TokenDefault[] {
  const root = /:root\s*\{([^}]*)\}/.exec(stripComments(tokensCss))?.[1] ?? ''
  return [...root.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].flatMap(([, name, value]) =>
    name !== undefined &&
    value !== undefined &&
    THEMEABLE_PREFIXES.some((prefix) => name.startsWith(prefix))
      ? [{ name, value: value.replace(/\s+/g, ' ').trim() }]
      : [],
  )
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const LIGHT_DARK = /^light-dark\(\s*([^,\s]+)\s*,\s*([^)\s]+)\s*\)$/

/** `#abc` or `#aabbcc` → `AABBCC`; anything else → undefined. */
export function normaliseHex(value: string): string | undefined {
  const digits = HEX.exec(value.trim())?.[1]
  if (digits === undefined) return undefined
  const full = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits
  return full.toUpperCase()
}

/** Reads a theme value: `light-dark(#l, #d)` or one hex colour. */
export function parseColourValue(value: string): ThemeColour | undefined {
  const pair = LIGHT_DARK.exec(value.trim())
  if (pair) {
    const light = normaliseHex(pair[1] ?? '')
    const dark = normaliseHex(pair[2] ?? '')
    return light && dark ? { light, dark } : undefined
  }
  const both = normaliseHex(value)
  return both ? { light: both, dark: both } : undefined
}

/** Parses a `theme.css`. `themeable` are the token names a theme may set. */
export function parseThemeCss(css: string, themeable: ReadonlySet<string>): ParsedTheme {
  const text = stripComments(css)
  const problems: ThemeProblem[] = []
  const declarations: ThemeDeclaration[] = []
  const lineAt = (offset: number) => text.slice(0, offset).split('\n').length

  const rule = /:root\s*\{([^}]*)\}/.exec(text)
  if (rule === null) {
    problems.push({
      line: 1,
      message:
        'A theme.css must contain one `:root { … }` rule that sets colour tokens, e.g. `:root { --color-accent: light-dark(#0b6e4f, #6fd3a8); }`.',
    })
    return { declarations, problems }
  }
  const before = text.slice(0, rule.index)
  const after = text.slice(rule.index + rule[0].length)
  for (const [offset, rest] of [
    [0, before],
    [rule.index + rule[0].length, after],
  ] as const) {
    const stray = /\S/.exec(rest)
    if (stray) {
      problems.push({
        line: lineAt(offset + stray.index),
        message:
          'Only one `:root { … }` rule is allowed in a theme.css: themes set colour tokens and nothing else. Move this into the `:root` rule or remove it.',
      })
      break
    }
  }

  const bodyStart = rule.index + rule[0].indexOf('{') + 1
  const body = rule[1] ?? ''
  const seen = new Set<string>()
  let offset = 0
  for (const chunk of body.split(';')) {
    const start = bodyStart + offset + (/\S/.exec(chunk)?.index ?? 0)
    offset += chunk.length + 1
    if (chunk.trim() === '') continue
    const line = lineAt(start)
    const match = /^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(chunk)
    if (!match) {
      problems.push({
        line,
        message: `\`${chunk.trim()}\` is not a colour token: themes only set colour tokens (custom properties such as \`--color-accent\`). Run \`dex docs themes\` for the list.`,
      })
      continue
    }
    const [, token = '', value = ''] = match
    if (!themeable.has(token)) {
      problems.push({
        line,
        message: `\`--${token}\` is not a colour token: themes only set colour tokens. Run \`dex docs themes\` for the list.`,
      })
      continue
    }
    if (seen.has(token)) {
      problems.push({ line, message: `\`--${token}\` is set twice: keep one.` })
      continue
    }
    seen.add(token)
    const colour = parseColourValue(value)
    if (colour === undefined) {
      problems.push({
        line,
        message: `Write \`--${token}\` as \`light-dark(#rrggbb, #rrggbb)\` (light mode, then dark mode) or as one hex colour for both modes; \`${value}\` can't be checked or used in diagrams.`,
      })
      continue
    }
    declarations.push({ token, line, ...colour })
  }
  return { declarations, problems }
}

/** Replaces comments with spaces, keeping line breaks (so line numbers stay right). */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
}
