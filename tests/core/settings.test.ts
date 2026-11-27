import { describe, expect, it } from 'vitest'
import { DiagnosticBag, formatDiagnostic } from '../../src/core/diagnostics.ts'
import { parseSettings } from '../../src/core/settings.ts'

const parse = (text: string) => {
  const bag = new DiagnosticBag()
  const settings = parseSettings(text, 'dex.yaml', bag)
  return { settings, lines: bag.items.map(formatDiagnostic) }
}

describe('parseSettings', () => {
  it('reads the folder theme', () => {
    expect(parse('theme: slate\n')).toEqual({ settings: { theme: 'slate' }, lines: [] })
  })

  it('accepts an empty file', () => {
    expect(parse('')).toEqual({ settings: {}, lines: [] })
    expect(parse('# nothing yet\n')).toEqual({ settings: {}, lines: [] })
  })

  it('rejects unknown keys at their line, listing the allowed ones', () => {
    expect(parse('theme: slate\nport: 8080\n')).toEqual({
      settings: { theme: 'slate' },
      lines: ['dex.yaml:2 error Unknown key "port" in dex.yaml. Allowed keys: theme.'],
    })
  })

  it('rejects invalid YAML and non-mappings', () => {
    expect(parse('theme: [\n').lines[0]).toMatch(/^dex\.yaml:1 error Invalid YAML: /)
    expect(parse('- slate\n').lines).toEqual([
      'dex.yaml:1 error dex.yaml must be a YAML mapping, e.g. `theme: slate`. Allowed keys: theme.',
    ])
  })

  it('rejects a theme that is not a name', () => {
    expect(parse('theme: 3\n').lines).toEqual([
      'dex.yaml:1 error `theme` must be the name of a theme, e.g. `theme: slate`.',
    ])
  })
})
