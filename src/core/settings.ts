/**
 * The content folder's settings, from its optional `dex.yaml`. Pure: the
 * file's text in, settings and diagnostics out (workspace.ts reads the file).
 */
import { parse as parseYaml } from 'yaml'
import type { DiagnosticBag } from './diagnostics.ts'

export interface Settings {
  /** The folder's default theme (decks can name their own). */
  readonly theme?: string
}

const ALLOWED_KEYS = ['theme'] as const

/** Validates `dex.yaml`. Problems are errors at `file`; valid keys are still kept. */
export function parseSettings(text: string, file: string, diagnostics: DiagnosticBag): Settings {
  let data: unknown
  try {
    data = parseYaml(text)
  } catch (error) {
    diagnostics.error(file, `Invalid YAML: ${(error as Error).message}`, { line: 1 })
    return {}
  }
  if (data === null || data === undefined) return {}
  if (typeof data !== 'object' || Array.isArray(data)) {
    diagnostics.error(
      file,
      `${file} must be a YAML mapping, e.g. \`theme: slate\`. Allowed keys: ${ALLOWED_KEYS.join(', ')}.`,
      { line: 1 },
    )
    return {}
  }
  const record = data as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
      diagnostics.error(
        file,
        `Unknown key "${key}" in ${file}. Allowed keys: ${ALLOWED_KEYS.join(', ')}.`,
        { line: lineOf(text, key) },
      )
    }
  }
  const theme = record.theme
  if (theme === undefined || theme === null) return {}
  if (typeof theme !== 'string' || theme.trim() === '') {
    diagnostics.error(file, '`theme` must be the name of a theme, e.g. `theme: slate`.', {
      line: lineOf(text, 'theme'),
    })
    return {}
  }
  return { theme: theme.trim() }
}

/** The line where a top-level `key:` appears (1 when it can't be found). */
export function lineOf(text: string, key: string): number {
  const index = text.split(/\r?\n/).findIndex((line) => line.startsWith(`${key}:`))
  return index === -1 ? 1 : index + 1
}
