/**
 * The search bar: Ctrl+F (Cmd+F) opens it, typing searches every slide,
 * F3/Enter move between matches and Esc closes it. Matches are highlighted
 * with the CSS Custom Highlight API, so the slide markup never changes;
 * browsers without it still get the count and the navigation.
 */
import { button, element } from './chrome.ts'
import { searchKeyAction } from './keyboard.ts'
import {
  findMatches,
  firstMatchFrom,
  matchRange,
  normaliseQuery,
  type SearchMatch,
  type SlideText,
  slideText,
  stepMatch,
} from './search.ts'

/** Highlight names, styled with `::highlight()` in styles/viewer/search.css. */
const MATCHES = 'dex-search'
const CURRENT = 'dex-search-current'

export interface SearchNavigation {
  /** Index of the slide shown. */
  readonly current: () => number
  /** Shows a slide with all its steps; the search announces it itself. */
  readonly show: (index: number) => void
}

export function createSearch(
  deck: HTMLElement,
  slides: readonly HTMLElement[],
  navigation: SearchNavigation,
): void {
  const bar = element('div', 'viewer-search', { role: 'search' })
  bar.hidden = true
  const field = element('input', 'viewer-search__field', {
    type: 'search',
    'aria-label': 'Search the slides',
    placeholder: 'Search slides',
    autocomplete: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
  })
  const count = element('span', 'viewer-search__count', { 'aria-hidden': 'true' })
  const previous = button('up', 'Previous match (Shift+F3)', () => move(-1))
  const next = button('down', 'Next match (F3)', () => move(1))
  const close = button('close', 'Close search (Esc)', closeBar)
  const live = element('div', 'visually-hidden', { 'aria-live': 'polite', 'aria-atomic': 'true' })
  bar.append(field, count, previous, next, close, live)
  deck.after(bar)

  const highlights = typeof CSS !== 'undefined' && 'highlights' in CSS ? CSS.highlights : undefined
  let texts: SlideText[] | undefined
  let matches: SearchMatch[] = []
  let ranges: (Range | undefined)[] = []
  let current = -1
  let returnFocus: HTMLElement | null = null

  function openBar(): void {
    if (bar.hidden) {
      const active = document.activeElement
      returnFocus = active instanceof HTMLElement && active !== document.body ? active : null
      bar.hidden = false
      if (field.value !== '') search()
    }
    field.focus()
    field.select()
  }

  function closeBar(): void {
    bar.hidden = true
    paint()
    const focusInBar = bar.contains(document.activeElement)
    if (focusInBar && returnFocus?.isConnected) returnFocus.focus()
    else if (focusInBar) field.blur()
    returnFocus = null
  }

  function search(): void {
    // Slides are static once built, so their text is collected once.
    texts ??= slides.map(slideText)
    const all = texts
    matches = findMatches(
      all.map((text) => text.normalised),
      field.value,
    )
    ranges = matches.map((match) => {
      const text = all[match.slide]
      return text === undefined ? undefined : matchRange(text, match.start, match.end)
    })
    current = firstMatchFrom(matches, navigation.current())
    render()
  }

  function move(step: 1 | -1): void {
    if (matches.length === 0) return
    current = stepMatch(current, step, matches.length)
    render()
  }

  function render(): void {
    paint()
    previous.disabled = next.disabled = matches.length === 0
    if (normaliseQuery(field.value) === '') {
      count.textContent = ''
      live.textContent = ''
      return
    }
    const match = matches[current]
    if (match === undefined) {
      count.textContent = 'No matches'
      live.textContent = 'No matches'
      return
    }
    // Also on the current slide: the match may be in a step not revealed yet.
    navigation.show(match.slide)
    count.textContent = `${current + 1} of ${matches.length}`
    const label = slides[match.slide]?.getAttribute('aria-label') ?? ''
    live.textContent = `${count.textContent}. ${label}`
  }

  function paint(): void {
    if (highlights === undefined) return
    const shown = bar.hidden ? [] : ranges.filter((range) => range !== undefined)
    if (shown.length === 0) {
      highlights.delete(MATCHES)
      highlights.delete(CURRENT)
      return
    }
    highlights.set(MATCHES, new Highlight(...shown))
    const range = ranges[current]
    if (range === undefined) highlights.delete(CURRENT)
    else highlights.set(CURRENT, new Highlight(range))
  }

  field.addEventListener('input', search)

  // Registered before the navigation keys, which skip handled events.
  document.addEventListener('keydown', (event) => {
    if (event.isComposing) return
    const action = searchKeyAction(event, {
      open: !bar.hidden,
      inField: document.activeElement === field,
    })
    if (action === undefined) return
    event.preventDefault()
    if (action === 'open') openBar()
    else if (action === 'close') closeBar()
    else move(action === 'next' ? 1 : -1)
  })

  // `::highlight()` can't be reliably reset for print, so highlights go away while printing.
  window.addEventListener('beforeprint', () => {
    highlights?.delete(MATCHES)
    highlights?.delete(CURRENT)
  })
  window.addEventListener('afterprint', paint)
}
