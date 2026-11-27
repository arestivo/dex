/**
 * Renders a deck's tikz blocks in both modes, through a cache in the
 * content folder (`.dex/cache/diagrams/`). TeX is only needed for blocks
 * whose renderings are not cached yet. I/O module: file system + TeX.
 */
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { availableParallelism } from 'node:os'
import { join, relative, sep } from 'node:path'
import type { ModeColour } from '../model.ts'
import { MODES, type Mode, paletteTex, parseColourTokens } from './palette.ts'
import { compileTikz, type TexError, type TexJob, type TexResult } from './tex.ts'
import { describeMissingTex, type MissingTex, missingTex, texComplete } from './toolchain.ts'
import { WRAPPER_VERSION } from './wrapper.ts'

export const CACHE_DIR = join('.dex', 'cache', 'diagrams')
export const DECK_PREAMBLE = 'tikz.tex'

export interface DiagramRenderings {
  readonly light: string
  readonly dark: string
}

/** A rendered diagram, or why it could not be rendered. */
export type DiagramOutcome = { readonly svg: DiagramRenderings } | { readonly error: TexError }

/**
 * Renders every block of one deck (results in block order). `colours` are the
 * deck theme's token values (without `--`), on top of the engine's defaults.
 */
export type DiagramRenderer = (
  deck: string,
  sources: readonly string[],
  colours?: ReadonlyMap<string, ModeColour>,
) => Promise<DiagramOutcome[]>

export interface TexRendererOptions {
  /** Content folder. */
  readonly root: string
  /** Decks folder (default `<root>/decks`). */
  readonly decksDir?: string
  /** The CSS tokens the default palettes come from. */
  readonly tokensCss: string
  /** Replaces TeX (tests). */
  readonly compile?: (job: TexJob) => Promise<TexResult>
  /** PATH used to look for TeX (tests). */
  readonly path?: string
  readonly concurrency?: number
}

export function createTexRenderer(options: TexRendererOptions): DiagramRenderer {
  const root = options.root
  const decksDir = options.decksDir ?? join(root, 'decks')
  const compile = options.compile ?? compileTikz
  const tokens = parseColourTokens(options.tokensCss)
  // Palettes per theme, keyed by its colours: a theme that sets nothing gets
  // exactly the default palettes (and so the same cache keys).
  const palettes = new Map<string, Record<Mode, string>>()
  const palettesFor = (colours: ReadonlyMap<string, ModeColour>): Record<Mode, string> => {
    const id = JSON.stringify([...colours].sort(([a], [b]) => a.localeCompare(b)))
    let found = palettes.get(id)
    if (found === undefined) {
      const merged = new Map(tokens)
      for (const [name, colour] of colours) merged.set(name, colour)
      found = { light: paletteTex(merged, 'light'), dark: paletteTex(merged, 'dark') }
      palettes.set(id, found)
    }
    return found
  }
  const tikzDir = join(root, 'tikz')
  const cacheDir = join(root, CACHE_DIR)
  const limit = options.concurrency ?? Math.max(1, Math.floor(availableParallelism() / 2))
  let missing: MissingTex | undefined

  return async (deck, sources, colours = new Map()) => {
    const palette = palettesFor(colours)
    const deckPreamblePath = join(decksDir, deck, DECK_PREAMBLE)
    const deckPreamble = existsSync(deckPreamblePath)
      ? {
          path: toPosix(relative(root, deckPreamblePath)),
          content: readFileSync(deckPreamblePath, 'utf8'),
        }
      : undefined
    const shared = [
      WRAPPER_VERSION,
      palette.light,
      palette.dark,
      ...folderFiles(tikzDir),
      deckPreamble?.path ?? '',
      deckPreamble?.content ?? '',
    ]

    return pool(sources, limit, async (source): Promise<DiagramOutcome> => {
      const key = createHash('sha256')
        .update(JSON.stringify([...shared, source]))
        .digest('hex')
      const files = {
        light: join(cacheDir, `${key}.light.svg`),
        dark: join(cacheDir, `${key}.dark.svg`),
      }
      if (existsSync(files.light) && existsSync(files.dark)) {
        return {
          svg: { light: readFileSync(files.light, 'utf8'), dark: readFileSync(files.dark, 'utf8') },
        }
      }

      // Checked once, at the first diagram that needs TeX: cached decks never touch it.
      missing ??=
        options.compile === undefined ? missingTex(options.path) : { programs: [], files: [] }
      if (!texComplete(missing)) {
        return {
          error: {
            file: 'block',
            message: `This diagram is not rendered yet, and rendering needs TeX: ${describeMissingTex(missing)}. Install them (see the README, "Requirements"; \`dex doctor\` checks everything), or run dex inside the engine's Nix shell (nix develop).`,
          },
        }
      }

      const rendered: Partial<Record<Mode, string>> = {}
      for (const mode of MODES) {
        const result = await compile({ source, palette: palette[mode], tikzDir, deckPreamble })
        if ('error' in result) return result
        rendered[mode] = normalise(result.svg)
      }
      mkdirSync(cacheDir, { recursive: true })
      for (const mode of MODES) writeAtomically(files[mode], rendered[mode] ?? '')
      return { svg: { light: rendered.light ?? '', dark: rendered.dark ?? '' } }
    })
  }
}

/** Drops the XML declaration and generator comment; the SVG is inlined later. */
function normalise(svg: string): string {
  return svg
    .replace(/^<\?xml[^>]*>\s*/, '')
    .replace(/^<!--[\s\S]*?-->\s*/, '')
    .trim()
}

/** Every file of the content folder's tikz/ folder, as path and content, in a stable order. */
function folderFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
    .flatMap((file) => [toPosix(relative(dir, file)), readFileSync(file, 'utf8')])
}

function writeAtomically(file: string, text: string): void {
  const temporary = `${file}.${process.pid}.tmp`
  writeFileSync(temporary, text)
  renameSync(temporary, file)
}

/** Maps `items` with at most `limit` tasks in flight, keeping order. */
async function pool<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index] as T)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function toPosix(path: string): string {
  return path.split(sep).join('/')
}
