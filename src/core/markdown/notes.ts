/**
 * Speaker notes: one `:::notes` block at a slide's top level. It is taken out
 * of the slide before slots are assigned, so it never reaches the layout and
 * may sit anywhere in the slide. Pure: mdast in, mdast out.
 */
import type { RootContent } from 'mdast'
import type { ContainerDirective } from 'mdast-util-directive'
import { SKIP, visit } from 'unist-util-visit'

export const NOTES_DIRECTIVE = 'notes'

export interface ExtractedNotes {
  /** The notes' content, or undefined when the slide has none. */
  readonly notes: readonly RootContent[] | undefined
  /** The slide's content without notes. */
  readonly content: RootContent[]
}

type ReportError = (message: string, line: number | undefined) => void

const isNotes = (node: RootContent): node is ContainerDirective =>
  node.type === 'containerDirective' && node.name === NOTES_DIRECTIVE

/** Separates a slide's notes from its content, reporting misplaced or repeated notes. */
export function extractNotes(children: readonly RootContent[], error: ReportError): ExtractedNotes {
  let notes: RootContent[] | undefined
  const content: RootContent[] = []
  for (const node of children) {
    if (!isNotes(node)) {
      content.push(node)
      continue
    }
    if (notes !== undefined) {
      error(
        'A slide has at most one `:::notes` block: merge this one into the first.',
        node.position?.start.line,
      )
      continue
    }
    notes = node.children
  }

  // Notes inside another block (a callout, a div, another notes block) are misplaced.
  const nested = (node: RootContent) =>
    visit(node, (inner, index, parent) => {
      if (inner === node || !isNotes(inner as RootContent)) return undefined
      error(
        'Speaker notes go at the top level of a slide: move this `:::notes` block out of the block that contains it.',
        inner.position?.start.line,
      )
      if (parent !== undefined && index !== undefined) {
        parent.children.splice(index, 1)
        return [SKIP, index]
      }
      return undefined
    })
  for (const node of content) nested(node)
  for (const node of notes ?? []) nested(node)

  return { notes, content }
}
