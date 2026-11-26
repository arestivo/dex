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
    expect(html).toMatch(/^<!doctype html>\n<html lang="en">/)
    expect(html).toContain('<main class="deck" data-deck="test" aria-label="Test deck">')
    expect(html).toContain(
      '<section id="intro" class="slide" data-layout="default" data-number="1" aria-roledescription="slide" aria-label="Slide 1 of 2: Intro">',
    )
    expect(html).toContain('id="more"')
    expect(html).toContain('<script type="module" src="../_app/app.js"></script>')
    expect(html).toContain('<link rel="stylesheet" href="../_app/app.css">')
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
})

describe('renderErrorPage', () => {
  it('lists diagnostics, escaped', () => {
    const html = renderErrorPage(
      [{ severity: 'error', file: 'a.md', line: 1, message: 'Bad <tag>' }],
      { scripts: [], styles: [] },
    )
    expect(html).toContain('a.md:1 error Bad &lt;tag&gt;')
  })
})
