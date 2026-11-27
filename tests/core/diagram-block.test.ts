import { describe, expect, it } from 'vitest'
import { isDiagramLanguage, parseAlt, validateTikz } from '../../src/core/diagrams/block.ts'

describe('isDiagramLanguage', () => {
  it('recognises tikz only', () => {
    expect(isDiagramLanguage('tikz')).toBe(true)
    expect(isDiagramLanguage('TikZ')).toBe(true)
    expect(isDiagramLanguage('latex')).toBe(false)
    expect(isDiagramLanguage(undefined)).toBe(false)
  })
})

describe('parseAlt', () => {
  it('reads the alt text', () => {
    expect(parseAlt('alt="The agent loop"')).toBe('The agent loop')
    expect(parseAlt('other=1 alt="Quotes \\"inside\\""')).toBe('Quotes "inside"')
  })

  it('is undefined when missing or empty', () => {
    expect(parseAlt(undefined)).toBeUndefined()
    expect(parseAlt('title="x"')).toBeUndefined()
    expect(parseAlt('alt=""')).toBeUndefined()
  })
})

describe('validateTikz', () => {
  const picture = '\\begin{tikzpicture}\n  \\node {A};\n\\end{tikzpicture}'

  it('accepts one tikzpicture, with comments and whitespace around it', () => {
    expect(validateTikz(picture)).toBeUndefined()
    expect(validateTikz(`% a comment\n\n${picture}\n% done\n`)).toBeUndefined()
    expect(
      validateTikz('\\begin{tikzpicture}[x=1cm] \\node {50\\%}; \\end{tikzpicture}'),
    ).toBeUndefined()
  })

  it('rejects text outside the environment', () => {
    expect(validateTikz(`\\tikzset{a/.style={}}\n${picture}`)).toMatch(/exactly one tikzpicture/)
    expect(validateTikz(`${picture}\nafter`)).toMatch(/exactly one tikzpicture/)
  })

  it('rejects no environment or two', () => {
    expect(validateTikz('\\node {A};')).toMatch(/exactly one tikzpicture/)
    expect(validateTikz(`${picture}\n${picture}`)).toMatch(/exactly one tikzpicture/)
  })
})
