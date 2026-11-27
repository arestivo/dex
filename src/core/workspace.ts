/**
 * File-system side of the engine: finds decks and layouts on disk and
 * compiles them. Everything else in `core/` works on in-memory data.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { type CompileResult, compileDeck, type ThemeChoice } from './compile.ts'
import {
  DECKS_FOLDER,
  ENGINE_ROOT,
  LAYOUTS_DIR,
  LAYOUTS_FOLDER,
  SETTINGS_FILE,
  THEMES_DIR,
  THEMES_FOLDER,
  TOKENS_FILE,
} from './config.ts'
import { type Diagnostic, DiagnosticBag } from './diagnostics.ts'
import { createTexRenderer, type DiagramRenderer } from './diagrams/render.ts'
import { extendLayoutSet, type LayoutSet, loadLayoutSet } from './layouts/load.ts'
import {
  type CompiledDeck,
  DEFAULT_THEME,
  IDENTIFIER_PATTERN,
  type Layout,
  type Theme,
} from './model.ts'
import { lineOf, parseSettings, type Settings } from './settings.ts'
import { loadThemeSet, type ThemeSet } from './themes/load.ts'
import { type TokenDefault, themeableTokens } from './themes/parse.ts'

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
  /** Built-in themes folder (default: the engine's themes). */
  readonly themesDir?: string
  /** Local themes folder, absolute or relative to `root` (default `<root>/themes`). */
  readonly localThemesDir?: string
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
  readonly themes: ReadonlyMap<string, Theme>
  /** The folder theme (`dex.yaml`, or `default`): the index page uses it. */
  readonly theme: string
  readonly diagnostics: readonly Diagnostic[]
}

export function resolveOptions(options: WorkspaceOptions): ResolvedWorkspace {
  const root = resolve(options.root)
  return {
    root,
    decksDir: resolve(root, options.decksDir ?? DECKS_FOLDER),
    layoutsDir: resolve(root, options.layoutsDir ?? LAYOUTS_DIR),
    localLayoutsDir: resolve(root, options.localLayoutsDir ?? LAYOUTS_FOLDER),
    themesDir: resolve(root, options.themesDir ?? THEMES_DIR),
    localThemesDir: resolve(root, options.localThemesDir ?? THEMES_FOLDER),
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

/** The engine's colour tokens: what a theme may set, with their default values. */
export function engineTokens(): TokenDefault[] {
  return themeableTokens(readFileSync(TOKENS_FILE, 'utf8'))
}

/** Loads the built-in themes and the content folder's local themes. */
export function loadWorkspaceThemes(options: WorkspaceOptions): ThemeSet {
  const resolved = resolveOptions(options)
  return loadThemeSet(
    resolved.root,
    [
      { dir: resolved.themesDir, origin: 'built-in' },
      { dir: resolved.localThemesDir, origin: 'local' },
    ],
    engineTokens(),
  )
}

/** The content folder's `dex.yaml` (empty settings when there is none). */
export function loadSettings(options: WorkspaceOptions): {
  readonly settings: Settings
  readonly text: string
  readonly diagnostics: DiagnosticBag
} {
  const { root } = resolveOptions(options)
  const diagnostics = new DiagnosticBag()
  const path = join(root, SETTINGS_FILE)
  if (!existsSync(path)) return { settings: {}, text: '', diagnostics }
  const text = readFileSync(path, 'utf8')
  return { settings: parseSettings(text, SETTINGS_FILE, diagnostics), text, diagnostics }
}

export interface ThemeContext {
  readonly themes: ReadonlyMap<string, Theme>
  /** What decks may name, and the folder theme they get otherwise. */
  readonly choice: ThemeChoice
  readonly diagnostics: DiagnosticBag
}

/** Themes, `dex.yaml` and the folder theme, with their diagnostics. */
export function loadThemeContext(options: WorkspaceOptions): ThemeContext {
  const { themes, diagnostics } = loadWorkspaceThemes(options)
  const settings = loadSettings(options)
  diagnostics.push(...settings.diagnostics.items)
  let fallback = DEFAULT_THEME
  const named = settings.settings.theme
  if (named !== undefined && themes.has(named)) fallback = named
  else if (named !== undefined) {
    diagnostics.error(
      SETTINGS_FILE,
      `Unknown theme "${named}". Available: ${[...themes.keys()].sort().join(', ')}. Run \`dex docs themes\` to see them.`,
      { line: lineOf(settings.text, 'theme') },
    )
  }
  return { themes, choice: { available: [...themes.keys()], fallback }, diagnostics }
}

/** Loads the built-in layouts and the content folder's local layouts. */
export function loadWorkspaceLayouts(options: WorkspaceOptions): LayoutSet {
  const resolved = resolveOptions(options)
  return loadLayoutSet(resolved.root, [
    { dir: resolved.layoutsDir, origin: 'built-in' },
    { dir: resolved.localLayoutsDir, origin: 'local' },
  ])
}

/**
 * The layouts one deck can use: built-in, local and its own
 * `decks/<slug>/layouts/`. Pass `base` (from `loadWorkspaceLayouts`) to
 * avoid reloading the shared layouts; only the deck layouts' diagnostics
 * are returned.
 */
export function loadDeckLayouts(
  options: WorkspaceOptions,
  location: DeckLocation,
  base?: ReadonlyMap<string, Layout>,
): LayoutSet {
  const resolved = resolveOptions(options)
  return extendLayoutSet(resolved.root, base ?? loadWorkspaceLayouts(resolved).layouts, {
    dir: join(location.dir, LAYOUTS_FOLDER),
    deck: location.slug,
  })
}

/**
 * Every layout of the site, for the one site-wide stylesheet: the shared
 * layouts and every deck's own layouts. Diagnostics cover all of them.
 */
export function loadSiteLayouts(options: WorkspaceOptions): {
  readonly layouts: readonly Layout[]
  readonly diagnostics: DiagnosticBag
} {
  const resolved = resolveOptions(options)
  const base = loadWorkspaceLayouts(resolved)
  const diagnostics = new DiagnosticBag()
  diagnostics.push(...base.diagnostics.items)
  const layouts = [...base.layouts.values()]
  for (const location of findDecks(resolved, new DiagnosticBag())) {
    const deck = loadDeckLayouts(resolved, location, base.layouts)
    diagnostics.push(...deck.diagnostics.items)
    layouts.push(...[...deck.layouts.values()].filter((layout) => layout.origin === 'deck'))
  }
  return { layouts, diagnostics }
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

/** Compiles one deck from disk, with the layouts it can use (see `loadDeckLayouts`). */
export function compileDeckAt(
  location: DeckLocation,
  layouts: ReadonlyMap<string, Layout>,
  renderer?: DiagramRenderer,
  themes?: Pick<ThemeContext, 'choice' | 'themes'>,
): Promise<CompileResult> {
  return compileDeck(
    {
      renderDiagrams:
        renderer === undefined
          ? undefined
          : (sources, theme) =>
              renderer(location.slug, sources, themes?.themes.get(theme)?.colours),
      slug: location.slug,
      file: location.file,
      source: readFileSync(join(location.dir, DECK_FILE), 'utf8'),
      assetExists: (path) => isFileInside(location.dir, path),
      themes: themes?.choice,
    },
    layouts,
  )
}

/**
 * Loads layouts and compiles all decks (or only `slugs`), each with its own
 * layouts on top of the shared ones. Unused files in each deck's `assets/`
 * folder are reported as warnings.
 */
export async function compileWorkspace(
  options: WorkspaceOptions,
  slugs: readonly string[] = [],
): Promise<WorkspaceResult> {
  const resolved = resolveOptions(options)
  const bag = new DiagnosticBag()
  const { layouts, diagnostics: layoutDiagnostics } = loadWorkspaceLayouts(resolved)
  bag.push(...layoutDiagnostics.items)
  const themeContext = loadThemeContext(resolved)
  bag.push(...themeContext.diagnostics.items)

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
    const deckLayouts = loadDeckLayouts(resolved, location, layouts)
    bag.push(...deckLayouts.diagnostics.items)
    const { deck, diagnostics } = await compileDeckAt(
      location,
      deckLayouts.layouts,
      renderer,
      themeContext,
    )
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

  return {
    decks,
    layouts,
    themes: themeContext.themes,
    theme: themeContext.choice.fallback,
    diagnostics: bag.items,
  }
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
