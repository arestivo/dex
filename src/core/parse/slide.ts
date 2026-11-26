import GithubSlugger from 'github-slugger'
import type { Root, RootContent } from 'mdast'
import type { LeafDirective } from 'mdast-util-directive'
import { toString as mdastToString } from 'mdast-util-to-string'
import type { DiagnosticBag } from '../diagnostics.ts'
import { parseMarkdown } from '../markdown/parse.ts'
import { DEFAULT_LAYOUT, IDENTIFIER_PATTERN } from '../model.ts'
import type { SlideSource } from './split.ts'

const SLIDE_ATTRIBUTES = new Set(['id', 'class', 'layout'])

/** A slide after its declaration has been read, before rendering. */
export interface ParsedSlide {
  readonly id: string | undefined
  readonly layout: string
  readonly classes: readonly string[]
  /** Text of the first heading, or `''`. */
  readonly title: string
  /** 1-based line of the slide declaration in the deck file. */
  readonly line: number
  /** Add to a node's (chunk-relative) line to get its line in the deck file. */
  readonly lineOffset: number
  /** The slide's Markdown source (positions in `tree` refer to it). */
  readonly markdown: string
  /** Slide content without the `::slide` declaration. */
  readonly tree: Root
}

/**
 * Parses one slide and validates its `::slide{#id layout=... .class}`
 * declaration. Id uniqueness is checked at deck level.
 */
export function parseSlide(
  source: SlideSource,
  number: number,
  file: string,
  diagnostics: DiagnosticBag,
): ParsedSlide {
  const tree = parseMarkdown(source.markdown)
  const title = firstHeadingText(tree)
  const lineOffset = source.line - 1
  const lineOf = (node: RootContent | undefined): number =>
    lineOffset + (node?.position?.start.line ?? 1)

  const first = tree.children[0]
  if (!isSlideDirective(first)) {
    const suggestion = suggestId(title, number)
    diagnostics.error(
      file,
      `Slide ${number} must start with a slide declaration, e.g. \`::slide{#${suggestion}}\`.`,
      { line: lineOf(first) },
    )
    return {
      id: undefined,
      layout: DEFAULT_LAYOUT,
      classes: [],
      title,
      line: lineOf(first),
      lineOffset,
      markdown: source.markdown,
      tree,
    }
  }

  tree.children.shift()
  const line = lineOf(first)
  const attributes = first.attributes ?? {}
  const id = attributes.id ?? undefined

  for (const key of Object.keys(attributes)) {
    if (!SLIDE_ATTRIBUTES.has(key)) {
      diagnostics.error(
        file,
        `Unknown slide attribute "${key}". Allowed: #id, .class and layout=<name>.`,
        { line, slideId: id },
      )
    }
  }
  if (first.children.length > 0) {
    diagnostics.error(file, 'The slide declaration takes no label: remove the `[...]` part.', {
      line,
      slideId: id,
    })
  }

  if (id === undefined || id === '') {
    diagnostics.error(
      file,
      `Slide ${number} has no id. Add one, e.g. \`::slide{#${suggestId(title, number)}}\`.`,
      { line },
    )
  } else if (!IDENTIFIER_PATTERN.test(id)) {
    diagnostics.error(
      file,
      `Invalid slide id "${id}": ids must match ${IDENTIFIER_PATTERN} (lowercase letters, digits and dashes, starting with a letter).`,
      { line, slideId: id },
    )
  }

  const layout = attributes.layout ?? DEFAULT_LAYOUT
  const classes = (attributes.class ?? '').split(/\s+/).filter(Boolean)

  return {
    id: id || undefined,
    layout,
    classes,
    title,
    line,
    lineOffset,
    markdown: source.markdown,
    tree,
  }
}

function isSlideDirective(node: RootContent | undefined): node is LeafDirective {
  return node?.type === 'leafDirective' && node.name === 'slide'
}

function firstHeadingText(tree: Root): string {
  const heading = tree.children.find((node) => node.type === 'heading')
  return heading === undefined ? '' : mdastToString(heading).trim()
}

function suggestId(title: string, number: number): string {
  const slug = new GithubSlugger().slug(title).replace(/^[^a-z]+/, '')
  return slug === '' ? `slide-${number}` : slug
}
