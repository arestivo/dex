import { parse as parseYaml } from 'yaml'
import type { DiagnosticBag } from '../diagnostics.ts'
import type { Author, DeckMeta } from '../model.ts'

const FENCE = /^---\s*$/
const ALLOWED_KEYS = new Set([
  'title',
  'subtitle',
  'description',
  'author',
  'lang',
  'theme',
  'publishNotes',
])
const LANG_PATTERN = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/

export interface FrontMatterResult {
  /** `undefined` when the front matter is missing or has errors. */
  readonly meta: DeckMeta | undefined
  /** Lines after the closing fence. */
  readonly body: readonly string[]
  /** 1-based line number of `body[0]` in the source file. */
  readonly bodyLine: number
}

/**
 * Splits `source` into its YAML front matter and body, validating the
 * front matter against the deck format.
 */
export function parseFrontMatter(
  source: string,
  file: string,
  diagnostics: DiagnosticBag,
): FrontMatterResult {
  const lines = source.split(/\r?\n/)

  if (!FENCE.test(lines[0] ?? '')) {
    diagnostics.error(file, 'The deck must start with a YAML front matter block (`---`).', {
      line: 1,
    })
    return { meta: undefined, body: lines, bodyLine: 1 }
  }

  const close = lines.findIndex((line, index) => index > 0 && FENCE.test(line))
  if (close === -1) {
    diagnostics.error(file, 'The front matter is not closed: add a `---` line after it.', {
      line: 1,
    })
    return { meta: undefined, body: [], bodyLine: lines.length + 1 }
  }

  const body = lines.slice(close + 1)
  const bodyLine = close + 2

  let data: unknown
  try {
    data = parseYaml(lines.slice(1, close).join('\n'))
  } catch (error) {
    diagnostics.error(file, `Invalid YAML in front matter: ${(error as Error).message}`, {
      line: 2,
    })
    return { meta: undefined, body, bodyLine }
  }

  return { meta: validateMeta(data, file, diagnostics), body, bodyLine }
}

function validateMeta(
  data: unknown,
  file: string,
  diagnostics: DiagnosticBag,
): DeckMeta | undefined {
  const at = { line: 1 }

  if (!isRecord(data)) {
    diagnostics.error(file, 'The front matter must be a YAML mapping with at least `title`.', at)
    return undefined
  }

  const errorsBefore = diagnostics.items.length

  for (const key of Object.keys(data)) {
    if (!ALLOWED_KEYS.has(key)) {
      diagnostics.error(
        file,
        `Unknown front matter key "${key}". Allowed: ${[...ALLOWED_KEYS].join(', ')}.`,
        at,
      )
    }
  }

  const title = optionalString(data, 'title', file, diagnostics)
  if (title === undefined) diagnostics.error(file, 'The front matter must define `title`.', at)

  const subtitle = optionalString(data, 'subtitle', file, diagnostics)
  const description = optionalString(data, 'description', file, diagnostics)
  const theme = optionalString(data, 'theme', file, diagnostics)
  const lang = optionalString(data, 'lang', file, diagnostics) ?? 'en'
  if (!LANG_PATTERN.test(lang)) {
    diagnostics.error(file, `Invalid \`lang\` "${lang}": use a BCP 47 tag such as en or pt-PT.`, at)
  }

  const author = validateAuthor(data.author, file, diagnostics)
  const publishNotes = data.publishNotes
  if (publishNotes !== undefined && typeof publishNotes !== 'boolean') {
    diagnostics.error(
      file,
      '`publishNotes` must be `true` (builds publish the speaker notes) or `false`.',
      at,
    )
  }

  if (title === undefined || diagnostics.items.length > errorsBefore) return undefined

  return {
    title,
    lang,
    ...(subtitle === undefined ? {} : { subtitle }),
    ...(description === undefined ? {} : { description }),
    ...(author === undefined ? {} : { author }),
    ...(theme === undefined ? {} : { theme }),
    ...(typeof publishNotes === 'boolean' ? { publishNotes } : {}),
  }
}

function validateAuthor(
  value: unknown,
  file: string,
  diagnostics: DiagnosticBag,
): Author | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'string') return { name: value }
  if (isRecord(value) && typeof value.name === 'string') {
    const unknown = Object.keys(value).filter((key) => key !== 'name' && key !== 'url')
    for (const key of unknown) {
      diagnostics.error(file, `Unknown \`author\` key "${key}". Allowed: name, url.`, { line: 1 })
    }
    if (value.url !== undefined && typeof value.url !== 'string') {
      diagnostics.error(file, '`author.url` must be a string.', { line: 1 })
      return undefined
    }
    return typeof value.url === 'string'
      ? { name: value.name, url: value.url }
      : { name: value.name }
  }
  diagnostics.error(file, '`author` must be a name or a mapping with `name` and optional `url`.', {
    line: 1,
  })
  return undefined
}

function optionalString(
  data: Record<string, unknown>,
  key: string,
  file: string,
  diagnostics: DiagnosticBag,
): string | undefined {
  const value = data[key]
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  diagnostics.error(file, `\`${key}\` must be a non-empty string.`, { line: 1 })
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
