/**
 * The deck viewer: turns the static page of slides into a presentation.
 *
 * State lives in the URL fragment. Navigating replaces the fragment (no
 * history entry per slide); following an in-deck link uses the browser's
 * native fragment navigation (a history entry) and is picked up through
 * `hashchange`, so Back returns to the previous slide. Next and previous
 * reveal and hide the slide's steps before changing slide (see steps.ts); a
 * slide always opens with its steps hidden. Every change of slide or step is
 * shared with the deck's other windows (the presenter window, see sync.ts).
 */

import { PRESENTER_PARAM } from '../shared/constants.ts'
import { createChrome } from './chrome.ts'
import { trackIdle } from './idle.ts'
import { type Action, listenForKeys } from './keyboard.ts'
import { currentMode, onSystemModeChange, toggleMode } from './mode.ts'
import { type Preloader, startPreloading } from './preload.ts'
import { fragmentFor, resolveFragment } from './router.ts'
import { createSearch } from './search-bar.ts'
import { applySteps, back, clampSteps, forward, stepsOf } from './steps.ts'
import { createSync, type SlideSync } from './sync.ts'
import { listenForSwipes } from './touch.ts'

export function startViewer(deck: HTMLElement): void {
  const slides = [...deck.querySelectorAll<HTMLElement>(':scope > .slide')]
  if (slides.length === 0) return
  const ids = slides.map((slide) => slide.id)
  let current = -1
  /** How many of the current slide's steps are revealed. */
  let revealed = 0
  const stepCounts = slides.map((slide) => stepsOf(slide).length)
  /** Set after the first slide is shown: opening a deck doesn't move other windows. */
  let sync: SlideSync | undefined
  /** Loads diagrams in the background once the first slide is shown. */
  let preloader: Preloader | undefined

  const chrome = createChrome(deck, {
    previous: moveBack,
    next: moveForward,
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
    // Arriving at a slide, from anywhere, hides its steps.
    revealed = 0
    applySteps(slide, 0)
    chrome.update(current, slides.length)
    preloader?.prioritise(current)
    if (announce) chrome.announce(slide.getAttribute('aria-label') ?? '')
    sync?.publish(slide.id, 0)
  }

  function reveal(count: number): void {
    const slide = slides[current] as HTMLElement
    revealed = clampSteps(count, stepCounts[current] ?? 0)
    applySteps(slide, revealed)
    sync?.publish(slide.id, revealed)
  }

  function moveForward(): void {
    const move = forward(revealed, stepCounts[current] ?? 0)
    if (move === 'next-slide') go(current + 1)
    else if (move !== 'previous-slide') reveal(move.reveal)
  }

  function moveBack(): void {
    const move = back(revealed)
    if (move === 'previous-slide') go(current - 1)
    else if (move !== 'next-slide') reveal(move.reveal)
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
    next: moveForward,
    previous: moveBack,
    first: () => go(0),
    last: () => go(slides.length - 1),
    'toggle-mode': switchMode,
    presenter: openPresenter,
  }

  deck.dataset.mode = 'present'
  syncWithUrl(false)
  preloader = startPreloading(slides, current)
  chrome.setDarkPressed(currentMode() === 'dark')
  sync = createSync(deck.dataset.deck ?? '', (id, step) => {
    const index = ids.indexOf(id)
    if (index === -1) return
    go(index)
    reveal(step)
  })

  window.addEventListener('hashchange', () => syncWithUrl(true))
  // Before the navigation keys: they skip the keys the search handles.
  // The match may be in a hidden step: the search shows the whole slide.
  createSearch(deck, slides, {
    current: () => current,
    show: (index) => {
      go(index, false)
      reveal(stepCounts[current] ?? 0)
    },
  })
  listenForKeys((action) => actions[action]())
  listenForSwipes(deck, (direction) => (direction === 'left' ? actions.next() : actions.previous()))
  onSystemModeChange(() => chrome.setDarkPressed(currentMode() === 'dark'))
  trackIdle(deck)
}
