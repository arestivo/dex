import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { builtInLayouts, PROJECT_ROOT } from '../helpers.ts'

/** Rows of the "Available layouts" table in docs/layouts.md: name → slots. */
function documentedLayouts(): Map<string, string[]> {
  const doc = readFileSync(join(PROJECT_ROOT, 'docs/layouts.md'), 'utf8')
  const section = doc.split('## Available layouts')[1]?.split('\n## ')[0] ?? ''
  const rows = section.split('\n').filter((line) => /^\| `/.test(line))
  return new Map(
    rows.map((row) => {
      const [name = '', , slots = ''] = row
        .split('|')
        .slice(1)
        .map((cell) => cell.trim())
      return [
        name.replaceAll('`', ''),
        slots
          .split(',')
          .map((slot) => slot.trim().replaceAll('`', ''))
          .map((slot) => (slot === 'default' ? '' : slot)),
      ]
    }),
  )
}

describe('docs/layouts.md', () => {
  it('lists exactly the built-in layouts with their real slots', () => {
    const documented = documentedLayouts()
    expect([...documented.keys()].sort()).toEqual([...builtInLayouts.keys()].sort())
    for (const [name, layout] of builtInLayouts) {
      expect(new Set(documented.get(name)), `slots of ${name}`).toEqual(new Set(layout.slots))
    }
  })
})
