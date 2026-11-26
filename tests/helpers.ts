import { fileURLToPath } from 'node:url'
import type { Element } from 'hast'
import { toHtml } from 'hast-util-to-html'
import { type CompileResult, compileDeck } from '../src/core/compile.ts'
import { formatDiagnostic } from '../src/core/diagnostics.ts'
import { loadLayouts } from '../src/core/layouts/load.ts'
import type { CompiledDeck, Layout } from '../src/core/model.ts'

export const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url))
export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url))

/** The real built-in layouts. */
export const builtInLayouts = loadLayouts(PROJECT_ROOT, 'layouts').layouts

export const FRONT_MATTER = '---\ntitle: Test deck\n---\n\n'

export interface CompileOptions {
  readonly assets?: readonly string[]
  readonly layouts?: ReadonlyMap<string, Layout>
  /** Prepend a minimal front matter block (default true). */
  readonly frontMatter?: boolean
}

export function compile(body: string, options: CompileOptions = {}): Promise<CompileResult> {
  const assets = new Set(options.assets ?? [])
  return compileDeck(
    {
      slug: 'test',
      file: 'decks/test/slides.md',
      source: (options.frontMatter === false ? '' : FRONT_MATTER) + body,
      assetExists: (path) => assets.has(path),
    },
    options.layouts ?? builtInLayouts,
  )
}

/** Compiles and returns formatted diagnostics, for readable assertions. */
export async function messages(body: string, options: CompileOptions = {}): Promise<string[]> {
  const { diagnostics } = await compile(body, options)
  return diagnostics.items.map(formatDiagnostic)
}

/** Compiles a deck that must be valid. */
export async function compiledDeck(
  body: string,
  options: CompileOptions = {},
): Promise<CompiledDeck> {
  const { deck, diagnostics } = await compile(body, options)
  if (deck === undefined) {
    throw new Error(`Expected a valid deck:\n${diagnostics.items.map(formatDiagnostic).join('\n')}`)
  }
  return deck
}

/** Compiles a deck that must be valid and returns each slide's HTML. */
export async function slidesHtml(body: string, options: CompileOptions = {}): Promise<string[]> {
  const deck = await compiledDeck(body, options)
  return deck.slides.map((slide) => toHtml(slide.element as Element))
}

export function slide(id: string, content: string, attributes = ''): string {
  return `::slide{#${id}${attributes ? ` ${attributes}` : ''}}\n\n${content}\n`
}

export function deck(...slides: string[]): string {
  return slides.join('\n---\n\n')
}

export interface CliResult {
  readonly code: number
  readonly stdout: string
  readonly stderr: string
}

/** Runs the `dex` CLI in `cwd` and captures its output (never throws). */
export async function runDex(cwd: string, ...args: string[]): Promise<CliResult> {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  try {
    const { stdout, stderr } = await promisify(execFile)(
      process.execPath,
      [`${PROJECT_ROOT}/src/cli/main.ts`, ...args],
      { cwd },
    )
    return { code: 0, stdout, stderr }
  } catch (error) {
    const failure = error as { code: number; stdout: string; stderr: string }
    return { code: failure.code, stdout: failure.stdout, stderr: failure.stderr }
  }
}
