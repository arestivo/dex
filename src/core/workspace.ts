/**
 * File-system side of the engine: finds decks and layouts on disk and
 * compiles them. Everything else in `core/` works on in-memory data.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { type CompileResult, compileDeck } from './compile.ts'
import { DECKS_FOLDER, ENGINE_ROOT, LAYOUTS_DIR, LAYOUTS_FOLDER } from './config.ts'
import { type Diagnostic, DiagnosticBag } from './diagnostics.ts'
import { createTexRenderer, type DiagramRenderer } from './diagrams/render.ts'
import { type LayoutSet, loadLayoutSet } from './layouts/load.ts'
import { type CompiledDeck, IDENTIFIER_PATTERN, type Layout } from './model.ts'

export const DECK_FILE = 'slides.md'

export interface WorkspaceOptions {
  /** Content folder; diagnostic paths are relative to it. */
  readonly root: string
  /** Decks folder, absolute or relative to `root` (default `<root>/decks`). */
  readonly decksDir?: string
  /** Built-in layouts folder, absolute or relative to `root` (default: the engine's layouts). */
  readonly layoutsDir?: string
  /** Local layouts folder, absolute or relative to `root` (default `<root>/layouts`). */
  readonly localLayoutsDir?: string
  /** Renders tikz blocks (default: TeX, cached in `<root>/.dex/cache/`). */
  readonly diagramRenderer?: DiagramRenderer
}

/** Workspace options with every path absolute. */
export type ResolvedWorkspace = Required<Omit<WorkspaceOptions, 'diagramRenderer'>> &
  Pick<WorkspaceOptions, 'diagramRenderer'>

export interface DeckLocation {
  readonly slug: string
  /** Absolute path of the deck folder. */
  readonly dir: string
  /** Path of `slides.md` relative to the content folder. */
  readonly file: string
}

export interface WorkspaceResult {
  readonly decks: readonly CompiledDeck[]
  readonly layouts: ReadonlyMap<string, Layout>
  readonly diagnostics: readonly Diagnostic[]
}

export function resolveOptions(options: WorkspaceOptions): ResolvedWorkspace {
  const root = resolve(options.root)
  return {
    root,
    decksDir: resolve(root, options.decksDir ?? DECKS_FOLDER),
    layoutsDir: resolve(root, options.layoutsDir ?? LAYOUTS_DIR),
    localLayoutsDir: resolve(root, options.localLayoutsDir ?? LAYOUTS_FOLDER),
    ...(options.diagramRenderer === undefined ? {} : { diagramRenderer: options.diagramRenderer }),
  }
}

/** The TeX diagram renderer for a content folder (palettes from the engine's tokens). */
export function texRendererFor(options: WorkspaceOptions): DiagramRenderer {
  const resolved = resolveOptions(options)
  return createTexRenderer({
    root: resolved.root,
    decksDir: resolved.decksDir,
    tokensCss: readFileSync(join(ENGINE_ROOT, 'styles', 'tokens.css'), 'utf8'),
  })
}

/** Loads the built-in layouts and the content folder's local layouts. */
export function loadWorkspaceLayouts(options: WorkspaceOptions): LayoutSet {
  const resolved = resolveOptions(options)
  return loadLayoutSet(resolved.root, [
    { dir: resolved.layoutsDir, origin: 'built-in' },
    { dir: resolved.localLayoutsDir, origin: 'local' },
  ])
}

/** Lists deck folders (those containing `slides.md`), sorted by slug. */
export function findDecks(options: WorkspaceOptions, diagnostics: DiagnosticBag): DeckLocation[] {
  const { root, decksDir: dir } = resolveOptions(options)
  if (!existsSync(dir)) return []

  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, DECK_FILE)))
    .flatMap((entry) => {
      const file = relative(root, join(dir, entry.name, DECK_FILE))
      if (!IDENTIFIER_PATTERN.test(entry.name)) {
        diagnostics.error(
          file,
          `Invalid deck folder name "${entry.name}": deck slugs must match ${IDENTIFIER_PATTERN}.`,
        )
        return []
      }
      return [{ slug: entry.name, dir: join(dir, entry.name), file }]
    })
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

/** Compiles one deck from disk. */
export function compileDeckAt(
  location: DeckLocation,
  layouts: ReadonlyMap<string, Layout>,
  renderer?: DiagramRenderer,
): Promise<CompileResult> {
  return compileDeck(
    {
      renderDiagrams:
        renderer === undefined ? undefined : (sources) => renderer(location.slug, sources),
      slug: location.slug,
      file: location.file,
      source: readFileSync(join(location.dir, DECK_FILE), 'utf8'),
      assetExists: (path) => isFileInside(location.dir, path),
    },
    layouts,
  )
}

/**
 * Loads layouts and compiles all decks (or only `slugs`). Unused files in
 * each deck's `assets/` folder are reported as warnings.
 */
export async function compileWorkspace(
  options: WorkspaceOptions,
  slugs: readonly string[] = [],
): Promise<WorkspaceResult> {
  const resolved = resolveOptions(options)
  const bag = new DiagnosticBag()
  const { layouts, diagnostics: layoutDiagnostics } = loadWorkspaceLayouts(resolved)
  bag.push(...layoutDiagnostics.items)

  if (!existsSync(resolved.decksDir)) {
    bag.error(
      relative(resolved.root, resolved.decksDir) || '.',
      `No decks folder at ${resolved.decksDir}. Run inside a content folder (one containing decks/) or pass --folder.`,
    )
  }

  // Problems with unrelated deck folders only matter when checking everything.
  const discovery = new DiagnosticBag()
  let locations = findDecks(resolved, discovery)
  if (slugs.length === 0) bag.push(...discovery.items)
  else {
    for (const slug of slugs.filter((s) => !locations.some((l) => l.slug === s))) {
      bag.error(
        relative(resolved.root, join(resolved.decksDir, slug)),
        `No deck "${slug}" (expected ${DECK_FILE} there).`,
      )
    }
    locations = locations.filter((location) => slugs.includes(location.slug))
  }

  const renderer = resolved.diagramRenderer ?? texRendererFor(resolved)
  const decks: CompiledDeck[] = []
  for (const location of locations) {
    const { deck, diagnostics } = await compileDeckAt(location, layouts, renderer)
    bag.push(...diagnostics.items)
    if (deck === undefined) continue
    decks.push(deck)
    for (const unused of unusedAssets(location, deck.assets)) {
      bag.warn(
        relative(resolved.root, join(location.dir, unused)),
        'Asset is not used by any slide.',
      )
    }
  }

  return { decks, layouts, diagnostics: bag.items }
}

function unusedAssets(location: DeckLocation, used: ReadonlySet<string>): string[] {
  const assetsDir = join(location.dir, 'assets')
  if (!existsSync(assetsDir)) return []
  return readdirSync(assetsDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => relative(location.dir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .filter((path) => !used.has(path))
}

function isFileInside(dir: string, path: string): boolean {
  const full = resolve(dir, path)
  if (!full.startsWith(dir + sep)) return false
  try {
    return statSync(full).isFile()
  } catch {
    return false
  }
}
