/**
 * Turns generic directives into hast-ready mdast by setting `data.hName`
 * and friends. This module defines the deck format's directive vocabulary;
 * anything not listed here is reported as an error.
 */
import type { ElementContent } from 'hast'
import type { Parent, Root, RootContent, Text } from 'mdast'
import type { ContainerDirective, LeafDirective, TextDirective } from 'mdast-util-directive'
import { SKIP, visit } from 'unist-util-visit'
import { isHandledStep } from './steps.ts'

export const CALLOUT_TONES = ['info', 'warning', 'error', 'success', 'example'] as const

type Directive = ContainerDirective | LeafDirective | TextDirective

/** What a slide needs to know about the rest of the deck. */
export interface TocEntry {
  readonly id: string
  readonly title: string
}

export interface DirectiveContext {
  readonly toc: readonly TocEntry[]
  /** Reports an error at the given 1-based line within the slide. */
  readonly error: (message: string, line: number | undefined) => void
}

/** Directive names handled elsewhere (slide declaration and slot split). */
const STRUCTURAL = new Set(['slide', 'slot'])

export function transformDirectives(tree: Root, context: DirectiveContext): void {
  visit(tree, (node, index, parent) => {
    if (!isDirective(node)) return undefined
    const line = node.position?.start.line

    if (
      node.type === 'textDirective' &&
      isBareTextDirective(node) &&
      parent &&
      index !== undefined
    ) {
      // `domain:port` or `10:am` parse as text directives; restore them as text.
      const text: Text = { type: 'text', value: `:${node.name}` }
      parent.children.splice(index, 1, text as never)
      return [SKIP, index + 1]
    }

    // Numbered (or already reported) by steps.ts.
    if (isHandledStep(node)) return undefined

    if (STRUCTURAL.has(node.name)) {
      context.error(misplacedMessage(node), line)
      return undefined
    }

    if (node.type === 'containerDirective' && isCallout(node.name)) {
      callout(node, node.name)
      return undefined
    }
    if (node.type === 'containerDirective' && node.name === 'div') {
      wrapper(node, 'div', context)
      return undefined
    }
    if (node.type === 'textDirective' && node.name === 'span') {
      wrapper(node, 'span', context)
      return undefined
    }
    if (node.type === 'leafDirective' && node.name === 'toc') {
      toc(node, context)
      return SKIP
    }

    context.error(unknownMessage(node), line)
    return undefined
  })
}

function callout(node: ContainerDirective, tone: string): void {
  const label = node.children[0]
  if (label?.type === 'paragraph' && label.data?.directiveLabel) {
    label.data = { ...label.data, hName: 'p', hProperties: { className: ['callout__title'] } }
  }
  node.data = {
    hName: 'div',
    hProperties: { className: ['callout', `callout--${tone}`], role: 'note' },
  }
}

function wrapper(
  node: ContainerDirective | TextDirective,
  tag: string,
  context: DirectiveContext,
): void {
  const { class: className, ...rest } = node.attributes ?? {}
  for (const key of Object.keys(rest)) {
    context.error(
      `Unknown attribute "${key}" on :${node.type === 'textDirective' ? '' : '::'}${node.name}. Only classes (.name) are allowed.`,
      node.position?.start.line,
    )
  }
  const classes = (className ?? '').split(/\s+/).filter(Boolean)
  if (classes.length === 0) {
    context.error(`:${tag} needs at least one class, e.g. {.small}.`, node.position?.start.line)
  }
  node.data = { hName: tag, hProperties: { className: classes } }
}

function toc(node: LeafDirective, context: DirectiveContext): void {
  if (context.toc.length === 0) {
    context.error('::toc found no slides with layout=section to list.', node.position?.start.line)
  }
  const items: ElementContent[] = context.toc.map((entry) => ({
    type: 'element',
    tagName: 'li',
    properties: {},
    children: [
      {
        type: 'element',
        tagName: 'a',
        properties: { href: `#${entry.id}` },
        children: [{ type: 'text', value: entry.title || entry.id }],
      },
    ],
  }))
  node.data = {
    hName: 'nav',
    hProperties: { className: ['toc'], ariaLabel: 'Table of contents' },
    hChildren: [{ type: 'element', tagName: 'ol', properties: {}, children: items }],
  }
}

function isDirective(node: Root | RootContent | Parent): node is Directive {
  return (
    node.type === 'containerDirective' ||
    node.type === 'leafDirective' ||
    node.type === 'textDirective'
  )
}

function isCallout(name: string): name is (typeof CALLOUT_TONES)[number] {
  return (CALLOUT_TONES as readonly string[]).includes(name)
}

function isBareTextDirective(node: TextDirective): boolean {
  return node.children.length === 0 && Object.keys(node.attributes ?? {}).length === 0
}

function misplacedMessage(node: Directive): string {
  if (node.name === 'slide') {
    return 'Only one ::slide declaration is allowed, as the first line of a slide. Did you forget a `---` separator?'
  }
  return '::slot{name=...} must be a top-level line in the slide, not nested inside other content.'
}

function unknownMessage(node: Directive): string {
  const prefix =
    node.type === 'containerDirective' ? ':::' : node.type === 'leafDirective' ? '::' : ':'
  return `Unknown directive "${prefix}${node.name}". Available: ${CALLOUT_TONES.map((t) => `:::${t}`).join(', ')}, :::div{.class}, :span[text]{.class}, :::step, :step[text], :::steps, ::toc, ::slot{name=...}.`
}
