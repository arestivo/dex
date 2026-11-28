/**
 * The deck viewer: turns the static page of slides into a presentation.
 *
 * State lives in the URL fragment. Navigating replaces the fragment (no
 * history entry per slide); following an in-deck link uses the browser's
 * native fragment navigation (a history entry) and is picked up through
 * `hashchange`, so Back returns to the previous slide. Every slide change is
 * shared with the deck's other windows (the presenter window, see sync.ts).
 */

import { PRESENTER_PARAM } from '../shared/constants.ts'
import { createChrome } from './chrome.ts'
import { trackIdle } from './idle.ts'
import { type Action, listenForKeys } from './keyboard.ts'
import { currentMode, onSystemModeChange, toggleMode } from './mode.ts'
import { fragmentFor, resolveFragment } from './router.ts'
import { createSearch } from './search-bar.ts'
import { createSync, type SlideSync } from './sync.ts'
import { listenForSwipes } from './touch.ts'

export function startViewer(deck: HTMLElement): void {
  const slides = [...deck.querySelectorAll<HTMLElement>(':scope > .slide')]
  if (slides.length === 0) return
  const ids = slides.map((slide) => slide.id)
  let current = -1
  /** Set after the first slide is shown: opening a deck doesn't move other windows. */
  let sync: SlideSync | undefined

  const chrome = createChrome(deck, {
    previous: () => go(current - 1),
    next: () => go(current + 1),
    copyLink,
    toggleMode: switchMode,
  })

  function show(index: number, announce = true): void {
    const target = Math.min(Math.max(index, 0), slides.length - 1)
    if (target === current) return
    slides[current]?.removeAttribute('data-current')
    const slide = slides[target] as HTMLElement
    slide.setAttribute('data-current', '')
    current = target
    chrome.update(current, slides.length)
    if (announce) chrome.announce(slide.getAttribute('aria-label') ?? '')
    sync?.publish(slide.id)
  }

  function go(index: number, announce = true): void {
    show(index, announce)
    history.replaceState(history.state, '', fragmentFor(ids[current] as string))
  }

  function syncWithUrl(announce: boolean): void {
    const { index, canonical } = resolveFragment(location.hash, ids)
    show(index, announce)
    if (!canonical) history.replaceState(history.state, '', fragmentFor(ids[index] as string))
  }

  function switchMode(): void {
    toggleMode()
    chrome.setDarkPressed(currentMode() === 'dark')
  }

  /** Opens the presenter window, or brings it forward if it is already open. */
  function openPresenter(): void {
    const url = new URL(location.href)
    url.searchParams.set(PRESENTER_PARAM, '')
    url.hash = fragmentFor(ids[current] as string)
    const opened = window.open(url.href, `dex-presenter-${deck.dataset.deck ?? ''}`)
    if (opened === null) chrome.toast('Allow pop-ups for this site to open the presenter window')
    else opened.focus()
  }

  async function copyLink(): Promise<void> {
    const url = new URL(fragmentFor(ids[current] as string), location.href).href
    try {
      await navigator.clipboard.writeText(url)
      chrome.toast('Link copied')
    } catch {
      chrome.toast(url)
    }
  }

  const actions: Record<Action, () => void> = {
    next: () => go(current + 1),
    previous: () => go(current - 1),
    first: () => go(0),
    last: () => go(slides.length - 1),
    'toggle-mode': switchMode,
    presenter: openPresenter,
  }

  deck.dataset.mode = 'present'
  syncWithUrl(false)
  chrome.setDarkPressed(currentMode() === 'dark')
  sync = createSync(deck.dataset.deck ?? '', (id) => {
    const index = ids.indexOf(id)
    if (index !== -1) go(index)
  })

  window.addEventListener('hashchange', () => syncWithUrl(true))
  // Before the navigation keys: they skip the keys the search handles.
  createSearch(deck, slides, { current: () => current, show: (index) => go(index, false) })
  listenForKeys((action) => actions[action]())
  listenForSwipes(deck, (direction) => (direction === 'left' ? actions.next() : actions.previous()))
  onSystemModeChange(() => chrome.setDarkPressed(currentMode() === 'dark'))
  trackIdle(deck)
}
