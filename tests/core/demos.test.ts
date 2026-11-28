import { describe, expect, it } from 'vitest'
import { messages, slide, slidesHtml } from '../helpers.ts'

const demo = (css: string | undefined, html: string) =>
  [
    ':::demo',
    ...(css === undefined ? [] : ['```css', css, '```']),
    '```html',
    html,
    '```',
    ':::',
  ].join('\n')

describe('live demos', () => {
  it('show the code, then the result built from it in a declarative shadow root', async () => {
    const [html = ''] = await slidesHtml(
      slide('a', `# A\n\n${demo('p { color: green; }', '<p>Fox</p>')}`),
    )
    expect(html).toMatch(/<div class="demo"><pre[\s\S]*<\/pre><pre[\s\S]*<\/pre><\/div>/)
    expect(html).toContain(
      '<div class="demo-result"><template shadowrootmode="open" shadowrootclonable><style>:host{display:block}</style><style>p { color: green; }</style><p>Fox</p></template></div>',
    )
    // The result follows the code.
    expect(html.indexOf('class="demo"')).toBeLessThan(html.indexOf('class="demo-result"'))
  })

  it('may have no CSS', async () => {
    const [html = ''] = await slidesHtml(slide('a', `# A\n\n${demo(undefined, '<b>Bold</b>')}`))
    expect(html).toContain('<style>:host{display:block}</style><b>Bold</b></template>')
  })

  it('place the result at ::demo-result, in another slot or inside a step', async () => {
    const [html = ''] = await slidesHtml(
      slide(
        'cols',
        `# Cols\n\n::slot{name=left}\n\n${demo('p { color: red; }', '<p>Fox</p>')}\n\n::slot{name=right}\n\n:::step\n::demo-result\n:::`,
        'layout=two-columns',
      ),
    )
    const [left = '', right = ''] = html.split('pair__column').slice(1)
    expect(left).toContain('class="demo"')
    expect(left).not.toContain('demo-result')
    expect(right).toMatch(/<div class="step" data-step="1"><div class="demo-result"><template/)
  })

  it('are checked: html block, nothing else, no attributes', async () => {
    expect(
      await messages(
        slide('a', `# A\n\n${[':::demo', '```css', 'p {}', '```', ':::'].join('\n')}`),
      ),
    ).toEqual([
      'decks/test/slides.md:9 error [a] A `:::demo` needs an ```html block: the HTML whose result it shows.',
    ])
    expect(
      await messages(slide('a', `# A\n\n:::demo\nSome text.\n\n\`\`\`html\n<p>x</p>\n\`\`\`\n:::`)),
    ).toEqual([
      'decks/test/slides.md:10 error [a] A `:::demo` holds only an ```html block and an optional ```css block: move this out of the demo.',
    ])
    expect(
      await messages(
        slide(
          'a',
          `# A\n\n${demo(undefined, '<p>x</p>').replace(':::\n```html', ':::\n```html')}\n`.replace(
            '```html\n<p>x</p>\n```',
            '```html\n<p>x</p>\n```\n```html\n<p>y</p>\n```',
          ),
        ),
      ),
    ).toEqual([
      'decks/test/slides.md:13 error [a] A `:::demo` has one ```html block: merge this one into the first.',
    ])
    expect(
      await messages(
        slide('a', `# A\n\n${demo(undefined, '<p>x</p>').replace(':::demo', ':::demo{.x}')}`),
      ),
    ).toEqual([
      'decks/test/slides.md:9 error [a] A `:::demo` takes no attributes: style its result with the demo’s own ```css block.',
    ])
  })

  it('report misplaced results, nested demos and demos in notes', async () => {
    expect(await messages(slide('a', '# A\n\n::demo-result'))).toEqual([
      "decks/test/slides.md:9 error [a] `::demo-result` places the result of the slide's `:::demo`, and this slide has none: add a demo, or remove this line.",
    ])
    const two = `# A\n\n${demo(undefined, '<p>1</p>')}\n\n${demo(undefined, '<p>2</p>')}\n\n::demo-result`
    expect(await messages(slide('a', two))).toEqual([
      'decks/test/slides.md:21 error [a] `::demo-result` only works on a slide with one `:::demo`: remove it to show each result after its code, or split the slide.',
    ])
    const twice = `# A\n\n${demo(undefined, '<p>1</p>')}\n\n::demo-result\n\n::demo-result`
    expect(await messages(slide('a', twice))).toEqual([
      'decks/test/slides.md:17 error [a] A slide has at most one `::demo-result`: remove this one.',
    ])
    const nested = `# A\n\n::::demo\n${demo(undefined, '<p>1</p>')}\n::::`
    expect(await messages(slide('a', nested))).toEqual([
      "decks/test/slides.md:10 error [a] Demos can't be nested: move this `:::demo` out of the one around it.",
    ])
    expect(
      await messages(slide('a', `# A\n\n::::notes\n${demo(undefined, '<p>1</p>')}\n::::`)),
    ).toEqual([
      "decks/test/slides.md:10 error [a] Demos don't work in speaker notes: move this out of the `:::notes` block.",
    ])
  })
})
