/**
 * Viewer chrome: progress bar, controls, live region and toast. Only
 * created when JavaScript runs, so the no-JS page stays clean.
 */
import { fullscreenAvailable } from './fullscreen.ts'
import { icons } from './icons.ts'

export interface ChromeHandlers {
  readonly previous: () => void
  readonly next: () => void
  readonly copyLink: () => void
  readonly toggleMode: () => void
  readonly toggleFullscreen: () => void
}

export interface Chrome {
  update(index: number, total: number): void
  announce(message: string): void
  toast(message: string): void
  setDarkPressed(pressed: boolean): void
  setFullscreen(on: boolean): void
}

const TOAST_DURATION = 1800

export function createChrome(deck: HTMLElement, handlers: ChromeHandlers): Chrome {
  const progress = element('div', 'viewer-progress', { 'aria-hidden': 'true' })
  const bar = element('div', 'viewer-progress__bar')
  progress.append(bar)

  const controls = element('nav', 'viewer-controls', { 'aria-label': 'Slide controls' })
  const previous = button('previous', 'Previous slide', handlers.previous)
  const counter = element('span', 'viewer-controls__counter')
  const next = button('next', 'Next slide', handlers.next)
  const link = button('link', 'Copy link to this slide', handlers.copyLink)
  const mode = button('mode', 'Dark mode', handlers.toggleMode)
  const fullscreen = button('fullscreen', 'Enter fullscreen', handlers.toggleFullscreen)
  // Not every browser lets a page go fullscreen (iPhone Safari): no button there.
  fullscreen.hidden = !fullscreenAvailable()
  controls.append(previous, counter, next, link, mode, fullscreen)

  const live = element('div', 'viewer-live visually-hidden', {
    'aria-live': 'polite',
    'aria-atomic': 'true',
  })
  const toast = element('div', 'viewer-toast', { role: 'status' })

  deck.after(progress, controls, live, toast)

  let toastTimer: number | undefined

  return {
    update(index, total) {
      counter.textContent = `${index + 1} / ${total}`
      previous.disabled = index === 0
      next.disabled = index === total - 1
      bar.style.setProperty('--progress', String(total > 1 ? index / (total - 1) : 1))
    },
    announce(message) {
      live.textContent = message
    },
    toast(message) {
      toast.textContent = message
      toast.toggleAttribute('data-visible', true)
      window.clearTimeout(toastTimer)
      toastTimer = window.setTimeout(() => toast.removeAttribute('data-visible'), TOAST_DURATION)
    },
    setDarkPressed(pressed) {
      mode.setAttribute('aria-pressed', String(pressed))
    },
    setFullscreen(on) {
      const label = on ? 'Exit fullscreen' : 'Enter fullscreen'
      fullscreen.setAttribute('aria-label', label)
      fullscreen.title = label
      fullscreen.innerHTML = icons[on ? 'exit-fullscreen' : 'fullscreen']
    },
  }
}

export function button(
  icon: keyof typeof icons,
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const el = element('button', 'viewer-controls__button', {
    type: 'button',
    'aria-label': label,
    title: label,
  })
  el.innerHTML = icons[icon]
  el.addEventListener('click', onClick)
  return el
}

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  attributes: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  el.className = className
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value)
  return el
}
