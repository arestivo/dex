/** A slide's raw Markdown and where it starts in the source file. */
export interface SlideSource {
  readonly markdown: string
  /** 1-based line number of the chunk's first line in the deck file. */
  readonly line: number
}

const SEPARATOR = /^---\s*$/
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/

/**
 * Splits a deck body into slides on lines consisting only of `---`,
 * ignoring such lines inside fenced code blocks.
 *
 * @param lines the deck body, one entry per line
 * @param firstLine 1-based line number of `lines[0]` in the deck file
 */
export function splitSlides(lines: readonly string[], firstLine: number): SlideSource[] {
  const slides: SlideSource[] = []
  let current: string[] = []
  let currentLine = firstLine
  let fence: string | undefined

  lines.forEach((line, index) => {
    if (fence === undefined && SEPARATOR.test(line)) {
      slides.push({ markdown: current.join('\n'), line: currentLine })
      current = []
      currentLine = firstLine + index + 1
      return
    }

    const marker = FENCE_OPEN.exec(line)?.[1]
    if (marker !== undefined) {
      if (fence === undefined) fence = marker
      else if (marker[0] === fence[0] && marker.length >= fence.length && isClosing(line)) {
        fence = undefined
      }
    }
    current.push(line)
  })

  slides.push({ markdown: current.join('\n'), line: currentLine })
  return slides
}

/** A closing fence has nothing after the fence characters but whitespace. */
function isClosing(line: string): boolean {
  return /^ {0,3}(`{3,}|~{3,})\s*$/.test(line)
}
