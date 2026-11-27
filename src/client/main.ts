/** Browser entry point: styles for every page, and the viewer on deck pages. */
import '../../styles/index.css'
import 'virtual:themes.css'
import 'virtual:layouts.css'
import { LOADING_ATTRIBUTE } from '../shared/constants.ts'
import { startViewer } from './viewer.ts'

const deck = document.querySelector<HTMLElement>('main.deck')
try {
  if (deck !== null) startViewer(deck)
} finally {
  // The styles are in (imported above) and the viewer has chosen the slide:
  // reveal the page (hidden from the <head>, see src/core/render/html.ts).
  document.documentElement.removeAttribute(LOADING_ATTRIBUTE)
}
