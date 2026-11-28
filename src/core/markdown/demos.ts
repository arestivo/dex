/**
 * Live demos: a `:::demo` holds an `html` code block and an optional `css`
 * one. The slide shows the code, and renders the result from that same code
 * inside a declarative shadow root, so the demo's CSS can't style the slide and
 * the slide's CSS can't style the demo (only inherited properties cross). The
 * browser's HTML parser attaches the shadow root, so results need no script,
 * print, and work without JavaScript. `shadowrootclonable` keeps them in the
 * presenter's cloned slides.
 *
 * Runs on a slide's whole content before slots are assigned: `::demo-result`
 * may place the result in another slot, or inside a step. Pure: mdast in,
 * mdast out.
 */
import type { Element, ElementContent } from 'hast'
import { fromHtml } from 'hast-util-from-html'
import type { Code, Parent, RootContent } from 'mdast'
import type { ContainerDirective, LeafDirective } from 'mdast-util-directive'
import { SKIP, visit } from 'unist-util-visit'

export const DEMO_DIRECTIVE = 'demo'
export const DEMO_RESULT_DIRECTIVE = 'demo-result'

type ReportError = (message: string, line: number | undefined) => void

const isDemo = (node: { type: string; name?: string }): node is ContainerDirective =>
  node.type === 'containerDirective' && node.name === DEMO_DIRECTIVE
const isResult = (node: { type: string; name?: string }): node is LeafDirective =>
  node.type === 'leafDirective' && node.name === DEMO_RESULT_DIRECTIVE

interface Found<T> {
  readonly node: T
  readonly parent: Parent
}

/** Checks the slide's demos, renders their results and places them. */
export function renderDemos(children: RootContent[], error: ReportError): void {
  const root = { type: 'root', children } as Parent
  const demos: Found<ContainerDirective>[] = []
  const results: Found<LeafDirective>[] = []

  visit(root, (node, _index, parent) => {
    if (parent === undefined) return undefined
    if (isResult(node)) results.push({ node, parent })
    if (!isDemo(node)) return undefined
    demos.push({ node, parent })
    // A demo inside a demo is reported, not rendered.
    visit(node, (inner) => {
      if (inner === node || !isDemo(inner)) return undefined
      error("Demos can't be nested: move this `:::demo` out of the one around it.", line(inner))
      markHandled(inner)
      return SKIP
    })
    return SKIP
  })

  const rendered = demos.map(({ node, parent }) => ({ parent, node, result: build(node, error) }))

  for (const [index, { node }] of results.entries()) {
    if (index > 0) {
      error('A slide has at most one `::demo-result`: remove this one.', line(node))
    } else if (demos.length === 0) {
      error(
        "`::demo-result` places the result of the slide's `:::demo`, and this slide has none: add a demo, or remove this line.",
        line(node),
      )
    } else if (demos.length > 1) {
      error(
        '`::demo-result` only works on a slide with one `:::demo`: remove it to show each result after its code, or split the slide.',
        line(node),
      )
    }
    markHandled(node)
  }

  const placed = results.length === 1 && demos.length === 1 ? results[0] : undefined
  for (const { node, parent, result } of rendered) {
    if (result === undefined) continue
    const target = placed ?? { node, parent }
    const at = target.parent.children.indexOf(target.node as never)
    if (placed === undefined) target.parent.children.splice(at + 1, 0, result as never)
    else target.parent.children.splice(at, 1, result as never)
  }
}

/** Reports every demo in speaker notes, where nothing is rendered. */
export function forbidDemos(children: RootContent[], error: ReportError): void {
  for (const node of children) {
    visit(node, (inner) => {
      if (!isDemo(inner) && !isResult(inner)) return undefined
      error(
        "Demos don't work in speaker notes: move this out of the `:::notes` block.",
        line(inner),
      )
      markHandled(inner)
      return SKIP
    })
  }
}

/**
 * Checks a demo, turns it into a `div.demo` holding its code, and returns the
 * result node, or undefined when the demo has errors.
 */
function build(demo: ContainerDirective, error: ReportError): RootContent | undefined {
  let ok = true
  const fail = (message: string, at: number | undefined) => {
    error(message, at)
    ok = false
  }
  if (Object.keys(demo.attributes ?? {}).length > 0) {
    fail(
      'A `:::demo` takes no attributes: style its result with the demo’s own ```css block.',
      line(demo),
    )
  }
  const blocks: Partial<Record<'html' | 'css', Code>> = {}
  let nested = false
  for (const child of demo.children) {
    // Already reported as nested: one error is enough.
    if (isDemo(child)) {
      nested = true
      ok = false
      continue
    }
    const lang = child.type === 'code' ? child.lang : undefined
    if (child.type !== 'code' || (lang !== 'html' && lang !== 'css')) {
      fail(
        'A `:::demo` holds only an ```html block and an optional ```css block: move this out of the demo.',
        line(child),
      )
      continue
    }
    if (blocks[lang] !== undefined) {
      fail(`A \`:::demo\` has one \`\`\`${lang} block: merge this one into the first.`, line(child))
      continue
    }
    blocks[lang] = child
  }
  if (blocks.html === undefined && !nested) {
    fail('A `:::demo` needs an ```html block: the HTML whose result it shows.', line(demo))
  }
  markHandled(demo, ['demo'])
  if (!ok || blocks.html === undefined) return undefined
  return resultNode(blocks.html.value, blocks.css?.value)
}

/** `div.demo-result` with the declarative shadow root holding the demo. */
function resultNode(html: string, css: string | undefined): RootContent {
  const style = (text: string): Element => ({
    type: 'element',
    tagName: 'style',
    properties: {},
    children: [{ type: 'text', value: text }],
  })
  const content: ElementContent[] = [
    style(':host{display:block}'),
    ...(css === undefined ? [] : [style(css)]),
    ...(fromHtml(html, { fragment: true }).children as ElementContent[]),
  ]
  const template: Element = {
    type: 'element',
    tagName: 'template',
    // Literal attribute names: HTML's parser attaches the shadow root.
    properties: { shadowrootmode: 'open', shadowrootclonable: true },
    // As children, not `content`: the raw-HTML pass re-parses the slide and
    // moves a template's children into its content (it ignores `content`).
    children: content,
  }
  const node: ContainerDirective = {
    type: 'containerDirective',
    name: DEMO_RESULT_DIRECTIVE,
    children: [],
    data: { hName: 'div', hProperties: { className: ['demo-result'] }, hChildren: [template] },
  }
  return node
}

/** Tells the directive transform this node is handled (or already reported). */
function markHandled(node: ContainerDirective | LeafDirective, className?: string[]): void {
  node.data = { hName: 'div', ...(className === undefined ? {} : { hProperties: { className } }) }
}

/** Whether the directive transform should leave this node alone. */
export function isHandledDemo(node: { type: string; name?: string; data?: unknown }): boolean {
  return (isDemo(node) || isResult(node) || isResultNode(node)) && node.data !== undefined
}

function isResultNode(node: { type: string; name?: string }): boolean {
  return node.type === 'containerDirective' && node.name === DEMO_RESULT_DIRECTIVE
}

function line(node: { position?: { start: { line: number } } | undefined }): number | undefined {
  return node.position?.start.line
}
