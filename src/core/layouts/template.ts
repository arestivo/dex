import type { ElementContent, Properties, RootContent } from 'hast'
import { fromHtml } from 'hast-util-from-html'

/** Variables a template may reference as `{{name}}`. */
export const TEMPLATE_VARIABLES = [
  'deck.title',
  'deck.subtitle',
  'deck.author.name',
  'deck.author.url',
  'deck.lang',
  'slide.id',
  'slide.number',
  'slide.total',
] as const

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]
export type TemplateValues = Readonly<Record<TemplateVariable, string>>

const VARIABLE = /\{\{\s*([\w.]+)\s*\}\}/g
const DEFAULT_SLOT = ''

export interface ParsedTemplate {
  readonly children: ElementContent[]
  readonly slots: Set<string>
  /** Variable names used but not in {@link TEMPLATE_VARIABLES}. */
  readonly unknownVariables: Set<string>
}

/** Parses a layout template (an HTML fragment), dropping comments. */
export function parseTemplate(html: string): ParsedTemplate {
  const root = fromHtml(html, { fragment: true })
  const children = stripComments(root.children)
  const slots = new Set<string>()
  const unknownVariables = new Set<string>()

  walk(children, (node) => {
    if (node.type === 'element' && node.tagName === 'slot') slots.add(slotName(node.properties))
    for (const text of stringsOf(node)) {
      for (const [, name] of text.matchAll(VARIABLE)) {
        if (name !== undefined && !isTemplateVariable(name)) unknownVariables.add(name)
      }
    }
  })

  return { children, slots, unknownVariables }
}

/**
 * Returns a filled copy of `template`: variables are interpolated (in the
 * template only, never in slide content) and each `<slot>` is replaced by its
 * assigned content, or by its own children as fallback.
 */
export function fillTemplate(
  template: readonly ElementContent[],
  content: ReadonlyMap<string, readonly ElementContent[]>,
  values: TemplateValues,
): ElementContent[] {
  const fill = (nodes: readonly ElementContent[]): ElementContent[] =>
    nodes.flatMap((node): ElementContent[] => {
      if (node.type === 'text') return [{ ...node, value: interpolate(node.value, values) }]
      if (node.type !== 'element') return [structuredClone(node)]
      if (node.tagName === 'slot') {
        const assigned = content.get(slotName(node.properties))
        return assigned === undefined ? fill(node.children) : [...assigned]
      }
      return [
        {
          ...node,
          properties: interpolateProperties(node.properties, values),
          children: fill(node.children),
        },
      ]
    })

  return fill(template)
}

export function slotName(properties: Properties): string {
  return typeof properties.name === 'string' ? properties.name : DEFAULT_SLOT
}

function isTemplateVariable(name: string): name is TemplateVariable {
  return (TEMPLATE_VARIABLES as readonly string[]).includes(name)
}

function interpolate(text: string, values: TemplateValues): string {
  return text.replace(VARIABLE, (match, name: string) =>
    isTemplateVariable(name) ? values[name] : match,
  )
}

function interpolateProperties(properties: Properties, values: TemplateValues): Properties {
  const out: Properties = {}
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string') out[key] = interpolate(value, values)
    else if (Array.isArray(value))
      out[key] = value.map((v) => (typeof v === 'string' ? interpolate(v, values) : v))
    else out[key] = value
  }
  return out
}

function stripComments(nodes: readonly RootContent[]): ElementContent[] {
  return nodes.flatMap((node): ElementContent[] => {
    if (node.type === 'comment' || node.type === 'doctype') return []
    if (node.type === 'element') return [{ ...node, children: stripComments(node.children) }]
    return [node as ElementContent]
  })
}

function walk(nodes: readonly ElementContent[], visitor: (node: ElementContent) => void): void {
  for (const node of nodes) {
    visitor(node)
    if (node.type === 'element') walk(node.children, visitor)
  }
}

function stringsOf(node: ElementContent): string[] {
  if (node.type === 'text') return [node.value]
  if (node.type !== 'element') return []
  return Object.values(node.properties).flatMap((value) =>
    typeof value === 'string' ? [value] : Array.isArray(value) ? value.map(String) : [],
  )
}
