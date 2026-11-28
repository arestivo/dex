/**
 * Keeps a deck's windows (the deck and its presenter window) on the same
 * slide and step, through a BroadcastChannel: no server, so it works on any
 * static host. A window posts every change of slide or step and follows the
 * ones it receives; it never re-posts a change it received, so there are no
 * echo loops.
 */
import { SYNC_CHANNEL_PREFIX } from '../shared/constants.ts'

export interface SlideSync {
  /** Tells the other windows that this one now shows `id` with `step` steps revealed. */
  publish(id: string, step: number): void
}

export function createSync(slug: string, follow: (id: string, step: number) => void): SlideSync {
  if (typeof BroadcastChannel === 'undefined') return { publish: () => {} }
  const channel = new BroadcastChannel(`${SYNC_CHANNEL_PREFIX}${slug}`)
  let following = false
  channel.addEventListener('message', (event: MessageEvent<unknown>) => {
    const data = event.data
    if (typeof data !== 'object' || data === null || !('slide' in data)) return
    const { slide, step } = data as { slide: unknown; step?: unknown }
    if (typeof slide !== 'string') return
    following = true
    try {
      follow(slide, typeof step === 'number' && Number.isFinite(step) ? step : 0)
    } finally {
      following = false
    }
  })
  return {
    publish(id, step) {
      if (!following) channel.postMessage({ slide: id, step })
    },
  }
}
