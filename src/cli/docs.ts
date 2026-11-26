/**
 * `dex docs [topic]`: prints the engine's reference documentation, so
 * content folders never hold a copy that could go stale.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ENGINE_ROOT } from '../core/config.ts'

export const DOC_TOPICS = {
  authoring: {
    file: 'docs/authoring.md',
    description: 'The deck format: files, front matter, slides, ids, directives, utilities, fit.',
  },
  layouts: {
    file: 'docs/layouts.md',
    description: 'The available layouts, their slots, and how layouts are made.',
  },
} as const satisfies Record<string, { file: string; description: string }>

export type DocTopic = keyof typeof DOC_TOPICS
export const DEFAULT_TOPIC: DocTopic = 'authoring'

export function runDocs(topic: string | undefined, list: boolean): number {
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
  process.stdout.write(readFileSync(join(ENGINE_ROOT, DOC_TOPICS[name].file), 'utf8'))
  return 0
}

function isTopic(name: string): name is DocTopic {
  return Object.hasOwn(DOC_TOPICS, name)
}
