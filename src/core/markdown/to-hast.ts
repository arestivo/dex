import type { Element, ElementContent, Root as HastRoot } from 'hast'
import { raw } from 'hast-util-raw'
import type { Code, Root, RootContent } from 'mdast'
import { toHast } from 'mdast-util-to-hast'
import { VFile } from 'vfile'
import { isDiagramLanguage } from '../diagrams/block.ts'
import type { CodeHighlighter } from './highlight.ts'

/**
 * Converts mdast content to hast, parsing embedded raw HTML and
 * highlighting fenced code. `source` is the Markdown the nodes were parsed
 * from; it lets raw HTML parsing keep source positions for diagnostics.
 * Diagram blocks are replaced by their prepared figures (`diagrams`).
 */
export function markdownToHast(
  children: readonly RootContent[],
  highlighter: CodeHighlighter,
  source: string,
  diagrams: ReadonlyMap<Code, Element> = new Map(),
): HastRoot {
  const mdast: Root = { type: 'root', children: [...children] }
  const tree = toHast(mdast, {
    allowDangerousHtml: true,
    handlers: {
      code(state, node) {
        if (isDiagramLanguage(node.lang)) {
          // Without a figure the deck already has an error for this block.
          const figure = diagrams.get(node) ?? {
            type: 'element' as const,
            tagName: 'figure',
            properties: { className: ['diagram', 'diagram--missing'] },
            children: [],
          }
          state.patch(node, figure)
          return figure
        }
        const pre = highlighter.highlight(node.value, node.lang)
        state.patch(node, pre)
        return pre
      },
    },
  })
  const root: HastRoot = tree.type === 'root' ? tree : { type: 'root', children: [tree as never] }
  return raw(root, { file: new VFile(source) }) as HastRoot
}

/** The element-level children of a hast root. */
export function contentOf(root: HastRoot): ElementContent[] {
  return root.children.filter((node): node is ElementContent => node.type !== 'doctype')
}
