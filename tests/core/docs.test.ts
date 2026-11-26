import { describe, expect, it } from 'vitest'
import { builtInLayouts, compile } from '../helpers.ts'

/** The fenced example under "## Example" in a layout's notes. */
function example(notes: string): string | undefined {
  const section = notes.split('## Example')[1] ?? ''
  const open = /^(`{3,})markdown\s*$/m.exec(section)
  if (!open?.[1]) return undefined
  const rest = section.slice((open.index ?? 0) + open[0].length + 1)
  const close = new RegExp(`^${open[1]}\\s*$`, 'm').exec(rest)
  return close ? rest.slice(0, close.index) : undefined
}

describe('built-in layout notes (layout.md)', () => {
  for (const [name, layout] of builtInLayouts) {
    describe(name, () => {
      it('has a description and usage notes', () => {
        expect(layout.description).not.toBe('')
        expect(layout.notes).toMatch(/## When to use/)
      })

      it('has an example that compiles without errors', async () => {
        const source = example(layout.notes ?? '')
        expect(source, 'an ```markdown example under ## Example').toBeDefined()
        const { diagnostics } = await compile(source ?? '')
        expect(diagnostics.items.filter((d) => d.severity === 'error')).toEqual([])
        // The default layout is used when no layout= is given.
        if (name !== 'default') expect(source).toContain(`layout=${name}`)
      })
    })
  }
})
