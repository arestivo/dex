import { describe, expect, it } from 'vitest'
import { messages, slide, slidesHtml } from '../helpers.ts'

const steps = (html: string) =>
  [...html.matchAll(/<(\w+) class="step" data-step="(\d+)">/g)].map(
    ([, tag, number]) => `${tag}${number}`,
  )

describe('steps', () => {
  it('number block and inline steps in source order', async () => {
    const [html = ''] = await slidesHtml(
      slide(
        'a',
        '# A\n\nAlways shown.\n\n:::step\n```sh\ncurl -I x\n```\n:::\n\nThen :step[the answer].',
      ),
    )
    expect(steps(html)).toEqual(['div1', 'span2'])
    expect(html).toContain('<p>Always shown.</p>')
    expect(html).toContain('<span class="step" data-step="2">the answer</span>')
  })

  it('make each item of a :::steps list a step, with its nested list', async () => {
    const [html = ''] = await slidesHtml(
      slide('a', '# A\n\n:::steps\n- One\n- Two\n  - Two and a half\n- Three\n:::'),
    )
    expect(steps(html)).toEqual(['li1', 'li2', 'li3'])
    // No wrapper: the list itself takes the block's place.
    expect(html).toMatch(/<ul>\s*<li class="step" data-step="1">/)
    expect(html).toMatch(/data-step="2">Two\s*<ul>\s*<li>Two and a half<\/li>/)
  })

  it('follow source order across slots', async () => {
    const [html = ''] = await slidesHtml(
      slide(
        'cols',
        '# Cols\n\n::slot{name=left}\n\n:::step\nLeft\n:::\n\n::slot{name=right}\n\n:::step\nRight\n:::',
        'layout=two-columns',
      ),
    )
    expect(html).toContain('<div class="step" data-step="1"><p>Left</p></div>')
    expect(html).toContain('<div class="step" data-step="2"><p>Right</p></div>')
  })

  it('may sit inside other blocks', async () => {
    const [html = ''] = await slidesHtml(slide('a', '# A\n\n::::info\n:::step\nLater\n:::\n::::'))
    expect(html).toMatch(/callout--info[^>]*>\s*<div class="step" data-step="1">/)
    expect(await messages(slide('a', '# A\n\n::::info\n:::step\nLater\n:::\n::::'))).toEqual([])
  })

  it('leave prose like next:step alone', async () => {
    const [html = ''] = await slidesHtml(slide('a', '# A\n\nGo to next:step now.'))
    expect(html).toContain('next:step now.')
    expect(steps(html)).toEqual([])
  })

  it('cannot be nested', async () => {
    expect(await messages(slide('a', '# A\n\n:::step\nOne :step[more]\n:::'))).toEqual([
      "decks/test/slides.md:10 error [a] Steps can't be nested: remove this step, or the step around it.",
    ])
    expect(await messages(slide('a', '# A\n\n:::steps\n- One :step[more]\n:::'))).toEqual([
      "decks/test/slides.md:10 error [a] Steps can't be nested: remove this step, or the step around it.",
    ])
  })

  it('are not allowed in speaker notes', async () => {
    expect(await messages(slide('a', '# A\n\n:::notes\nSay\n\n:::step\nLater\n:::\n:::'))).toEqual([
      "decks/test/slides.md:12 error [a] Steps don't work in speaker notes: remove this step.",
    ])
  })

  it('need exactly one list in :::steps', async () => {
    const error =
      'decks/test/slides.md:9 error [a] `:::steps` wraps one list (each item becomes a step): use `:::step` for other content.'
    expect(await messages(slide('a', '# A\n\n:::steps\nA paragraph.\n:::'))).toEqual([error])
    expect(await messages(slide('a', '# A\n\n:::steps\n- One\n\nAfter.\n:::'))).toEqual([error])
  })

  it('take no attributes', async () => {
    expect(await messages(slide('a', '# A\n\n:::step{.small}\nLater\n:::'))).toEqual([
      'decks/test/slides.md:9 error [a] Steps take no attributes: put a `:::div{.class}` inside the step instead.',
    ])
    expect(await messages(slide('a', '# A\n\nThen :step[x]{.small}.'))).toEqual([
      'decks/test/slides.md:9 error [a] Steps take no attributes: put a `:span[text]{.class}` inside the step instead.',
    ])
  })
})
