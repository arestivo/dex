/**
 * `dex docs [topic]`: prints the reference documentation. Topics come from
 * the installed engine (never from copies in content folders); `layouts` is
 * generated for the content folder, so it lists its local layouts too.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type ContentLocations, ENGINE_ROOT } from '../core/config.ts'
import type { Layout } from '../core/model.ts'
import { loadWorkspaceLayouts } from '../core/workspace.ts'

interface Topic {
  readonly description: string
  readonly render: (content: ContentLocations) => string
}

const engineDoc = (file: string): string => readFileSync(join(ENGINE_ROOT, 'docs', file), 'utf8')

export const DOC_TOPICS = {
  authoring: {
    description: 'The deck format: files, front matter, slides, ids, directives, utilities, fit.',
    render: () => engineDoc('authoring.md'),
  },
  layouts: {
    description: 'The layouts available in this folder (built-in and local), and how to make one.',
    render: renderLayoutsReference,
  },
} as const satisfies Record<string, Topic>

export type DocTopic = keyof typeof DOC_TOPICS
export const DEFAULT_TOPIC: DocTopic = 'authoring'

export function runDocs(
  content: ContentLocations,
  topic: string | undefined,
  list: boolean,
): number {
  if (list) {
    const width = Math.max(...Object.keys(DOC_TOPICS).map((name) => name.length))
    for (const [name, { description }] of Object.entries(DOC_TOPICS)) {
      console.log(`${name.padEnd(width)}  ${description}`)
    }
    return 0
  }

  const name = topic ?? DEFAULT_TOPIC
  if (!isTopic(name)) {
    console.error(`Unknown docs topic "${name}". Available: ${Object.keys(DOC_TOPICS).join(', ')}.`)
    return 1
  }
  process.stdout.write(DOC_TOPICS[name].render(content))
  return 0
}

function isTopic(name: string): name is DocTopic {
  return Object.hasOwn(DOC_TOPICS, name)
}

/** The `layouts` topic: this folder's layouts, then the guide to making one. */
export function renderLayoutsReference(content: ContentLocations): string {
  const { layouts } = loadWorkspaceLayouts({ root: content.root })
  const ordered = [...layouts.values()].sort(
    (a, b) =>
      (a.origin === b.origin ? 0 : a.origin === 'built-in' ? -1 : 1) ||
      a.name.localeCompare(b.name),
  )

  const table = [
    '| Layout | Origin | Description | Slots |',
    '| --- | --- | --- | --- |',
    ...ordered.map(
      (layout) =>
        `| \`${layout.name}\` | ${layout.origin} | ${cell(layout.description) || '_undocumented_'} | ${formatSlots(layout)} |`,
    ),
  ].join('\n')

  const sections = ordered.map((layout) => {
    const notes =
      layout.notes === undefined
        ? '_No `layout.md`: undocumented. Read its `template.html` to see how it works._'
        : demoteHeadings(layout.notes, 1) || '_No usage notes._'
    return `## \`${layout.name}\` (${layout.origin})\n\n${layout.description ? `${layout.description}\n\n` : ''}Slots: ${formatSlots(layout)}.\n\n${notes}`
  })

  return `# Layouts

The layouts available in this content folder: the built-in ones, plus local ones from its \`layouts/\` folder. A slide picks one with \`::slide{#id layout=<name>}\`; without \`layout=\` it uses \`default\`. How to fill slots is explained in \`dex docs\` (section "Layouts and slots").

${table}

${sections.join('\n\n')}

${demoteHeadings(engineDoc('layouts.md'), 1)}`
}

function formatSlots(layout: Layout): string {
  const slots = [...layout.slots]
  if (slots.length === 0) return 'none'
  return slots.map((slot) => (slot === '' ? 'default' : `\`${slot}\``)).join(', ')
}

function cell(text: string): string {
  return text.replaceAll('|', '\\|').replaceAll('\n', ' ')
}

/** Adds `levels` `#` to every Markdown heading outside fenced code. */
export function demoteHeadings(markdown: string, levels: number): string {
  let fence: string | undefined
  return markdown
    .split('\n')
    .map((line) => {
      const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1]
      if (marker !== undefined) {
        if (fence === undefined) fence = marker
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = undefined
        return line
      }
      return fence === undefined && /^#{1,6} /.test(line) ? `${'#'.repeat(levels)}${line}` : line
    })
    .join('\n')
    .trim()
}
