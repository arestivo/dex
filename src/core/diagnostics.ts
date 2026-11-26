/**
 * Diagnostics are how the core reports content problems. The core never
 * throws for bad content: it collects diagnostics so that the CLI, the dev
 * server and tests can all present the same list.
 */

export type Severity = 'error' | 'warning'

export interface Diagnostic {
  readonly severity: Severity
  /** Path of the offending file, relative to the project root. */
  readonly file: string
  /** 1-based line number in `file`, when known. */
  readonly line?: number
  /** Id of the slide the problem belongs to, when known. */
  readonly slideId?: string
  /** What is wrong and, whenever possible, how to fix it. */
  readonly message: string
}

/** Accumulates diagnostics for one unit of work (a deck, a layout set...). */
export class DiagnosticBag {
  readonly #items: Diagnostic[] = []

  error(file: string, message: string, at: Location = {}): void {
    this.#items.push({ severity: 'error', file, message, ...defined(at) })
  }

  warn(file: string, message: string, at: Location = {}): void {
    this.#items.push({ severity: 'warning', file, message, ...defined(at) })
  }

  push(...diagnostics: readonly Diagnostic[]): void {
    this.#items.push(...diagnostics)
  }

  get items(): readonly Diagnostic[] {
    return this.#items
  }

  get hasErrors(): boolean {
    return hasErrors(this.#items)
  }
}

export interface Location {
  line?: number | undefined
  slideId?: string | undefined
}

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((d) => d.severity === 'error')
}

/** Formats a diagnostic as `<file>:<line> <severity> [<slide-id>] <message>`. */
export function formatDiagnostic(d: Diagnostic): string {
  const where = d.line === undefined ? d.file : `${d.file}:${d.line}`
  const slide = d.slideId === undefined ? '' : ` [${d.slideId}]`
  return `${where} ${d.severity}${slide} ${d.message}`
}

/** Sorts diagnostics by file, then line, keeping insertion order for ties. */
export function sortDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort(
    (a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0),
  )
}

/** Drops undefined properties so they play well with `exactOptionalPropertyTypes`. */
function defined(at: Location): { line?: number; slideId?: string } {
  const out: { line?: number; slideId?: string } = {}
  if (at.line !== undefined) out.line = at.line
  if (at.slideId !== undefined) out.slideId = at.slideId
  return out
}
