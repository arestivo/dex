import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normaliseHex, parseThemeCss, themeableTokens } from '../../src/core/themes/parse.ts'
import { TOKEN_ROLES } from '../../src/core/themes/roles.ts'
import { PROJECT_ROOT } from '../helpers.ts'

const tokens = themeableTokens(readFileSync(join(PROJECT_ROOT, 'styles/tokens.css'), 'utf8'))
const THEMEABLE = new Set(tokens.map((token) => token.name))
const parse = (css: string) => parseThemeCss(css, THEMEABLE)

describe('themeableTokens', () => {
  it('lists the colour, tone and code tokens of tokens.css, and nothing else', () => {
    const names = tokens.map((token) => token.name)
    expect(names).toContain('color-accent')
    expect(names).toContain('tone-warning-bg')
    expect(names).toContain('code-bg')
    expect(names.every((name) => /^(color|tone|code)-/.test(name))).toBe(true)
    expect(names).not.toContain('space-2')
    expect(names).not.toContain('chrome-bg')
    expect(tokens.find((token) => token.name === 'color-link')?.value).toBe('var(--color-accent)')
  })
})

describe('normaliseHex', () => {
  it('expands short colours and upper-cases', () => {
    expect(normaliseHex('#0b6')).toBe('00BB66')
    expect(normaliseHex('#0b6e4f')).toBe('0B6E4F')
    expect(normaliseHex('green')).toBeUndefined()
  })
})

describe('parseThemeCss', () => {
  it('reads light-dark pairs and single colours, with their lines', () => {
    const { declarations, problems } = parse(
      ':root {\n  /* accent */\n  --color-accent: light-dark(#0b6e4f, #6fd3a8);\n  --color-inverse-text: #fff;\n}\n',
    )
    expect(problems).toEqual([])
    expect(declarations).toEqual([
      { token: 'color-accent', light: '0B6E4F', dark: '6FD3A8', line: 3 },
      { token: 'color-inverse-text', light: 'FFFFFF', dark: 'FFFFFF', line: 4 },
    ])
  })

  it('accepts an empty rule (the default theme)', () => {
    expect(parse("/* Today's colours. */\n:root {}\n")).toEqual({ declarations: [], problems: [] })
  })

  it('rejects tokens that are not colours', () => {
    const { problems } = parse(':root {\n  --space-2: 1em;\n}')
    expect(problems).toEqual([
      {
        line: 2,
        message:
          '`--space-2` is not a colour token: themes only set colour tokens. Run `dex docs themes` for the list.',
      },
    ])
  })

  it('rejects plain properties', () => {
    expect(parse(':root {\n  color: red;\n}').problems[0]?.message).toMatch(
      /^`color: red` is not a colour token/,
    )
  })

  it('rejects values it cannot read', () => {
    const { problems } = parse(':root {\n  --color-accent: rebeccapurple;\n}')
    expect(problems).toEqual([
      {
        line: 2,
        message:
          "Write `--color-accent` as `light-dark(#rrggbb, #rrggbb)` (light mode, then dark mode) or as one hex colour for both modes; `rebeccapurple` can't be checked or used in diagrams.",
      },
    ])
    expect(parse(':root { --color-accent: light-dark(#fff, var(--x)); }').problems).toHaveLength(1)
  })

  it('rejects other rules, and a file without :root', () => {
    expect(parse(':root { --color-accent: #123456; }\n\n.slide { color: red }').problems).toEqual([
      {
        line: 3,
        message:
          'Only one `:root { … }` rule is allowed in a theme.css: themes set colour tokens and nothing else. Move this into the `:root` rule or remove it.',
      },
    ])
    expect(parse('--color-accent: #123456;').problems[0]?.message).toMatch(
      /must contain one `:root/,
    )
  })

  it('rejects a token set twice', () => {
    const { problems, declarations } = parse(
      ':root {\n  --color-accent: #111;\n  --color-accent: #222;\n}',
    )
    expect(declarations).toHaveLength(1)
    expect(problems).toEqual([{ line: 3, message: '`--color-accent` is set twice: keep one.' }])
  })
})

describe('token roles', () => {
  it('describe every colour token, and nothing else', () => {
    expect(Object.keys(TOKEN_ROLES).sort()).toEqual(tokens.map((token) => token.name).sort())
  })
})
