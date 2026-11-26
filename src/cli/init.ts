/**
 * `dex init`: prepares a content folder for people and agents (see
 * scaffold.ts). Prints one line per path. Returns the exit code.
 */
import { styleText } from 'node:util'
import type { ContentLocations } from '../core/config.ts'
import { applyScaffold, type ChangeKind, planScaffold } from './scaffold.ts'

const LABELS: Record<ChangeKind, { text: string; color: Parameters<typeof styleText>[0] }> = {
  create: { text: 'created', color: 'green' },
  update: { text: 'updated', color: 'cyan' },
  unchanged: { text: 'unchanged', color: 'gray' },
  kept: { text: 'kept', color: 'yellow' },
  skipped: { text: 'skipped', color: 'yellow' },
}

export function runInit(content: ContentLocations): number {
  const plan = planScaffold(content)
  if (plan.errors.length > 0) {
    for (const error of plan.errors) console.error(styleText('red', error))
    console.error('Nothing was written.')
    return 1
  }

  applyScaffold(plan)
  const width = Math.max(...Object.values(LABELS).map((label) => label.text.length))
  for (const change of plan.changes) {
    const label = LABELS[change.kind]
    const detail = change.detail ? ` (${change.detail})` : ''
    console.log(`${styleText(label.color, label.text.padEnd(width))}  ${change.path}${detail}`)
  }
  console.log(`\n${content.root} is ready. Agents: read AGENTS.md. Deck format: dex docs.`)
  return 0
}
