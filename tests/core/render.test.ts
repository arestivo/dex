import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderDeckPage, renderErrorPage, renderIndexPage } from '../../src/core/render/pages.ts'
import { compileWorkspace } from '../../src/core/workspace.ts'
import { compiledDeck, deck, FIXTURES, slide } from '../helpers.ts'

const assets = { scripts: ['../_app/app.js'], styles: ['../_app/app.css'] }

describe('renderDeckPage', () => {
  it('renders every slide as a labelled section inside the deck', async () => {
    const result = await compiledDeck(deck(slide('intro', '# Intro'), slide('more', '# More')))
    const html = renderDeckPage(result, assets)
    expect(html).toMatch(/^<!doctype html>\n<html lang="en" data-theme="default">/)
    expect(html).toContain(
      '<main class="deck" data-deck="test" data-notes="omitted" aria-label="Test deck">',
    )
    expect(html).toContain(
      '<section id="intro" class="slide" data-layout="default" data-number="1" aria-roledescription="slide" aria-label="Slide 1 of 2: Intro">',
    )
    expect(html).toContain('id="more"')
    expect(html).toContain('<script type="module" src="../_app/app.js"></script>')
    expect(html).toContain('<link rel="stylesheet" href="../_app/app.css">')
  })

  it('leaves speaker notes out unless asked, and says so', async () => {
    const result = await compiledDeck(
      deck(slide('one', '# One\n\n:::notes\nSecret **plan**.\n:::'), slide('two', '# Two')),
    )
    const omitted = renderDeckPage(result, assets)
    expect(omitted).not.toContain('Secret')
    expect(omitted).not.toContain('slide__notes')
    expect(omitted).toContain('data-notes="omitted"')

    const included = renderDeckPage(result, assets, { includeNotes: true })
    expect(included).toContain('data-notes="included"')
    expect(included).toContain(
      '<template class="slide__notes"><p>Secret <strong>plan</strong>.</p></template></section>',
    )
    expect(included.match(/<template/g)).toHaveLength(1)
  })

  it('sets the deck theme on the root element', async () => {
    const result = await compiledDeck(deck(slide('intro', '# Intro')))
    expect(renderDeckPage(result, assets)).toMatch(
      /^<!doctype html>\n<html lang="en" data-theme="default">/,
    )
    const themed = await compileWorkspace({ root: join(FIXTURES, 'themes') })
    const demo = themed.decks[0]
    if (demo === undefined) throw new Error('no deck')
    expect(renderDeckPage({ ...demo, theme: 'ocean' }, assets)).toContain(
      '<html lang="en" data-theme="ocean">',
    )
  })

  it('hides the page until its script runs, with a loading indicator and a fallback', async () => {
    const html = renderDeckPage(await compiledDeck(deck(slide('intro', '# Intro'))), assets)
    expect(html).toContain('setAttribute("data-loading",\'\')')
    expect(html).toMatch(/setTimeout\(function\(\)\{r\.removeAttribute\("data-loading"\)\},5000\)/)
    expect(html).toContain(':root[data-loading] body{visibility:hidden}')
    expect(html).toContain(':root[data-loading]::after{')
    expect(html).toContain('@media (prefers-reduced-motion:reduce)')
    // Every loading rule is scoped to the loading state (the style is unlayered).
    const style = /<style>(.*)<\/style>/.exec(html)?.[1] ?? ''
    const selectors = style
      .replace(/@keyframes[^{]+\{[^}]*\{[^}]*\}\}/g, '')
      .replace(/@media[^{]+\{/g, '')
      .split(/\{[^}]*\}\}?/)
      .filter((selector) => selector !== '')
    expect(selectors.length).toBeGreaterThan(0)
    for (const selector of selectors) expect(selector).toMatch(/^:root\[data-loading\]/)
  })

  it('does not hide pages without a script', () => {
    const html = renderIndexPage(
      [],
      { scripts: [], styles: [] },
      { title: 'Slides', deckHref: (slug) => `${slug}/` },
    )
    expect(html).not.toContain('data-loading')
  })

  it('uses only relative URLs for its own files', async () => {
    const result = await compiledDeck(slide('a', '![](assets/x.svg)'), {
      assets: ['assets/x.svg'],
    })
    const html = renderDeckPage(result, assets)
    expect(html).not.toMatch(/(src|href)="\/(?!\/)/)
  })
})

describe('renderIndexPage', () => {
  it('lists decks sorted by title, linking relatively', async () => {
    const { decks } = await compileWorkspace({ root: join(FIXTURES, 'clean') })
    const other = await compiledDeck(slide('a', 'x'))
    const html = renderIndexPage(
      [other, ...decks],
      { scripts: [], styles: [] },
      {
        title: 'Slides',
        deckHref: (slug) => `${slug}/`,
      },
    )
    expect(html.indexOf('href="demo/"')).toBeLessThan(html.indexOf('href="test/"'))
    expect(html).toContain('<span class="deck-list__title">Demo</span>')
  })

  it('uses the folder theme', () => {
    const html = renderIndexPage(
      [],
      { scripts: [], styles: [] },
      {
        title: 'Slides',
        deckHref: (slug) => slug,
        theme: 'ocean',
      },
    )
    expect(html).toContain('<html lang="en" data-theme="ocean">')
  })
})

describe('renderErrorPage', () => {
  it('lists diagnostics, escaped', () => {
    const html = renderErrorPage(
      [{ severity: 'error', file: 'a.md', line: 1, message: 'Bad <tag>' }],
      { scripts: [], styles: [] },
    )
    expect(html).toContain('a.md:1 error Bad &lt;tag&gt;')
    expect(renderErrorPage([], { scripts: [], styles: [] }, 'ocean')).toContain(
      'data-theme="ocean"',
    )
  })
})
