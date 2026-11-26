import { describe, expect, it } from 'vitest'
import { splitSlides } from '../../src/core/parse/split.ts'

const lines = (text: string) => text.split('\n')

describe('splitSlides', () => {
  it('splits on --- lines and records start lines', () => {
    const slides = splitSlides(lines('a\n---\nb\n---\nc'), 10)
    expect(slides).toEqual([
      { markdown: 'a', line: 10 },
      { markdown: 'b', line: 12 },
      { markdown: 'c', line: 14 },
    ])
  })

  it('ignores separators inside fenced code', () => {
    const slides = splitSlides(lines('```yaml\n---\nkey: 1\n```\n---\nnext'), 1)
    expect(slides).toHaveLength(2)
    expect(slides[0]?.markdown).toBe('```yaml\n---\nkey: 1\n```')
  })

  it('needs a matching fence to close a code block', () => {
    const slides = splitSlides(lines('````\n```\n---\n````\n---\nx'), 1)
    expect(slides).toHaveLength(2)
  })

  it('handles tilde fences', () => {
    expect(splitSlides(lines('~~~\n---\n~~~'), 1)).toHaveLength(1)
  })

  it('does not treat longer rules as separators', () => {
    expect(splitSlides(lines('a\n----\nb'), 1)).toHaveLength(1)
  })
})
