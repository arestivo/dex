/**
 * In-deck search: finding a query in the text of every slide.
 *
 * The pure part normalises text (case and accents ignored, whitespace
 * collapsed) while remembering where each normalised character came from,
 * so a match maps back to the slide's own text. The DOM part collects a
 * slide's text nodes into one string and turns matches into `Range`s,
 * which the viewer highlights without touching the slide markup.
 */

/** Joins text from different blocks: no query can contain it, so no match crosses blocks. */
export const BLOCK_SEPARATOR = '\u0000'

export interface NormalisedText {
  /** Lower case, accents removed, whitespace collapsed to single spaces. */
  readonly text: string
  /** For each character of `text`, where its source character starts. */
  readonly starts: readonly number[]
  /** For each character of `text`, where its source character ends. */
  readonly ends: readonly number[]
}

export interface SearchMatch {
  /** Index of the slide (or text) in the list searched. */
  readonly slide: number
  /** Source offsets of the match: `[start, end)`. */
  readonly start: number
  readonly end: number
}

/** Normalises `source` for matching, keeping a map back to its offsets. */
export function normalise(source: string): NormalisedText {
  let text = ''
  const starts: number[] = []
  const ends: number[] = []
  let offset = 0
  for (const character of source) {
    const start = offset
    offset += character.length
    if (/\s/.test(character)) {
      if (text.endsWith(' ')) continue
      text += ' '
      starts.push(start)
      ends.push(offset)
      continue
    }
    const folded = character.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    for (const unit of folded) {
      text += unit
      for (let i = 0; i < unit.length; i++) {
        starts.push(start)
        ends.push(offset)
      }
    }
  }
  return { text, starts, ends }
}

/** The query as it is matched: normalised, or '' when there is nothing to find. */
export function normaliseQuery(query: string): string {
  const { text } = normalise(query.replaceAll(BLOCK_SEPARATOR, ''))
  return text.trim() === '' ? '' : text
}

/** Every match of `query` in `texts`, in order (text, then position); matches don't overlap. */
export function findMatches(texts: readonly NormalisedText[], query: string): SearchMatch[] {
  const needle = normaliseQuery(query)
  if (needle === '') return []
  const matches: SearchMatch[] = []
  texts.forEach((normalised, slide) => {
    for (
      let at = normalised.text.indexOf(needle);
      at !== -1;
      at = normalised.text.indexOf(needle, at + needle.length)
    ) {
      const start = normalised.starts[at]
      const end = normalised.ends[at + needle.length - 1]
      if (start !== undefined && end !== undefined) matches.push({ slide, start, end })
    }
  })
  return matches
}

/** The first match on or after `slide`, or the first match (wrapping); -1 when none. */
export function firstMatchFrom(matches: readonly SearchMatch[], slide: number): number {
  if (matches.length === 0) return -1
  const index = matches.findIndex((match) => match.slide >= slide)
  return index === -1 ? 0 : index
}

/** The match `step` places after `index`, wrapping at both ends. */
export function stepMatch(index: number, step: 1 | -1, count: number): number {
  return count === 0 ? -1 : (index + step + count) % count
}

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------

interface TextPiece {
  readonly node: Text
  /** Offset of the node's first character in the slide text. */
  readonly start: number
}

export interface SlideText {
  /** The slide's text, blocks joined by `BLOCK_SEPARATOR`. */
  readonly source: string
  readonly normalised: NormalisedText
  readonly pieces: readonly TextPiece[]
}

/** Elements whose text is not searchable: diagrams are paths, not text. */
const SKIPPED = new Set(['svg', 'script', 'style', 'template', 'noscript'])

/** Classes whose text is not searchable: hidden text, and the slide number ("12 / 68"). */
const SKIPPED_CLASSES = ['visually-hidden', 'slide__number']

/** Elements that start a new block of text, so matches can't cross them. */
const BLOCKS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'td',
  'th',
  'tr',
  'ul',
])

/** Collects the searchable text of a slide. */
export function slideText(slide: Element): SlideText {
  let source = ''
  const pieces: TextPiece[] = []

  const visit = (node: Node): void => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child as Text
        if (text.data === '') continue
        pieces.push({ node: text, start: source.length })
        source += text.data
        continue
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue
      const element = child as Element
      const tag = element.localName
      if (SKIPPED.has(tag) || SKIPPED_CLASSES.some((name) => element.classList.contains(name))) {
        continue
      }
      if (tag === 'br') {
        source += ' '
        continue
      }
      const block = BLOCKS.has(tag)
      if (block) source += BLOCK_SEPARATOR
      visit(element)
      if (block) source += BLOCK_SEPARATOR
    }
  }

  visit(slide)
  return { source, normalised: normalise(source), pieces }
}

/** A DOM range covering `[start, end)` of a slide's text. */
export function matchRange(text: SlideText, start: number, end: number): Range | undefined {
  const first = text.pieces.find((piece) => piece.start + piece.node.length > start)
  const last = text.pieces.findLast((piece) => piece.start < end)
  if (first === undefined || last === undefined) return undefined
  const range = document.createRange()
  range.setStart(first.node, Math.max(0, start - first.start))
  range.setEnd(last.node, Math.min(last.node.length, end - last.start))
  return range
}
