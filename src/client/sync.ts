/**
 * Keeps a deck's windows (the deck and its presenter window) on the same
 * slide, through a BroadcastChannel: no server, so it works on any static
 * host. A window posts every slide change and follows the ones it receives;
 * it never re-posts a change it received, so there are no echo loops.
 */
import { SYNC_CHANNEL_PREFIX } from '../shared/constants.ts'

export interface SlideSync {
  /** Tells the other windows that this one now shows `id`. */
  publish(id: string): void
}

export function createSync(slug: string, follow: (id: string) => void): SlideSync {
  if (typeof BroadcastChannel === 'undefined') return { publish: () => {} }
  const channel = new BroadcastChannel(`${SYNC_CHANNEL_PREFIX}${slug}`)
  let following = false
  channel.addEventListener('message', (event: MessageEvent<unknown>) => {
    const data = event.data
    if (typeof data !== 'object' || data === null || !('slide' in data)) return
    const id = (data as { slide: unknown }).slide
    if (typeof id !== 'string') return
    following = true
    try {
      follow(id)
    } finally {
      following = false
    }
  })
  return {
    publish(id) {
      if (!following) channel.postMessage({ slide: id })
    },
  }
}
