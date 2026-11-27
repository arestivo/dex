import { existsSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { DiagnosticBag } from '../diagnostics.ts'
import {
  collisionMessage,
  existingSources,
  type FolderDocument,
  type FolderKind,
  type FolderSource,
  namedFolders,
  parseFolderDocument,
  readFolderDocument,
} from '../folders.ts'
import { DEFAULT_LAYOUT, type Layout, type LayoutOrigin } from '../model.ts'
import { findUnsupportedCss, scopeLayoutCss } from './css.ts'
import { parseTemplate, TEMPLATE_VARIABLES } from './template.ts'

export const TEMPLATE_FILE = 'template.html'
export const STYLE_FILE = 'style.css'
export const NOTES_FILE = 'layout.md'

const KIND: FolderKind = { noun: 'layout', mainFile: TEMPLATE_FILE, docFile: NOTES_FILE }

export interface LayoutSet {
  readonly layouts: ReadonlyMap<string, Layout>
  readonly diagnostics: DiagnosticBag
}

/** A folder of layouts. Earlier sources win: a later folder can't reuse an earlier name. */
export type LayoutSource = FolderSource

export type LayoutDocument = FolderDocument

export interface CreateLayoutOptions {
  readonly origin?: LayoutOrigin
  /** The deck slug, for a deck layout: its CSS is scoped to that deck. */
  readonly deck?: string | undefined
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
    ...(options.deck === undefined ? {} : { deck: options.deck }),
    file,
    description: options.document?.description ?? '',
    notes: options.document?.notes,
    template: template.children,
    slots: template.slots,
    css: scopeLayoutCss(name, css, options.deck),
  }
}

/** Splits `layout.md` into its front matter `description` and its body. */
export const parseLayoutDocument = parseFolderDocument

/**
 * Loads every `<name>/` folder of every source, in order. Diagnostic paths
 * are relative to `root` (the content folder).
 */
export function loadLayoutSet(root: string, sources: readonly LayoutSource[]): LayoutSet {
  const diagnostics = new DiagnosticBag()
  const layouts = new Map<string, Layout>()
  for (const source of existingSources(root, sources, KIND, diagnostics)) {
    loadFolder(root, source.dir, source.origin, undefined, layouts, diagnostics)
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

/** A deck's own layouts folder (`decks/<slug>/layouts/`). */
export interface DeckLayoutSource {
  /** Absolute, or relative to the content folder. */
  readonly dir: string
  /** The deck's slug. */
  readonly deck: string
}

/**
 * The layouts one deck can use: `base` (built-in and local) plus that
 * deck's own layouts. Only the deck layouts' diagnostics are returned, so
 * problems with shared layouts are reported once, not once per deck.
 */
export function extendLayoutSet(
  root: string,
  base: ReadonlyMap<string, Layout>,
  source: DeckLayoutSource,
): LayoutSet {
  const diagnostics = new DiagnosticBag()
  const layouts = new Map(base)
  const dir = resolve(root, source.dir)
  // A deck without its own layouts is normal.
  if (existsSync(dir)) loadFolder(root, dir, 'deck', source.deck, layouts, diagnostics)
  return { layouts, diagnostics }
}

/** Loads every `<name>/` folder of `dir` into `layouts`. Names already there win. */
function loadFolder(
  root: string,
  dir: string,
  origin: LayoutOrigin,
  deck: string | undefined,
  layouts: Map<string, Layout>,
  diagnostics: DiagnosticBag,
): void {
  for (const folder of namedFolders(root, dir, KIND, diagnostics)) {
    const existing = layouts.get(folder.name)
    if (existing !== undefined) {
      diagnostics.error(folder.file, collisionMessage(root, KIND, existing, origin, folder.folder))
      continue
    }
    const stylePath = join(folder.folder, STYLE_FILE)
    const css = existsSync(stylePath) ? readFileSync(stylePath, 'utf8') : ''
    const html = readFileSync(join(folder.folder, TEMPLATE_FILE), 'utf8')
    const document = readFolderDocument(root, folder, KIND, diagnostics)
    layouts.set(
      folder.name,
      createLayout(folder.name, folder.file, html, css, diagnostics, { origin, deck, document }),
    )
  }
}

/**
 * Concatenated, scoped CSS of the given layouts: shared layouts first, then
 * deck layouts by deck; by name within each group.
 */
export function layoutsCss(layouts: Iterable<Layout>): string {
  return [...layouts]
    .sort((a, b) => (a.deck ?? '').localeCompare(b.deck ?? '') || a.name.localeCompare(b.name))
    .map((layout) => layout.css)
    .join('\n')
}
