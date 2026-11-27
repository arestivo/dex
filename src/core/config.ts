/**
 * Where things live. The engine (this repository) and the content are
 * separate. Commands work on a *content folder* that holds the decks and,
 * by default, receives the built site:
 *
 *   <folder>/decks/<slug>/slides.md    deck sources
 *   <folder>/dist/                     built static site (or --dist)
 *
 * The folder is the working directory unless `--folder` is given.
 * Built-in layouts and themes, styles and the viewer belong to the engine and are found
 * relative to this file, wherever the command runs.
 */
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Absolute path of the engine (repository) root. */
export const ENGINE_ROOT = fileURLToPath(new URL('../../', import.meta.url))

/** The engine's layouts folder. */
export const LAYOUTS_DIR = join(ENGINE_ROOT, 'layouts')

/** The engine's themes folder. */
export const THEMES_DIR = join(ENGINE_ROOT, 'themes')

/** The engine's design tokens: the default colours, and which tokens a theme may set. */
export const TOKENS_FILE = join(ENGINE_ROOT, 'styles', 'tokens.css')

/** Browser entry point of the viewer, relative to the engine root. */
export const CLIENT_ENTRY = 'src/client/main.ts'

export const DECKS_FOLDER = 'decks'
/** Local layouts of a content folder: `<folder>/layouts/<name>/`. */
export const LAYOUTS_FOLDER = 'layouts'
/** Local themes of a content folder: `<folder>/themes/<name>/`. */
export const THEMES_FOLDER = 'themes'
/** The content folder's settings file. */
export const SETTINGS_FILE = 'dex.yaml'
export const OUT_FOLDER = 'dist'

export interface ContentLocations {
  /** The content folder; diagnostic paths are relative to it. */
  readonly root: string
  /** `<root>/decks` */
  readonly decksDir: string
  /** Where the site is built: `--dist`, or `<root>/dist`. */
  readonly outDir: string
}

export interface LocationOptions {
  /** Content folder (`--folder`); default: the working directory. */
  readonly folder?: string | undefined
  /** Output folder (`--dist`); default: `<folder>/dist`. */
  readonly dist?: string | undefined
}

/** Resolves content locations; relative options resolve against `cwd`. */
export function contentLocations(
  options: LocationOptions = {},
  cwd: string = process.cwd(),
): ContentLocations {
  const root = resolve(cwd, options.folder ?? '.')
  return {
    root,
    decksDir: join(root, DECKS_FOLDER),
    outDir: options.dist === undefined ? join(root, OUT_FOLDER) : resolve(cwd, options.dist),
  }
}
