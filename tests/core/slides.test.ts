import { describe, expect, it } from 'vitest'
import { compile, deck, messages, slide } from '../helpers.ts'

describe('slide declaration', () => {
  it('reads id, layout and classes', async () => {
    const { deck: result } = await compile(slide('codes', '# Status codes', 'layout=center .dense'))
    const [first] = result?.slides ?? []
    expect(first).toMatchObject({ id: 'codes', layout: 'center', title: 'Status codes', number: 1 })
    expect(first?.element.properties.className).toEqual(['slide', 'dense'])
  })

  it('requires a declaration and suggests an id', async () => {
    expect(await messages('# How does it work?\n')).toEqual([
      'decks/test/slides.md:5 error Slide 1 must start with a slide declaration, e.g. `::slide{#how-does-it-work}`.',
    ])
  })

  it('requires an id', async () => {
    expect((await messages('::slide{layout=center}\n'))[0]).toMatch(/Slide 1 has no id/)
  })

  it.each(['12', 'Status_Codes', 'a b'])('rejects the invalid id %j', async (id) => {
    const result = await messages(`::slide{#${id}}\n`)
    expect(result.join('\n')).toMatch(/Invalid slide id|has no id|Unknown slide attribute/)
  })

  it('rejects unknown attributes', async () => {
    expect((await messages('::slide{#a color=red}\n'))[0]).toMatch(
      /Unknown slide attribute "color"/,
    )
  })

  it('reports duplicate ids at both lines', async () => {
    const result = await messages(deck(slide('same', 'a'), slide('same', 'b')))
    expect(result).toHaveLength(2)
    expect(result[0]).toMatch(/^decks\/test\/slides.md:5 error \[same\] Duplicate slide id/)
    expect(result[1]).toMatch(/^decks\/test\/slides.md:11 error \[same\] Duplicate slide id/)
  })

  it('reports a second declaration (a missing separator)', async () => {
    const result = await messages('::slide{#a}\n\n::slide{#b}\n')
    expect(result[0]).toMatch(/Did you forget a `---` separator/)
  })

  it('reports unknown layouts with the available ones', async () => {
    expect((await messages(slide('a', 'x', 'layout=nope')))[0]).toBe(
      'decks/test/slides.md:5 error [a] Unknown layout "nope". Available: center, default, section, title, two-columns.',
    )
  })

  it('ignores a trailing separator with a warning', async () => {
    const { deck: result, diagnostics } = await compile(`${slide('a', 'x')}\n---\n`)
    expect(result?.slides).toHaveLength(1)
    expect(diagnostics.items[0]?.message).toMatch(/Empty slide ignored/)
  })

  it('keeps ids stable when slides move', async () => {
    const one = await compile(deck(slide('a', '# A'), slide('b', '# B')))
    const two = await compile(deck(slide('b', '# B'), slide('a', '# A')))
    const ids = (r: typeof one) => r.deck?.slides.map((s) => [s.id, s.title])
    expect(ids(one)).toEqual([
      ['a', 'A'],
      ['b', 'B'],
    ])
    expect(ids(two)).toEqual([
      ['b', 'B'],
      ['a', 'A'],
    ])
  })
})
