import { describe, expect, it } from 'vitest'
import { compile, deck, messages, slide, slidesHtml } from '../helpers.ts'

describe('markdown content', () => {
  it('renders GFM tables and inline HTML', async () => {
    const [html] = await slidesHtml(
      slide('a', '| A | B |\n|---|---|\n| 1 | 2 |\n\nSome <small>note</small>'),
    )
    expect(html).toContain('<table>')
    expect(html).toContain('<small>note</small>')
  })

  it('highlights known languages with dual-theme variables', async () => {
    const [html] = await slidesHtml(slide('a', '```php\n<?php echo 1;\n```'))
    expect(html).toContain('class="shiki')
    expect(html).toContain('--shiki-light:')
    expect(html).toContain('--shiki-dark:')
    expect(html).toContain('data-language="php"')
  })

  it('renders unknown languages as plain code with a warning', async () => {
    const { deck: result, diagnostics } = await compile(slide('a', '```foobar\nx\n```'))
    expect(result).toBeDefined()
    expect(diagnostics.items.map((d) => d.message)).toEqual([
      'Unknown code language "foobar": rendered as plain text.',
    ])
  })

  it('keeps colons in prose (bare text directives are restored)', async () => {
    const [html] = await slidesHtml(slide('a', 'scheme://domain:port/path at 10:30'))
    expect(html).toContain('scheme://domain:port/path at 10:30')
  })
})

describe('directives', () => {
  it('renders callouts with a tone', async () => {
    const [html] = await slidesHtml(slide('a', ':::warning\nCareful\n:::'))
    expect(html).toContain('<div class="callout callout--warning" role="note"><p>Careful</p></div>')
  })

  it('renders a callout label as its title', async () => {
    const [html] = await slidesHtml(slide('a', ':::info[Note]\nText\n:::'))
    expect(html).toContain('<p class="callout__title">Note</p>')
  })

  it('wraps blocks with :::div and inline text with :span', async () => {
    const [html] = await slidesHtml(
      slide('a', ':::div{.smaller .center}\nx\n:::\n\nA :span[GET]{.badge} request'),
    )
    expect(html).toContain('<div class="smaller center"><p>x</p></div>')
    expect(html).toContain('<span class="badge">GET</span>')
  })

  it('requires a class on wrappers and rejects other attributes', async () => {
    expect((await messages(slide('a', ':::div\nx\n:::')))[0]).toMatch(/needs at least one class/)
    expect((await messages(slide('a', ':::div{.a style=x}\nx\n:::')))[0]).toMatch(
      /Unknown attribute "style"/,
    )
  })

  it('lists section slides in ::toc, skipping the slide that holds it', async () => {
    const html = await slidesHtml(
      deck(
        slide('index', '# Index\n\n::toc', 'layout=section'),
        slide('intro', '# Introduction', 'layout=section'),
        slide('body', '# Body'),
        slide('headers', '# Headers', 'layout=section'),
      ),
    )
    expect(html[0]).toContain(
      '<nav class="toc" aria-label="Table of contents"><ol><li><a href="#intro">Introduction</a></li><li><a href="#headers">Headers</a></li></ol></nav>',
    )
  })

  it('reports unknown directives with the line', async () => {
    expect((await messages(slide('a', 'text\n\n:::infoo\nx\n:::')))[0]).toMatch(
      /^decks\/test\/slides.md:9 error \[a\] Unknown directive ":::infoo"/,
    )
  })

  it('reports unknown labelled text directives', async () => {
    expect((await messages(slide('a', 'A :badge[x] here')))[0]).toMatch(
      /Unknown directive ":badge"/,
    )
  })
})

describe('references', () => {
  it('collects existing assets', async () => {
    const { deck: result } = await compile(
      slide('a', '![](assets/a.svg)\n\n<img src="assets/b.png">'),
      {
        assets: ['assets/a.svg', 'assets/b.png'],
      },
    )
    expect([...(result?.assets ?? [])].sort()).toEqual(['assets/a.svg', 'assets/b.png'])
  })

  it('reports missing assets with slide id and path', async () => {
    expect(await messages(slide('a', '![](assets/missing.png)'))).toEqual([
      'decks/test/slides.md:7 error [a] Missing file "assets/missing.png" (referenced as "assets/missing.png").',
    ])
  })

  it('rejects paths outside the deck folder', async () => {
    expect((await messages(slide('a', '![](../other/x.png)')))[0]).toMatch(
      /points outside the deck folder/,
    )
  })

  it('warns about root-relative URLs', async () => {
    const { diagnostics } = await compile(slide('a', '[x](/abs/path)'))
    expect(diagnostics.items[0]).toMatchObject({ severity: 'warning' })
  })

  it('ignores external URLs', async () => {
    expect(
      await messages(
        slide('a', '[x](https://example.com) [m](mailto:a@b.c) ![](data:image/png;base64,AA)'),
      ),
    ).toEqual([])
  })

  it('checks internal slide links', async () => {
    expect(await messages(deck(slide('a', '[b](#b)'), slide('b', 'x')))).toEqual([])
    expect((await messages(slide('a', '[nope](#nope)')))[0]).toMatch(
      /Link to "#nope" does not match/,
    )
  })
})
