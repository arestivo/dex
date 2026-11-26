import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { DiagnosticBag } from '../diagnostics.ts'
import { DEFAULT_LAYOUT, IDENTIFIER_PATTERN, type Layout, type LayoutOrigin } from '../model.ts'
import { findUnsupportedCss, scopeLayoutCss } from './css.ts'
import { parseTemplate, TEMPLATE_VARIABLES } from './template.ts'

export const TEMPLATE_FILE = 'template.html'
export const STYLE_FILE = 'style.css'
export const NOTES_FILE = 'layout.md'

export interface LayoutSet {
  readonly layouts: ReadonlyMap<string, Layout>
  readonly diagnostics: DiagnosticBag
}

/** A folder of layouts. Earlier sources win; local layouts can't reuse built-in names. */
export interface LayoutSource {
  /** Absolute, or relative to the content folder. */
  readonly dir: string
  readonly origin: LayoutOrigin
}

export interface LayoutDocument {
  readonly description: string
  readonly notes: string
}

export interface CreateLayoutOptions {
  readonly origin?: LayoutOrigin
  /** Parsed `layout.md`, when there is one. */
  readonly document?: LayoutDocument | undefined
}

/** Builds a layout from its template and stylesheet sources. */
export function createLayout(
  name: string,
  file: string,
  html: string,
  css: string,
  diagnostics: DiagnosticBag,
  options: CreateLayoutOptions = {},
): Layout {
  const template = parseTemplate(html)
  for (const variable of template.unknownVariables) {
    diagnostics.error(
      file,
      `Unknown template variable "{{${variable}}}". Available: ${TEMPLATE_VARIABLES.join(', ')}.`,
    )
  }
  for (const problem of findUnsupportedCss(css)) {
    diagnostics.error(file.replace(TEMPLATE_FILE, STYLE_FILE), problem)
  }
  return {
    name,
    origin: options.origin ?? 'built-in',
    file,
    description: options.document?.description ?? '',
    notes: options.document?.notes,
    template: template.children,
    slots: template.slots,
    css: scopeLayoutCss(name, css),
  }
}

/** Splits `layout.md` into its front matter `description` and its body. */
export function parseLayoutDocument(text: string): LayoutDocument {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text)
  if (!match) return { description: '', notes: text.trim() }
  let data: unknown
  try {
    data = parseYaml(match[1] ?? '')
  } catch {
    data = undefined
  }
  const description =
    typeof data === 'object' && data !== null && 'description' in data
      ? String((data as { description: unknown }).description ?? '').trim()
      : ''
  return { description, notes: text.slice(match[0].length).trim() }
}

/**
 * Loads every `<name>/` folder of every source, in order. Diagnostic paths
 * are relative to `root` (the content folder).
 */
export function loadLayoutSet(root: string, sources: readonly LayoutSource[]): LayoutSet {
  const diagnostics = new DiagnosticBag()
  const layouts = new Map<string, Layout>()
  const seen = new Set<string>()

  for (const source of sources) {
    const dir = resolve(root, source.dir)
    if (existsSync(dir)) {
      // The same folder can appear twice, e.g. the engine repository used as
      // a content folder: its layouts/ is then both built-in and "local".
      const real = realpathSync(dir)
      if (seen.has(real)) continue
      seen.add(real)
    }
    if (!existsSync(dir)) {
      // A content folder without local layouts is normal.
      if (source.origin === 'built-in') {
        diagnostics.error(relative(root, dir), 'The layouts folder does not exist.')
      }
      continue
    }

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const folder = join(dir, entry.name)
      const templatePath = join(folder, TEMPLATE_FILE)
      const file = relative(root, templatePath)

      if (!IDENTIFIER_PATTERN.test(entry.name)) {
        diagnostics.error(
          relative(root, folder),
          `Invalid layout name "${entry.name}": layout folders must match ${IDENTIFIER_PATTERN}.`,
        )
        continue
      }
      if (!existsSync(templatePath)) {
        diagnostics.error(file, `Layout "${entry.name}" has no ${TEMPLATE_FILE}.`)
        continue
      }
      const existing = layouts.get(entry.name)
      if (existing !== undefined) {
        diagnostics.error(
          file,
          `"${entry.name}" is a built-in layout: local layouts cannot replace built-in ones. Rename this folder (e.g. ${relative(root, folder)}-custom/).`,
        )
        continue
      }

      const stylePath = join(folder, STYLE_FILE)
      const css = existsSync(stylePath) ? readFileSync(stylePath, 'utf8') : ''
      const html = readFileSync(templatePath, 'utf8')
      const document = readDocument(root, folder, entry.name, diagnostics)
      layouts.set(
        entry.name,
        createLayout(entry.name, file, html, css, diagnostics, { origin: source.origin, document }),
      )
    }
  }

  const builtIn = sources.find((source) => source.origin === 'built-in')
  if (builtIn !== undefined && layouts.get(DEFAULT_LAYOUT)?.origin !== 'built-in') {
    diagnostics.error(
      relative(root, join(resolve(root, builtIn.dir), DEFAULT_LAYOUT, TEMPLATE_FILE)),
      `The "${DEFAULT_LAYOUT}" layout is required.`,
    )
  }

  return { layouts, diagnostics }
}

/** Reads `layout.md`, warning when it is missing or has no description. */
function readDocument(
  root: string,
  folder: string,
  name: string,
  diagnostics: DiagnosticBag,
): LayoutDocument | undefined {
  const path = join(folder, NOTES_FILE)
  const file = relative(root, path)
  if (!existsSync(path)) {
    diagnostics.warn(
      file,
      `Layout "${name}" has no ${NOTES_FILE}: add one with a description and usage notes, so people and agents know when and how to use it.`,
    )
    return undefined
  }
  const document = parseLayoutDocument(readFileSync(path, 'utf8'))
  if (document.description === '') {
    diagnostics.warn(
      file,
      `${NOTES_FILE} has no description: add a one-line \`description:\` to its front matter.`,
      { line: 1 },
    )
  }
  return document
}

/** Concatenated, scoped CSS of all layouts, in name order. */
export function layoutsCss(layouts: ReadonlyMap<string, Layout>): string {
  return [...layouts.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((layout) => layout.css)
    .join('\n')
}
