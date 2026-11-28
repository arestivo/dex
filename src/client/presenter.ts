/**
 * The presenter window: the same deck page opened with `?presenter`. It hides
 * the deck and shows the current slide, the next one, the speaker notes, the
 * position, a timer and the clock. Slides are cloned into two stages that are
 * `.deck` elements themselves, so slide sizing and layout CSS apply unchanged.
 * It stays on the same slide as the deck window through sync.ts.
 */
import { button, element } from './chrome.ts'
import { type Action, listenForKeys } from './keyboard.ts'
import { toggleMode } from './mode.ts'
import { fragmentFor, resolveFragment } from './router.ts'
import { createSync, type SlideSync } from './sync.ts'
import {
  elapsed,
  formatElapsed,
  IDLE_TIMER,
  reset,
  running,
  startOnce,
  type TimerState,
  toggle,
} from './timer.ts'

const TICK = 250

export function startPresenter(deck: HTMLElement): void {
  const slides = [...deck.querySelectorAll<HTMLElement>(':scope > .slide')]
  if (slides.length === 0) return
  const ids = slides.map((slide) => slide.id)
  const slug = deck.dataset.deck ?? ''
  const notesPublished = deck.dataset.notes !== 'omitted'
  let current = -1
  let sync: SlideSync | undefined
  let timer: TimerState = IDLE_TIMER

  document.documentElement.setAttribute('data-presenter', '')
  document.title = `Presenter: ${document.title}`

  const stage = (label: string): HTMLElement => {
    const el = element('div', 'deck presenter__stage', { 'aria-label': label })
    el.dataset.deck = slug
    el.dataset.mode = 'present'
    return el
  }
  const currentStage = stage('Current slide')
  const nextStage = stage('Next slide')
  nextStage.setAttribute('aria-hidden', 'true')
  const notes = element('section', 'presenter__notes', { 'aria-label': 'Speaker notes' })
  const position = element('span', 'presenter__position', { 'aria-live': 'polite' })
  const time = element('span', 'presenter__elapsed', {
    role: 'timer',
    'aria-label': 'Elapsed time',
  })
  const pause = element('button', 'presenter__button', { type: 'button' })
  pause.addEventListener('click', () => {
    timer = toggle(timer, performance.now())
    renderTimer()
  })
  const restart = element('button', 'presenter__button', { type: 'button' })
  restart.textContent = 'Reset'
  restart.addEventListener('click', () => {
    timer = reset(timer, performance.now())
    renderTimer()
  })
  const clock = element('span', 'presenter__clock', { 'aria-label': 'Current time' })

  const next = element('section', 'presenter__next')
  const nextLabel = element('h2', 'presenter__label')
  nextLabel.textContent = 'Next'
  next.append(nextLabel, nextStage)
  const side = element('div', 'presenter__side')
  side.append(next, notes)
  const bar = element('footer', 'presenter__bar')
  const timerBox = element('span', 'presenter__timer')
  timerBox.append(time, pause, restart)
  bar.append(
    button('previous', 'Previous slide', () => go(current - 1)),
    position,
    button('next', 'Next slide', () => go(current + 1)),
    timerBox,
    clock,
  )
  const view = element('div', 'presenter')
  view.append(currentStage, side, bar)
  deck.after(view)

  function copy(slide: HTMLElement): HTMLElement {
    const clone = slide.cloneNode(true) as HTMLElement
    // Ids stay unique in the page: the original deck keeps them for deep links.
    clone.removeAttribute('id')
    clone.setAttribute('data-current', '')
    clone.querySelector(':scope > template.slide__notes')?.remove()
    return clone
  }

  function show(index: number): void {
    const target = Math.min(Math.max(index, 0), slides.length - 1)
    if (target === current) return
    const first = current === -1
    current = target
    const slide = slides[target] as HTMLElement
    currentStage.replaceChildren(copy(slide))
    const following = slides[target + 1]
    if (following === undefined) {
      const end = element('p', 'presenter__end')
      end.textContent = 'End of the deck'
      nextStage.replaceChildren(end)
    } else {
      nextStage.replaceChildren(copy(following))
    }
    renderNotes(slide)
    position.textContent = `${target + 1} / ${slides.length}`
    // The timer starts with the talk: the first slide change, not the opening.
    if (!first) {
      timer = startOnce(timer, performance.now())
      renderTimer()
    }
    sync?.publish(slide.id)
  }

  function renderNotes(slide: HTMLElement): void {
    const template = slide.querySelector<HTMLTemplateElement>(':scope > template.slide__notes')
    if (template !== null) {
      notes.replaceChildren(template.content.cloneNode(true))
      notes.removeAttribute('data-empty')
      return
    }
    const message = element('p', 'presenter__message')
    message.textContent = notesPublished
      ? 'No notes for this slide.'
      : "Speaker notes aren't published for this deck."
    notes.replaceChildren(message)
    notes.setAttribute('data-empty', '')
  }

  function renderTimer(): void {
    time.textContent = formatElapsed(elapsed(timer, performance.now()))
    pause.textContent = running(timer) ? 'Pause' : timer.started ? 'Resume' : 'Start'
  }

  function renderClock(): void {
    clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function go(index: number): void {
    show(index)
    history.replaceState(history.state, '', fragmentFor(ids[current] as string))
  }

  function syncWithUrl(): void {
    const { index, canonical } = resolveFragment(location.hash, ids)
    show(index)
    if (!canonical) history.replaceState(history.state, '', fragmentFor(ids[index] as string))
  }

  const actions: Record<Action, () => void> = {
    next: () => go(current + 1),
    previous: () => go(current - 1),
    first: () => go(0),
    last: () => go(slides.length - 1),
    'toggle-mode': toggleMode,
    // Already the presenter window.
    presenter: () => {},
  }

  syncWithUrl()
  renderTimer()
  renderClock()
  sync = createSync(slug, (id) => {
    const index = ids.indexOf(id)
    if (index !== -1) go(index)
  })
  window.addEventListener('hashchange', syncWithUrl)
  listenForKeys((action) => actions[action]())
  window.setInterval(() => {
    renderTimer()
    renderClock()
  }, TICK)
}
