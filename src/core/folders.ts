/**
 * Folders of named things (layouts, themes): `<dir>/<name>/` with a main
 * file and a Markdown document of usage notes. Loaded from the engine
 * (built-in), the content folder (local) and, for layouts, decks.
 * File-system access: one of the I/O modules of `core/`.
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { DiagnosticBag } from './diagnostics.ts'
import { IDENTIFIER_PATTERN, type LayoutOrigin } from './model.ts'

/** What kind of folder, for file names and messages. */
export interface FolderKind {
  /** Singular noun: `layout`, `theme`. */
  readonly noun: string
  /** The required file, e.g. `template.html`. */
  readonly mainFile: string
  /** The usage-notes file, e.g. `layout.md`. */
  readonly docFile: string
}

export interface FolderDocument {
  readonly description: string
  readonly notes: string
}

export interface FolderSource {
  /** Absolute, or relative to the content folder. */
  readonly dir: string
  readonly origin: LayoutOrigin
}

export interface NamedFolder {
  readonly name: string
  /** Absolute path of the folder. */
  readonly folder: string
  /** The main file, relative to the content folder (for diagnostics). */
  readonly file: string
}

/** Something already loaded under a name, for collision messages. */
export interface Named {
  readonly name: string
  readonly origin: LayoutOrigin
  readonly file: string
}

/** Splits a usage-notes file into its front matter `description` and its body. */
export function parseFolderDocument(text: string): FolderDocument {
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
 * The sources that exist, each folder once (the engine repository used as a
 * content folder has the same folder as built-in and "local"). A missing
 * built-in folder is an error; a missing local one is normal.
 */
export function existingSources(
  root: string,
  sources: readonly FolderSource[],
  kind: FolderKind,
  diagnostics: DiagnosticBag,
): FolderSource[] {
  const seen = new Set<string>()
  const result: FolderSource[] = []
  for (const source of sources) {
    const dir = resolve(root, source.dir)
    if (!existsSync(dir)) {
      if (source.origin === 'built-in') {
        diagnostics.error(relative(root, dir), `The ${kind.noun}s folder does not exist.`)
      }
      continue
    }
    const real = realpathSync(dir)
    if (seen.has(real)) continue
    seen.add(real)
    result.push({ dir, origin: source.origin })
  }
  return result
}

/**
 * The `<name>/` folders of `dir` with a valid name and a main file. Others
 * are reported and skipped.
 */
export function namedFolders(
  root: string,
  dir: string,
  kind: FolderKind,
  diagnostics: DiagnosticBag,
): NamedFolder[] {
  const noun = kind.noun[0]?.toUpperCase() + kind.noun.slice(1)
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return []
    const folder = join(dir, entry.name)
    const file = relative(root, join(folder, kind.mainFile))
    if (!IDENTIFIER_PATTERN.test(entry.name)) {
      diagnostics.error(
        relative(root, folder),
        `Invalid ${kind.noun} name "${entry.name}": ${kind.noun} folders must match ${IDENTIFIER_PATTERN}.`,
      )
      return []
    }
    if (!existsSync(join(folder, kind.mainFile))) {
      diagnostics.error(file, `${noun} "${entry.name}" has no ${kind.mainFile}.`)
      return []
    }
    return [{ name: entry.name, folder, file }]
  })
}

/** Why a folder can't use a name that a wider source already has, and how to fix it. */
export function collisionMessage(
  root: string,
  kind: FolderKind,
  existing: Named,
  origin: LayoutOrigin,
  folder: string,
): string {
  const rename = `Rename this folder (e.g. ${relative(root, folder)}-custom/).`
  const these = `${origin} ${kind.noun}s`
  if (existing.origin === 'local') {
    const where = relative(root, dirname(resolve(root, existing.file)))
    return `"${existing.name}" is a local ${kind.noun} (${where}/): ${these} cannot replace local ones. ${rename}`
  }
  return `"${existing.name}" is a built-in ${kind.noun}: ${these} cannot replace built-in ones. ${rename}`
}

/** Reads the usage-notes file, warning when it is missing or has no description. */
export function readFolderDocument(
  root: string,
  folder: NamedFolder,
  kind: FolderKind,
  diagnostics: DiagnosticBag,
): FolderDocument | undefined {
  const path = join(folder.folder, kind.docFile)
  const file = relative(root, path)
  if (!existsSync(path)) {
    const noun = kind.noun[0]?.toUpperCase() + kind.noun.slice(1)
    diagnostics.warn(
      file,
      `${noun} "${folder.name}" has no ${kind.docFile}: add one with a description and usage notes, so people and agents know when and how to use it.`,
    )
    return undefined
  }
  const document = parseFolderDocument(readFileSync(path, 'utf8'))
  if (document.description === '') {
    diagnostics.warn(
      file,
      `${kind.docFile} has no description: add a one-line \`description:\` to its front matter.`,
      { line: 1 },
    )
  }
  return document
}
