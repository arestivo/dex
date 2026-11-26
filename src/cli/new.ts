/**
 * `dex new layout <name>`: creates a starter local layout in the content
 * folder's `layouts/<name>/` from the templates in `scaffold/layout/`.
 * Returns the exit code.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { styleText } from 'node:util'
import { type ContentLocations, ENGINE_ROOT, LAYOUTS_FOLDER } from '../core/config.ts'
import { IDENTIFIER_PATTERN } from '../core/model.ts'
import { loadWorkspaceLayouts } from '../core/workspace.ts'

export const NEW_KINDS = ['layout'] as const
const LAYOUT_SCAFFOLD = join(ENGINE_ROOT, 'scaffold', 'layout')

export function runNew(
  content: ContentLocations,
  kind: string | undefined,
  name: string | undefined,
): number {
  if (kind !== 'layout') {
    console.error(
      `${kind === undefined ? 'Missing' : `Unknown`} kind${kind ? ` "${kind}"` : ''}: use \`dex new layout <name>\`. Available: ${NEW_KINDS.join(', ')}.`,
    )
    return 1
  }
  return newLayout(content, name)
}

function newLayout(content: ContentLocations, name: string | undefined): number {
  const fail = (message: string): number => {
    console.error(styleText('red', message))
    console.error('Nothing was written.')
    return 1
  }

  if (name === undefined) return fail('Missing layout name: `dex new layout <name>`.')
  if (!IDENTIFIER_PATTERN.test(name)) {
    return fail(
      `Invalid layout name "${name}": use lowercase letters, digits and dashes, starting with a letter.`,
    )
  }
  const existing = loadWorkspaceLayouts({ root: content.root }).layouts.get(name)
  if (existing?.origin === 'built-in') {
    return fail(
      `"${name}" is a built-in layout: local layouts cannot replace built-in ones. Choose another name.`,
    )
  }
  const dir = join(content.root, LAYOUTS_FOLDER, name)
  if (existsSync(dir)) return fail(`${relative(content.root, dir)}/ already exists.`)

  mkdirSync(dir, { recursive: true })
  for (const file of readdirSync(LAYOUT_SCAFFOLD)) {
    const text = readFileSync(join(LAYOUT_SCAFFOLD, file), 'utf8').replaceAll('{{name}}', name)
    writeFileSync(join(dir, file), text)
    console.log(`${styleText('green', 'created')}  ${relative(content.root, join(dir, file))}`)
  }
  console.log(
    `\nUse it with ::slide{#id layout=${name}}. Next: fill in ${LAYOUTS_FOLDER}/${name}/layout.md (dex check reminds you), then edit the template and style. See dex docs layouts.`,
  )
  return 0
}
