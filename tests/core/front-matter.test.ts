import { describe, expect, it } from 'vitest'
import { DiagnosticBag } from '../../src/core/diagnostics.ts'
import { parseFrontMatter } from '../../src/core/parse/front-matter.ts'

function parse(source: string) {
  const diagnostics = new DiagnosticBag()
  const result = parseFrontMatter(source, 'deck.md', diagnostics)
  return { ...result, messages: diagnostics.items.map((d) => d.message) }
}

describe('parseFrontMatter', () => {
  it('accepts a minimal front matter and defaults lang to en', () => {
    const { meta, messages, bodyLine } = parse('---\ntitle: HTTP\n---\nbody')
    expect(messages).toEqual([])
    expect(meta).toEqual({ title: 'HTTP', lang: 'en' })
    expect(bodyLine).toBe(4)
  })

  it('reads every supported key', () => {
    const { meta } = parse(
      '---\ntitle: HTTP\nsubtitle: The protocol\ndescription: About HTTP\nlang: pt-PT\nauthor:\n  name: Ana\n  url: https://example.com\n---\n',
    )
    expect(meta).toEqual({
      title: 'HTTP',
      subtitle: 'The protocol',
      description: 'About HTTP',
      lang: 'pt-PT',
      author: { name: 'Ana', url: 'https://example.com' },
    })
  })

  it('accepts the author as a plain name', () => {
    expect(parse('---\ntitle: T\nauthor: Ana\n---\n').meta?.author).toEqual({ name: 'Ana' })
  })

  it('reports a missing title', () => {
    const { meta, messages } = parse('---\nsubtitle: x\n---\n')
    expect(meta).toBeUndefined()
    expect(messages).toContain('The front matter must define `title`.')
  })

  it('reports unknown keys by name', () => {
    const { messages } = parse('---\ntitle: T\ncolours: blue\n---\n')
    expect(messages[0]).toMatch(/Unknown front matter key "colours"/)
  })

  it('accepts a theme', () => {
    const { meta, messages } = parse('---\ntitle: T\ntheme: forest\n---\n')
    expect(messages).toEqual([])
    expect(meta?.theme).toBe('forest')
  })

  it('reports a missing or unclosed block', () => {
    expect(parse('# no front matter').messages[0]).toMatch(/must start with a YAML front matter/)
    expect(parse('---\ntitle: T\n').messages[0]).toMatch(/not closed/)
  })

  it('reports invalid YAML', () => {
    expect(parse('---\ntitle: [unclosed\n---\n').messages[0]).toMatch(/Invalid YAML/)
  })
})
