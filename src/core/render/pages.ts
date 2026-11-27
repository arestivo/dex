import type { Root } from 'hast'
import { toHtml } from 'hast-util-to-html'
import { type Diagnostic, formatDiagnostic } from '../diagnostics.ts'
import type { CompiledDeck } from '../model.ts'
import { escapeHtml, htmlDocument, type PageAssets } from './html.ts'

/**
 * Renders a deck as a single page holding every slide. Without JavaScript
 * it reads as a document; the viewer turns it into a presentation.
 */
export function renderDeckPage(deck: CompiledDeck, assets: PageAssets): string {
  const slides: Root = { type: 'root', children: deck.slides.map((slide) => slide.element) }
  const body = `<main class="deck" data-deck="${escapeHtml(deck.slug)}" aria-label="${escapeHtml(deck.meta.title)}">
${toHtml(slides)}
</main>`

  return htmlDocument({
    lang: deck.meta.lang,
    title: deck.meta.subtitle ? `${deck.meta.title}: ${deck.meta.subtitle}` : deck.meta.title,
    description: deck.meta.description ?? deck.meta.subtitle,
    assets,
    body,
    theme: deck.theme,
  })
}

export interface IndexOptions {
  readonly title: string
  /** Builds the link to a deck, relative to the index page. */
  readonly deckHref: (slug: string) => string
  /** The folder theme (`dex.yaml`, or `default`). */
  readonly theme?: string
}

/** Renders the site index listing all decks, sorted by title. */
export function renderIndexPage(
  decks: readonly CompiledDeck[],
  assets: PageAssets,
  options: IndexOptions,
): string {
  const items = [...decks]
    .sort((a, b) => a.meta.title.localeCompare(b.meta.title))
    .map((deck) => {
      const subtitle = deck.meta.subtitle
        ? `<span class="deck-list__subtitle">${escapeHtml(deck.meta.subtitle)}</span>`
        : ''
      return `    <li class="deck-list__item"><a class="deck-list__link" href="${escapeHtml(options.deckHref(deck.slug))}"><span class="deck-list__title">${escapeHtml(deck.meta.title)}</span>${subtitle}</a></li>`
    })

  const body = `<main class="site-index">
  <h1 class="site-index__title">${escapeHtml(options.title)}</h1>
  <ul class="deck-list">
${items.join('\n')}
  </ul>
</main>`

  return htmlDocument({ lang: 'en', title: options.title, assets, body, theme: options.theme })
}

/** Renders a page listing build diagnostics (used by the dev server). */
export function renderErrorPage(
  diagnostics: readonly Diagnostic[],
  assets: PageAssets,
  theme?: string,
): string {
  const lines = diagnostics.map(
    (d) =>
      `<li class="diagnostics__item diagnostics__item--${d.severity}"><code>${escapeHtml(formatDiagnostic(d))}</code></li>`,
  )
  const body = `<main class="diagnostics">
  <h1>This deck has errors</h1>
  <p>Fix them and save: the page reloads automatically.</p>
  <ul class="diagnostics__list">
${lines.join('\n')}
  </ul>
</main>`
  return htmlDocument({ lang: 'en', title: 'Deck errors', assets, body, theme })
}
