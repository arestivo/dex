import type { Root } from 'mdast'
import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).freeze()

/** Parses slide Markdown (CommonMark + GFM + generic directives) into mdast. */
export function parseMarkdown(markdown: string): Root {
  return parser.parse(markdown)
}
