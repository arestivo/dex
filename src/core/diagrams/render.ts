/**
 * Renders a deck's tikz blocks in both themes, through a cache in the
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
import { DIAGRAM_THEMES, type DiagramTheme, paletteTex, parseColourTokens } from './palette.ts'
import { compileTikz, type TexError, type TexJob, type TexResult } from './tex.ts'
import { missingTexPrograms } from './toolchain.ts'
import { WRAPPER_VERSION } from './wrapper.ts'

export const CACHE_DIR = join('.dex', 'cache', 'diagrams')
export const DECK_PREAMBLE = 'tikz.tex'

export interface DiagramRenderings {
  readonly light: string
  readonly dark: string
}

/** A rendered diagram, or why it could not be rendered. */
export type DiagramOutcome = { readonly svg: DiagramRenderings } | { readonly error: TexError }

/** Renders every block of one deck (results in block order). */
export type DiagramRenderer = (
  deck: string,
  sources: readonly string[],
) => Promise<DiagramOutcome[]>

export interface TexRendererOptions {
  /** Content folder. */
  readonly root: string
  /** Decks folder (default `<root>/decks`). */
  readonly decksDir?: string
  /** The CSS tokens the palettes come from. */
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
  const palettes: Record<DiagramTheme, string> = {
    light: paletteTex(tokens, 'light'),
    dark: paletteTex(tokens, 'dark'),
  }
  const tikzDir = join(root, 'tikz')
  const cacheDir = join(root, CACHE_DIR)
  const limit = options.concurrency ?? Math.max(1, Math.floor(availableParallelism() / 2))
  let missing: string[] | undefined

  return async (deck, sources) => {
    const deckPreamblePath = join(decksDir, deck, DECK_PREAMBLE)
    const deckPreamble = existsSync(deckPreamblePath)
      ? {
          path: toPosix(relative(root, deckPreamblePath)),
          content: readFileSync(deckPreamblePath, 'utf8'),
        }
      : undefined
    const shared = [
      WRAPPER_VERSION,
      palettes.light,
      palettes.dark,
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

      missing ??= missingTexPrograms(options.path)
      if (options.compile === undefined && missing.length > 0) {
        return {
          error: {
            file: 'block',
            message: `This diagram is not rendered yet, and rendering needs TeX: ${missing.join(', ')} not found. Install them (see the README, "Requirements") or use the Nix shell (nix develop).`,
          },
        }
      }

      const rendered: Partial<Record<DiagramTheme, string>> = {}
      for (const theme of DIAGRAM_THEMES) {
        const result = await compile({ source, palette: palettes[theme], tikzDir, deckPreamble })
        if ('error' in result) return result
        rendered[theme] = normalise(result.svg)
      }
      mkdirSync(cacheDir, { recursive: true })
      for (const theme of DIAGRAM_THEMES) writeAtomically(files[theme], rendered[theme] ?? '')
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
