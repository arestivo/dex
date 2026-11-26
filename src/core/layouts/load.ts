import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { DiagnosticBag } from '../diagnostics.ts'
import { DEFAULT_LAYOUT, IDENTIFIER_PATTERN, type Layout } from '../model.ts'
import { findUnsupportedCss, scopeLayoutCss } from './css.ts'
import { parseTemplate, TEMPLATE_VARIABLES } from './template.ts'

export const TEMPLATE_FILE = 'template.html'
export const STYLE_FILE = 'style.css'

export interface LayoutSet {
  readonly layouts: ReadonlyMap<string, Layout>
  readonly diagnostics: DiagnosticBag
}

/** Builds a layout from its template and stylesheet sources. */
export function createLayout(
  name: string,
  file: string,
  html: string,
  css: string,
  diagnostics: DiagnosticBag,
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
    file,
    template: template.children,
    slots: template.slots,
    css: scopeLayoutCss(name, css),
  }
}

/**
 * Loads every `<name>/` folder in `layoutsDir` (absolute, or relative to
 * `root`). Diagnostic paths are relative to `root`.
 */
export function loadLayouts(root: string, layoutsDir: string): LayoutSet {
  const diagnostics = new DiagnosticBag()
  const layouts = new Map<string, Layout>()
  const dir = resolve(root, layoutsDir)

  if (!existsSync(dir)) {
    diagnostics.error(relative(root, dir), 'The layouts folder does not exist.')
    return { layouts, diagnostics }
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

    const stylePath = join(folder, STYLE_FILE)
    const css = existsSync(stylePath) ? readFileSync(stylePath, 'utf8') : ''
    const html = readFileSync(templatePath, 'utf8')
    layouts.set(entry.name, createLayout(entry.name, file, html, css, diagnostics))
  }

  if (!layouts.has(DEFAULT_LAYOUT)) {
    diagnostics.error(
      relative(root, join(dir, DEFAULT_LAYOUT, TEMPLATE_FILE)),
      `The "${DEFAULT_LAYOUT}" layout is required.`,
    )
  }

  return { layouts, diagnostics }
}

/** Concatenated, scoped CSS of all layouts, in name order. */
export function layoutsCss(layouts: ReadonlyMap<string, Layout>): string {
  return [...layouts.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((layout) => layout.css)
    .join('\n')
}
