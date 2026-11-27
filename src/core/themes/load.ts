/**
 * Loads colour themes: the engine's `themes/<name>/` and the content
 * folder's `themes/<name>/`, each a `theme.css` (see `parse.ts`) and a
 * `theme.md`. Local themes can't reuse built-in names.
 */
import { readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { DiagnosticBag } from '../diagnostics.ts'
import {
  collisionMessage,
  existingSources,
  type FolderKind,
  namedFolders,
  readFolderDocument,
} from '../folders.ts'
import { DEFAULT_THEME, type Theme, type ThemeOrigin } from '../model.ts'
import { mergeColours } from './colours.ts'
import { contrastProblems, MIN_CONTRAST } from './contrast.ts'
import { parseThemeCss, type TokenDefault } from './parse.ts'

export const THEME_FILE = 'theme.css'
export const THEME_NOTES_FILE = 'theme.md'

const KIND: FolderKind = { noun: 'theme', mainFile: THEME_FILE, docFile: THEME_NOTES_FILE }

export interface ThemeSource {
  /** Absolute, or relative to the content folder. */
  readonly dir: string
  readonly origin: ThemeOrigin
}

export interface ThemeSet {
  readonly themes: ReadonlyMap<string, Theme>
  readonly diagnostics: DiagnosticBag
}

/**
 * Loads every theme of every source, in order. `tokens` are the engine's
 * colour tokens (what a theme may set, and the defaults it is merged with).
 * Each theme is contrast-checked. Diagnostic paths are relative to `root`.
 */
export function loadThemeSet(
  root: string,
  sources: readonly ThemeSource[],
  tokens: readonly TokenDefault[],
): ThemeSet {
  const themeable = new Set(tokens.map((token) => token.name))
  const diagnostics = new DiagnosticBag()
  const themes = new Map<string, Theme>()
  for (const source of existingSources(root, sources, KIND, diagnostics)) {
    for (const folder of namedFolders(root, source.dir, KIND, diagnostics)) {
      const existing = themes.get(folder.name)
      if (existing !== undefined) {
        diagnostics.error(
          folder.file,
          collisionMessage(root, KIND, existing, source.origin, folder.folder),
        )
        continue
      }
      const css = readFileSync(join(folder.folder, THEME_FILE), 'utf8')
      const document = readFolderDocument(root, folder, KIND, diagnostics)
      const theme = createTheme(folder.name, folder.file, css, themeable, diagnostics, {
        origin: source.origin === 'local' ? 'local' : 'built-in',
        document,
      })
      checkContrast(theme, tokens, diagnostics)
      themes.set(folder.name, theme)
    }
  }

  const builtIn = sources.find((source) => source.origin === 'built-in')
  if (builtIn !== undefined && themes.get(DEFAULT_THEME)?.origin !== 'built-in') {
    diagnostics.error(
      relative(root, join(resolve(root, builtIn.dir), DEFAULT_THEME, THEME_FILE)),
      `The "${DEFAULT_THEME}" theme is required.`,
    )
  }
  return { themes, diagnostics }
}

export interface CreateThemeOptions {
  readonly origin?: ThemeOrigin
  readonly document?: { readonly description: string; readonly notes: string } | undefined
}

/** Builds a theme from its `theme.css`, reporting format problems at their lines. */
export function createTheme(
  name: string,
  file: string,
  css: string,
  themeable: ReadonlySet<string>,
  diagnostics: DiagnosticBag,
  options: CreateThemeOptions = {},
): Theme {
  const { declarations, problems } = parseThemeCss(css, themeable)
  for (const problem of problems) diagnostics.error(file, problem.message, { line: problem.line })
  return {
    name,
    origin: options.origin ?? 'built-in',
    file,
    description: options.document?.description ?? '',
    notes: options.document?.notes,
    colours: new Map(declarations.map((d) => [d.token, { light: d.light, dark: d.dark }])),
    lines: new Map(declarations.map((d) => [d.token, d.line])),
    css: scopeThemeCss(name, declarations),
  }
}

/** `@layer themes { :root[data-theme="<name>"] { … } }`, or '' for a theme that sets nothing. */
export function scopeThemeCss(
  name: string,
  declarations: readonly { token: string; light: string; dark: string }[],
): string {
  if (declarations.length === 0) return ''
  const lines = declarations.map(({ token, light, dark }) =>
    light === dark
      ? `    --${token}: #${light};`
      : `    --${token}: light-dark(#${light}, #${dark});`,
  )
  return `@layer themes {\n  :root[data-theme="${name}"] {\n${lines.join('\n')}\n  }\n}\n`
}

/** Warns about text/background pairs that are hard to read, at the theme's own line. */
function checkContrast(
  theme: Theme,
  tokens: readonly TokenDefault[],
  diagnostics: DiagnosticBag,
): void {
  for (const problem of contrastProblems(mergeColours(tokens, theme.colours))) {
    const line = theme.lines.get(problem.foreground) ?? theme.lines.get(problem.background)
    const label = problem.label[0]?.toUpperCase() + problem.label.slice(1)
    diagnostics.warn(
      theme.file,
      `${label}: hard to read in ${problem.mode} mode (contrast ${problem.ratio.toFixed(2)}:1 between --${problem.foreground} and --${problem.background}, below ${MIN_CONTRAST}:1). Make one of the two colours lighter or darker.`,
      line === undefined ? {} : { line },
    )
  }
}

/** Concatenated CSS of the given themes, in name order. */
export function themesCss(themes: Iterable<Theme>): string {
  return [...themes]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((theme) => theme.css)
    .filter(Boolean)
    .join('\n')
}
