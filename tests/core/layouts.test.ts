import { describe, expect, it } from 'vitest'
import { DiagnosticBag } from '../../src/core/diagnostics.ts'
import { scopeLayoutCss } from '../../src/core/layouts/css.ts'
import { createLayout } from '../../src/core/layouts/load.ts'
import type { Layout } from '../../src/core/model.ts'
import { builtInLayouts, compiledDeck, deck, messages, slide, slidesHtml } from '../helpers.ts'

function layouts(templates: Record<string, string>): Map<string, Layout> {
  const bag = new DiagnosticBag()
  const map = new Map<string, Layout>()
  for (const [name, html] of Object.entries({
    default: '<div class="body"><slot></slot></div>',
    ...templates,
  })) {
    map.set(name, createLayout(name, `layouts/${name}/template.html`, html, '', bag))
  }
  if (bag.items.length > 0) throw new Error(bag.items.map((d) => d.message).join('\n'))
  return map
}

describe('built-in layouts', () => {
  it('ships default, title, section, center and two-columns', () => {
    expect([...builtInLayouts.keys()].sort()).toEqual([
      'center',
      'default',
      'section',
      'title',
      'two-columns',
    ])
  })
})

describe('template slots', () => {
  it('fills the default slot', async () => {
    const [html] = await slidesHtml(slide('a', 'Hello'), { layouts: layouts({}) })
    expect(html).toContain('<div class="body"><p>Hello</p></div>')
  })

  it('renders fallback content for unfilled slots', async () => {
    const custom = layouts({
      foot: '<slot></slot><footer><slot name="footer">© Example</slot></footer>',
    })
    const [html] = await slidesHtml(slide('a', 'x', 'layout=foot'), { layouts: custom })
    expect(html).toContain('<footer>© Example</footer>')
  })

  it('assigns content to named slots', async () => {
    const [html] = await slidesHtml(
      slide(
        'a',
        '# Title\n\nIntro\n\n::slot{name=left}\n\n- list\n\n::slot{name=right}\n\nRight',
        'layout=two-columns',
      ),
    )
    expect(html).toMatch(/<div class="pair__column"><ul>\s*<li>list<\/li>\s*<\/ul><\/div>/)
    expect(html).toContain('<div class="pair__column"><p>Right</p></div>')
    expect(html).toContain('<header class="slide__header"><h1>Title</h1></header>')
  })

  it('reports slots the layout does not declare', async () => {
    expect((await messages(slide('a', '::slot{name=left}\n\nx')))[0]).toBe(
      'decks/test/slides.md:7 error [a] Layout "default" has no slot "left". Its slots: title, (default).',
    )
  })

  it('reports content for a layout without a default slot', async () => {
    const custom = layouts({ only: '<slot name="side"></slot>' })
    expect((await messages(slide('a', 'stray', 'layout=only'), { layouts: custom }))[0]).toMatch(
      /has no default slot/,
    )
  })

  it('reports slots filled twice', async () => {
    const result = await messages(
      slide('a', '::slot{name=left}\n\nx\n\n::slot{name=left}\n\ny', 'layout=two-columns'),
    )
    expect(result[0]).toMatch(/filled twice/)
  })

  it('reports nested slot directives', async () => {
    expect(
      (await messages(slide('a', ':::info\n::slot{name=left}\n:::', 'layout=two-columns')))[0],
    ).toMatch(/must be a top-level line/)
  })
})

describe('automatic title slot', () => {
  it('moves the leading heading into the title slot', async () => {
    const [html] = await slidesHtml(slide('a', '# Headers\n\nBody'))
    expect(html).toContain('<header class="slide__header"><h1>Headers</h1></header>')
    expect(html).toContain('<div class="slide__body"><p>Body</p></div>')
  })

  it('leaves the heading in place when the layout has no title slot', async () => {
    const [html] = await slidesHtml(slide('a', '# Headers'), { layouts: layouts({}) })
    expect(html).toContain('<div class="body"><h1>Headers</h1></div>')
  })

  it('does not move a heading that is not the first block', async () => {
    const [html] = await slidesHtml(slide('a', 'Intro\n\n# Later'))
    expect(html).toContain('<header class="slide__header"></header>')
  })
})

describe('template variables', () => {
  it('interpolates deck and slide values, escaped', async () => {
    const custom = layouts({
      vars: '<p data-id="{{slide.id}}">{{deck.title}} · {{deck.author.name}} · {{slide.number}}/{{slide.total}}</p>',
    })
    const source = `---\ntitle: A <b> & B\nauthor: Ana Silva\n---\n\n${slide('intro', '', 'layout=vars')}`
    const [html] = await slidesHtml(source, { layouts: custom, frontMatter: false })
    expect(html).toContain('<p data-id="intro">A &#x3C;b> &#x26; B · Ana Silva · 1/1</p>')
  })

  it('adds the slide number after the layout content, hidden from assistive technology', async () => {
    const source = deck(
      slide('one', '# One'),
      slide('two', '# Two', 'layout=section'),
      slide('three', 'Text'),
    )
    const html = await slidesHtml(source)
    const result = await compiledDeck(source)
    expect(html[1]).toMatch(
      /<\/div>\s*<div class="slide__number" aria-hidden="true">2 \/ 3<\/div><\/section>$/,
    )
    for (const [index, slideHtml] of html.entries()) {
      expect(slideHtml.match(/class="slide__number"/g)).toHaveLength(1)
      expect(slideHtml).toContain(`>${index + 1} / 3</div>`)
    }
    expect(result.slides[0]?.element.properties.ariaLabel).toBe('Slide 1 of 3: One')
  })

  it('does not interpolate slide content', async () => {
    const [html] = await slidesHtml(slide('a', 'Vue uses `{{deck.title}}`'))
    expect(html).toContain('<code>{{deck.title}}</code>')
  })

  it('reports unknown variables at load time', () => {
    const bag = new DiagnosticBag()
    createLayout('bad', 'layouts/bad/template.html', '<p>{{deck.color}}</p>', '', bag)
    expect(bag.items[0]?.message).toMatch(/Unknown template variable "\{\{deck.color\}\}"/)
  })
})

describe('scoped layout styles', () => {
  it('wraps layout CSS in the layouts layer and a scope for the layout', () => {
    expect(scopeLayoutCss('section', ':scope { color: red }')).toBe(
      '@layer layouts {\n  @scope (.slide[data-layout="section"]) {\n    :scope { color: red }\n  }\n}\n',
    )
  })

  it('scopes a deck layout to its deck', () => {
    expect(scopeLayoutCss('example', ':scope { color: red }', 'http')).toBe(
      '@layer layouts {\n  @scope (.deck[data-deck="http"] .slide[data-layout="example"]) {\n    :scope { color: red }\n  }\n}\n',
    )
    const layout = createLayout(
      'example',
      'decks/http/layouts/example/template.html',
      '<slot></slot>',
      'h1 { color: red }',
      new DiagnosticBag(),
      { origin: 'deck', deck: 'http' },
    )
    expect(layout).toMatchObject({ origin: 'deck', deck: 'http' })
    expect(layout.css).toContain('@scope (.deck[data-deck="http"] .slide[data-layout="example"])')
  })

  it('emits nothing for an empty stylesheet', () => {
    expect(scopeLayoutCss('x', '  \n')).toBe('')
  })

  it('rejects @import and @layer', () => {
    const bag = new DiagnosticBag()
    createLayout(
      'x',
      'layouts/x/template.html',
      '<slot></slot>',
      '@import "a.css";\n@layer foo {}',
      bag,
    )
    expect(bag.items.map((d) => [d.file, d.message])).toEqual([
      ['layouts/x/style.css', '@import is not allowed in layout styles'],
      ['layouts/x/style.css', '@layer is added automatically; remove it'],
    ])
  })
})
