/** Fenced `tikz` blocks: recognising them, reading `alt`, and validating them. */

/** Fence languages rendered as diagrams instead of highlighted code. */
export const DIAGRAM_LANGUAGES: ReadonlySet<string> = new Set(['tikz'])

export function isDiagramLanguage(lang: string | null | undefined): boolean {
  return lang !== null && lang !== undefined && DIAGRAM_LANGUAGES.has(lang.toLowerCase())
}

/** Reads `alt="..."` from a fence's info string (the text after the language). */
export function parseAlt(meta: string | null | undefined): string | undefined {
  const match = /(?:^|\s)alt="((?:[^"\\]|\\.)*)"/.exec(meta ?? '')
  if (match?.[1] === undefined) return undefined
  const alt = match[1].replace(/\\(.)/g, '$1').trim()
  return alt === '' ? undefined : alt
}

const BEGIN = /\\begin\s*\{tikzpicture\}/g
const END = /\\end\s*\{tikzpicture\}/g

/**
 * A block must be exactly one `tikzpicture` environment (TeX comments and
 * surrounding whitespace aside). Returns an error message, or undefined.
 */
export function validateTikz(source: string): string | undefined {
  const code = stripComments(source).trim()
  const begins = code.match(BEGIN)?.length ?? 0
  const ends = code.match(END)?.length ?? 0
  const message =
    "A tikz block must contain exactly one tikzpicture environment (\\begin{tikzpicture} … \\end{tikzpicture}) and nothing else. Put shared styles in tikz/preamble.tex or the deck's tikz.tex."
  if (begins !== 1 || ends !== 1) return message
  if (!/^\\begin\s*\{tikzpicture\}/.test(code) || !/\\end\s*\{tikzpicture\}$/.test(code))
    return message
  return undefined
}

/** Removes `%` comments (not `\%`), keeping line structure. */
function stripComments(source: string): string {
  return source
    .split('\n')
    .map((line) => line.replace(/(^|[^\\])%.*$/, '$1'))
    .join('\n')
}
