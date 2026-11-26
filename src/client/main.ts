/** Browser entry point: styles for every page, and the viewer on deck pages. */
import '../../styles/index.css'
import 'virtual:layouts.css'
import { startViewer } from './viewer.ts'

const deck = document.querySelector<HTMLElement>('main.deck')
if (deck !== null) startViewer(deck)
