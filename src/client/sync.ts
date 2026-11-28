/**
 * Keeps a deck's windows (the deck and its presenter window) on the same
 * slide and step, with the same blank screen, through a BroadcastChannel: no
 * server, so it works on any static host. A window posts every change and
 * follows the ones it receives; it never re-posts a change it received, so
 * there are no echo loops.
 */
import { SYNC_CHANNEL_PREFIX } from '../shared/constants.ts'

export interface SyncState {
  readonly slide: string
  /** How many of the slide's steps are revealed. */
  readonly step: number
  /** Whether the audience's screen is blank. */
  readonly blank: boolean
}

export interface SlideSync {
  /** Tells the other windows what this one now shows. */
  publish(state: SyncState): void
}

export function createSync(slug: string, follow: (state: SyncState) => void): SlideSync {
  if (typeof BroadcastChannel === 'undefined') return { publish: () => {} }
  const channel = new BroadcastChannel(`${SYNC_CHANNEL_PREFIX}${slug}`)
  let following = false
  channel.addEventListener('message', (event: MessageEvent<unknown>) => {
    const data = event.data
    if (typeof data !== 'object' || data === null || !('slide' in data)) return
    const { slide, step, blank } = data as { slide: unknown; step?: unknown; blank?: unknown }
    if (typeof slide !== 'string') return
    following = true
    try {
      follow({
        slide,
        step: typeof step === 'number' && Number.isFinite(step) ? step : 0,
        blank: blank === true,
      })
    } finally {
      following = false
    }
  })
  return {
    publish(state) {
      if (!following) channel.postMessage({ ...state })
    },
  }
}
