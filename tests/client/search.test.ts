// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  findMatches,
  firstMatchFrom,
  matchRange,
  normalise,
  normaliseQuery,
  slideText,
  stepMatch,
} from '../../src/client/search.ts'

const texts = (...sources: string[]) => sources.map(normalise)
const found = (source: string, query: string) =>
  findMatches(texts(source), query).map((match) => source.slice(match.start, match.end))

describe('normalise', () => {
  it('ignores case and accents, and collapses whitespace', () => {
    expect(normalise('Função  É\n\tFIM').text).toBe('funcao e fim')
  })

  it('maps every normalised character back to its source', () => {
    const { text, starts, ends } = normalise('Ça  va')
    expect(text).toBe('ca va')
    expect(starts).toEqual([0, 1, 2, 4, 5])
    expect(ends).toEqual([1, 2, 3, 5, 6])
  })
})

describe('normaliseQuery', () => {
  it('is empty for blank queries', () => {
    expect(normaliseQuery('')).toBe('')
    expect(normaliseQuery('   ')).toBe('')
  })
})

describe('findMatches', () => {
  it('ignores case and accents, returning the source text', () => {
    expect(found('A Função e a FUNÇÃO', 'funcao')).toEqual(['Função', 'FUNÇÃO'])
    expect(found('Preflight', 'PRÉFLIGHT')).toEqual(['Preflight'])
  })

  it('finds several matches per text, in order, without overlaps', () => {
    expect(findMatches(texts('aaa', 'xa', 'a a'), 'a')).toEqual([
      { slide: 0, start: 0, end: 1 },
      { slide: 0, start: 1, end: 2 },
      { slide: 0, start: 2, end: 3 },
      { slide: 1, start: 1, end: 2 },
      { slide: 2, start: 0, end: 1 },
      { slide: 2, start: 2, end: 3 },
    ])
    expect(found('aaaa', 'aa')).toEqual(['aa', 'aa'])
  })

  it('matches across collapsed whitespace', () => {
    expect(found('cors\n    preflight', 'cors preflight')).toEqual(['cors\n    preflight'])
  })

  it('finds nothing for an empty query', () => {
    expect(findMatches(texts('anything'), '')).toEqual([])
    expect(findMatches(texts('anything'), '  ')).toEqual([])
  })
})

describe('firstMatchFrom and stepMatch', () => {
  const matches = findMatches(texts('x', 'a', 'x', 'a a'), 'a')

  it('picks the first match on or after the slide, wrapping to the first', () => {
    expect(firstMatchFrom(matches, 0)).toBe(0)
    expect(firstMatchFrom(matches, 2)).toBe(1)
    expect(firstMatchFrom(matches, 3)).toBe(1)
    expect(firstMatchFrom(matches, 9)).toBe(0)
    expect(firstMatchFrom([], 0)).toBe(-1)
  })

  it('steps forwards and backwards, wrapping', () => {
    expect(stepMatch(0, 1, 3)).toBe(1)
    expect(stepMatch(2, 1, 3)).toBe(0)
    expect(stepMatch(0, -1, 3)).toBe(2)
    expect(stepMatch(0, 1, 0)).toBe(-1)
  })
})

describe('slideText and matchRange', () => {
  const slide = (html: string) => {
    const section = document.createElement('section')
    section.innerHTML = html
    return section
  }
  const rangesFor = (element: Element, query: string) => {
    const text = slideText(element)
    return findMatches([text.normalised], query).map((match) =>
      matchRange(text, match.start, match.end)?.toString(),
    )
  }

  it('matches across inline formatting', () => {
    const element = slide('<p>A <strong>pre</strong>flight request</p>')
    expect(rangesFor(element, 'preflight')).toEqual(['preflight'])
  })

  it('does not match across blocks', () => {
    expect(rangesFor(slide('<p>pre</p><p>flight</p>'), 'preflight')).toEqual([])
    expect(rangesFor(slide('<ul><li>pre</li><li>flight</li></ul>'), 'preflight')).toEqual([])
  })

  it('treats a line break as a space', () => {
    expect(rangesFor(slide('<p>cors<br>preflight</p>'), 'cors preflight')).toEqual([
      'corspreflight',
    ])
  })

  it('skips diagrams and visually hidden text', () => {
    const element = slide(
      '<figure class="diagram"><svg><text>Decide</text></svg></figure><span class="visually-hidden">Decide</span><p>Decide</p>',
    )
    const text = slideText(element)
    expect(findMatches([text.normalised], 'decide')).toHaveLength(1)
    expect(rangesFor(element, 'decide')).toEqual(['Decide'])
  })

  it('skips the slide number', () => {
    const element = slide(
      '<p>Version 12</p><div class="slide__number" aria-hidden="true">12 / 12</div>',
    )
    expect(rangesFor(element, '12')).toEqual(['12'])
    expect(
      rangesFor(slide('<p>No digits</p><div class="slide__number">12 / 12</div>'), '12'),
    ).toEqual([])
  })

  it('finds text inside code, across highlighted tokens', () => {
    const element = slide(
      '<pre><code><span>echo</span><span> </span><span>"Hello"</span></code></pre>',
    )
    expect(rangesFor(element, 'echo "hello"')).toEqual(['echo "Hello"'])
  })
})
