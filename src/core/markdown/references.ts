import { posix } from 'node:path'
import type { Root } from 'hast'
import { visit } from 'unist-util-visit'

/** Attributes whose values are URLs we resolve against the deck folder. */
const URL_ATTRIBUTES = ['src', 'href', 'poster', 'data'] as const
const SCHEME = /^[a-z][a-z0-9+.-]*:/i

export interface ReferenceContext {
  readonly slideIds: ReadonlySet<string>
  readonly assetExists: (path: string) => boolean
  readonly error: (message: string, line: number | undefined) => void
  readonly warn: (message: string, line: number | undefined) => void
}

/**
 * Validates internal slide links and relative asset references in a slide,
 * returning the asset paths (relative to the deck folder) it uses.
 */
export function collectReferences(tree: Root, context: ReferenceContext): Set<string> {
  const assets = new Set<string>()

  visit(tree, 'element', (node) => {
    const line = node.position?.start.line
    for (const attribute of URL_ATTRIBUTES) {
      const value = node.properties[attribute]
      if (typeof value !== 'string' || value === '') continue

      if (value.startsWith('#')) {
        checkSlideLink(value.slice(1), line, context)
        continue
      }
      if (SCHEME.test(value) || value.startsWith('//')) continue
      if (value.startsWith('/')) {
        context.warn(
          `Root-relative URL "${value}" will break when the site is served from a sub-path. Use a path relative to the deck folder.`,
          line,
        )
        continue
      }

      const asset = resolveAsset(value)
      if (asset === undefined) {
        context.error(
          `"${value}" points outside the deck folder. Copy the file into assets/.`,
          line,
        )
      } else if (!context.assetExists(asset)) {
        context.error(`Missing file "${asset}" (referenced as "${value}").`, line)
      } else {
        assets.add(asset)
      }
    }
  })

  return assets
}

function checkSlideLink(id: string, line: number | undefined, context: ReferenceContext): void {
  if (id === '') return
  if (!context.slideIds.has(decodeURIComponent(id))) {
    context.error(`Link to "#${id}" does not match any slide id in this deck.`, line)
  }
}

/** Normalises a relative URL to a deck-relative file path, or `undefined` if it escapes. */
function resolveAsset(url: string): string | undefined {
  const path = decodeURI(url.split(/[?#]/, 1)[0] ?? '')
  const normalized = posix.normalize(path)
  if (normalized.startsWith('..') || posix.isAbsolute(normalized)) return undefined
  return normalized
}
