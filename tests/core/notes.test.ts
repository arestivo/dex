import { toHtml } from 'hast-util-to-html'
import { describe, expect, it } from 'vitest'
import { compiledDeck, deck, messages, slide, slidesHtml } from '../helpers.ts'

const notesHtml = async (source: string, options = {}) =>
  (await compiledDeck(source, options)).slides.map((s) =>
    s.notes === undefined ? undefined : toHtml({ type: 'root', children: [...s.notes] }),
  )

describe('speaker notes', () => {
  it('are taken out of the slide and rendered on their own', async () => {
    const source = deck(
      slide(
        'one',
        '# One\n\nVisible.\n\n:::notes\nAsk who has used **curl**.\n\n```sh\ncurl -I x\n```\n:::',
      ),
      slide('two', '# Two'),
    )
    const [one, two] = await slidesHtml(source)
    expect(one).toContain('Visible.')
    expect(one).not.toContain('curl')
    expect(two).not.toContain('notes')
    const [notes, none] = await notesHtml(source)
    expect(notes).toContain('Ask who has used <strong>curl</strong>.')
    expect(notes).toContain('<pre')
    expect(none).toBeUndefined()
  })

  it('may come after a slot, and never reach the layout', async () => {
    const source = slide(
      'cols',
      '# Cols\n\n::slot{name=left}\n\nLeft\n\n::slot{name=right}\n\nRight\n\n:::notes\nSay left first.\n:::',
      'layout=two-columns',
    )
    const [html] = await slidesHtml(source)
    expect(html).toContain('Right')
    expect(html).not.toContain('Say left first')
    expect((await notesHtml(source))[0]).toContain('Say left first.')
  })

  it('check their links like slide content', async () => {
    expect(await messages(slide('a', '# A\n\n:::notes\nSee [the end](#nowhere).\n:::'))).toEqual([
      expect.stringMatching(/decks\/test\/slides\.md:\d+ error \[a\] .*#nowhere/),
    ])
  })

  it('allow one block per slide', async () => {
    expect(await messages(slide('a', '# A\n\n:::notes\nOne\n:::\n\n:::notes\nTwo\n:::'))).toEqual([
      'decks/test/slides.md:13 error [a] A slide has at most one `:::notes` block: merge this one into the first.',
    ])
  })

  it('must sit at the top level of the slide', async () => {
    expect(
      await messages(slide('a', '# A\n\n:::info\nText\n\n::::notes\nHidden\n::::\n:::')),
    ).toEqual([
      'decks/test/slides.md:12 error [a] Speaker notes go at the top level of a slide: move this `:::notes` block out of the block that contains it.',
    ])
  })

  it('keep the assets only they use apart from the slide assets', async () => {
    const result = await compiledDeck(
      slide(
        'a',
        '![Slide](assets/a.png)\n\n:::notes\n![Note](assets/b.png) and ![Again](assets/a.png)\n:::',
      ),
      { assets: ['assets/a.png', 'assets/b.png'] },
    )
    expect([...result.assets]).toEqual(['assets/a.png'])
    expect([...result.noteAssets]).toEqual(['assets/b.png'])
  })
})
