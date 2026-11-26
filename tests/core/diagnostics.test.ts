import { describe, expect, it } from 'vitest'
import { DiagnosticBag, formatDiagnostic, sortDiagnostics } from '../../src/core/diagnostics.ts'

describe('formatDiagnostic', () => {
  it('formats file, line, severity, slide id and message', () => {
    expect(
      formatDiagnostic({
        severity: 'error',
        file: 'decks/http/slides.md',
        line: 120,
        slideId: 'headers',
        message: 'Unknown layout "nope".',
      }),
    ).toBe('decks/http/slides.md:120 error [headers] Unknown layout "nope".')
  })

  it('omits the parts that are unknown', () => {
    expect(formatDiagnostic({ severity: 'warning', file: 'a.md', message: 'Hi.' })).toBe(
      'a.md warning Hi.',
    )
  })
})

describe('DiagnosticBag', () => {
  it('tracks whether any error was reported', () => {
    const bag = new DiagnosticBag()
    bag.warn('a.md', 'careful')
    expect(bag.hasErrors).toBe(false)
    bag.error('a.md', 'broken', { line: 3 })
    expect(bag.hasErrors).toBe(true)
    expect(bag.items).toHaveLength(2)
  })
})

describe('sortDiagnostics', () => {
  it('orders by file then line', () => {
    const sorted = sortDiagnostics([
      { severity: 'error', file: 'b.md', line: 1, message: '1' },
      { severity: 'error', file: 'a.md', line: 9, message: '2' },
      { severity: 'error', file: 'a.md', line: 2, message: '3' },
    ])
    expect(sorted.map((d) => d.message)).toEqual(['3', '2', '1'])
  })
})
