import type { ElementContent, Root as HastRoot } from 'hast'
import { raw } from 'hast-util-raw'
import type { Root, RootContent } from 'mdast'
import { toHast } from 'mdast-util-to-hast'
import { VFile } from 'vfile'
import type { CodeHighlighter } from './highlight.ts'

/**
 * Converts mdast content to hast, parsing embedded raw HTML and
 * highlighting fenced code. `source` is the Markdown the nodes were parsed
 * from; it lets raw HTML parsing keep source positions for diagnostics.
 */
export function markdownToHast(
  children: readonly RootContent[],
  highlighter: CodeHighlighter,
  source: string,
): HastRoot {
  const mdast: Root = { type: 'root', children: [...children] }
  const tree = toHast(mdast, {
    allowDangerousHtml: true,
    handlers: {
      code(state, node) {
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
