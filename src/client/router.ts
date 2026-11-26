/**
 * Maps URL fragments to slides. Pure functions: no DOM access.
 *
 *   #<slide-id>  the slide with that id (canonical)
 *   #<n>         the n-th slide, 1-based (remark.js compatibility)
 *   anything else, or no fragment: the first slide
 */

export interface Resolution {
  readonly index: number
  /** False when the URL should be rewritten to the slide's id. */
  readonly canonical: boolean
}

const POSITIONAL = /^[1-9]\d*$/

export function resolveFragment(hash: string, ids: readonly string[]): Resolution {
  const fragment = safeDecode(hash.replace(/^#/, ''))

  const index = ids.indexOf(fragment)
  if (index !== -1) return { index, canonical: true }

  if (POSITIONAL.test(fragment)) {
    const position = Number(fragment)
    if (position <= ids.length) return { index: position - 1, canonical: false }
  }

  return { index: 0, canonical: false }
}

export function fragmentFor(id: string): string {
  return `#${encodeURIComponent(id)}`
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}
