/**
 * Steps: parts of a slide revealed one at a time while presenting.
 * `:::step` wraps blocks, `:step[text]` wraps inline content and `:::steps`
 * makes each item of the list it wraps a step. They are numbered here, on the
 * slide's whole content before slots are assigned, so the reveal order is the
 * source order whatever slot (and template position) holds each step. The
 * viewer only toggles `data-revealed` on the numbered elements. Pure: mdast in,
 * mdast out.
 */
import type { List, Parent, RootContent } from 'mdast'
import type { ContainerDirective, TextDirective } from 'mdast-util-directive'
import { SKIP, visit } from 'unist-util-visit'

export const STEP_DIRECTIVE = 'step'
export const STEPS_DIRECTIVE = 'steps'
export const STEP_CLASS = 'step'

type ReportError = (message: string, line: number | undefined) => void
type StepNode = ContainerDirective | TextDirective

function isStep(node: { type: string; name?: string }): node is StepNode {
  if (node.type === 'containerDirective') {
    return node.name === STEP_DIRECTIVE || node.name === STEPS_DIRECTIVE
  }
  return node.type === 'textDirective' && node.name === STEP_DIRECTIVE
}

/** `next:step` in prose parses as a text directive; it is text, not a step. */
function isBare(node: StepNode): boolean {
  return (
    node.type === 'textDirective' &&
    node.children.length === 0 &&
    Object.keys(node.attributes ?? {}).length === 0
  )
}

const stepProperties = (number: number) => ({ className: [STEP_CLASS], dataStep: number })

/**
 * Numbers the steps of a slide in source order and reports misplaced ones.
 * Returns how many steps the slide has.
 */
export function numberSteps(children: RootContent[], error: ReportError): number {
  let count = 0
  const root: Parent = { type: 'root', children } as Parent

  const walk = (parent: Parent, insideStep: boolean): void => {
    for (let index = 0; index < parent.children.length; index++) {
      const node = parent.children[index] as RootContent
      if (!isStep(node) || isBare(node)) {
        if ('children' in node) walk(node as Parent, insideStep)
        continue
      }
      const line = node.position?.start.line
      if (insideStep) {
        error("Steps can't be nested: remove this step, or the step around it.", line)
        markHandled(node)
        continue
      }
      if (Object.keys(node.attributes ?? {}).length > 0) {
        error(
          node.type === 'textDirective'
            ? 'Steps take no attributes: put a `:span[text]{.class}` inside the step instead.'
            : 'Steps take no attributes: put a `:::div{.class}` inside the step instead.',
          line,
        )
      }
      if (node.name === STEPS_DIRECTIVE) {
        const list = node.children[0]
        if (node.children.length !== 1 || list?.type !== 'list') {
          error(
            '`:::steps` wraps one list (each item becomes a step): use `:::step` for other content.',
            line,
          )
          markHandled(node)
          continue
        }
        for (const item of (list as List).children) {
          count += 1
          item.data = { ...item.data, hProperties: stepProperties(count) }
          walk(item, true)
        }
        // The list takes the block's place: `:::steps` leaves no wrapper.
        parent.children.splice(index, 1, list)
        continue
      }
      count += 1
      node.data = {
        hName: node.type === 'textDirective' ? 'span' : 'div',
        hProperties: stepProperties(count),
      }
      walk(node, true)
    }
  }
  walk(root, false)
  return count
}

/** Reports every step in speaker notes, where nothing is revealed. */
export function forbidSteps(children: RootContent[], error: ReportError): void {
  for (const node of children) {
    visit(node, (inner) => {
      if (!isStep(inner) || isBare(inner)) return undefined
      error("Steps don't work in speaker notes: remove this step.", inner.position?.start.line)
      markHandled(inner)
      return SKIP
    })
  }
}

/** Tells the directive transform an already-reported step is not an unknown directive. */
function markHandled(node: StepNode): void {
  node.data = { hName: node.type === 'textDirective' ? 'span' : 'div' }
}

/** Whether the directive transform should leave this node alone. */
export function isHandledStep(node: { type: string; name?: string; data?: unknown }): boolean {
  return isStep(node) && node.data !== undefined
}
