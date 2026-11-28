/**
 * The blank screen: the deck window filled with the slides' background
 * colour, so it follows the theme and the light/dark mode. Navigation keeps
 * working underneath; bringing the screen back shows the current slide. The
 * state is shared with the presenter window through sync.ts.
 */
import { element } from './chrome.ts'

export const BLANK_ATTRIBUTE = 'data-blank'

export interface BlankScreen {
  /** Shows or hides the blank layer; nothing else changes. */
  set(blank: boolean): void
}

export function createBlankScreen(): BlankScreen {
  const layer = element('div', 'viewer-blank', { 'aria-hidden': 'true' })
  document.body.append(layer)
  return {
    set(blank) {
      document.documentElement.toggleAttribute(BLANK_ATTRIBUTE, blank)
    },
  }
}
