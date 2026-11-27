/**
 * `dex new layout <name> [--deck <slug>]`: creates a starter layout from the
 * templates in `scaffold/layout/`: a local layout in the content folder's
 * `layouts/<name>/`, or, with `--deck`, a deck layout in
 * `decks/<slug>/layouts/<name>/`. Returns the exit code.
 *
 * `dex new theme <name>`: creates a local colour theme in `themes/<name>/`,
 * its `theme.css` listing every colour token at its default value.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { styleText } from 'node:util'
import {
  type ContentLocations,
  ENGINE_ROOT,
  LAYOUTS_FOLDER,
  THEMES_FOLDER,
} from '../core/config.ts'
import { DiagnosticBag } from '../core/diagnostics.ts'
import { IDENTIFIER_PATTERN } from '../core/model.ts'
import { THEME_FILE } from '../core/themes/load.ts'
import type { TokenDefault } from '../core/themes/parse.ts'
import {
  type DeckLocation,
  engineTokens,
  findDecks,
  loadWorkspaceLayouts,
  loadWorkspaceThemes,
} from '../core/workspace.ts'

export const NEW_KINDS = ['layout', 'theme'] as const
const LAYOUT_SCAFFOLD = join(ENGINE_ROOT, 'scaffold', 'layout')
const THEME_SCAFFOLD = join(ENGINE_ROOT, 'scaffold', 'theme')

export function runNew(
  content: ContentLocations,
  kind: string | undefined,
  name: string | undefined,
  deck?: string,
): number {
  if (kind === 'theme') return newTheme(content, name)
  if (kind !== 'layout') {
    console.error(
      `${kind === undefined ? 'Missing' : `Unknown`} kind${kind ? ` "${kind}"` : ''}: use \`dex new layout <name>\` or \`dex new theme <name>\`. Available: ${NEW_KINDS.join(', ')}.`,
    )
    return 1
  }
  return newLayout(content, name, deck)
}

function newLayout(content: ContentLocations, name: string | undefined, slug?: string): number {
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
  const workspace = { root: content.root, decksDir: content.decksDir }
  const decks = findDecks(workspace, new DiagnosticBag())
  const deck = slug === undefined ? undefined : decks.find((d) => d.slug === slug)
  if (slug !== undefined && deck === undefined) {
    return fail(
      `No deck "${slug}" (expected ${relative(content.root, join(content.decksDir, slug, 'slides.md'))}).`,
    )
  }

  const kind = deck === undefined ? 'local layouts' : 'deck layouts'
  const existing = loadWorkspaceLayouts(workspace).layouts.get(name)
  if (existing?.origin === 'built-in') {
    return fail(
      `"${name}" is a built-in layout: ${kind} cannot replace built-in ones. Choose another name.`,
    )
  }
  if (existing?.origin === 'local' && deck !== undefined) {
    return fail(
      `"${name}" is a local layout (${LAYOUTS_FOLDER}/${name}/): deck layouts cannot replace local ones. Choose another name.`,
    )
  }
  if (deck === undefined) {
    // A local layout with this name would make these decks' own layouts errors.
    const users = decks.filter((d) => existsSync(deckLayoutDir(d, name)))
    if (users.length > 0) {
      return fail(
        `"${name}" is already a deck layout of ${users.map((d) => `"${d.slug}"`).join(', ')} (${users.map((d) => `${relative(content.root, deckLayoutDir(d, name))}/`).join(', ')}): a local layout with that name would replace it. Choose another name.`,
      )
    }
  }

  const dir =
    deck === undefined ? join(content.root, LAYOUTS_FOLDER, name) : deckLayoutDir(deck, name)
  if (existsSync(dir)) return fail(`${relative(content.root, dir)}/ already exists.`)

  mkdirSync(dir, { recursive: true })
  for (const file of readdirSync(LAYOUT_SCAFFOLD)) {
    const text = readFileSync(join(LAYOUT_SCAFFOLD, file), 'utf8').replaceAll('{{name}}', name)
    writeFileSync(join(dir, file), text)
    console.log(`${styleText('green', 'created')}  ${relative(content.root, join(dir, file))}`)
  }
  const where = deck === undefined ? '' : ` in the "${deck.slug}" deck`
  console.log(
    `\nUse it${where} with ::slide{#id layout=${name}}. Next: fill in ${relative(content.root, join(dir, 'layout.md'))} (dex check reminds you), then edit the template and style. See dex docs layouts${deck === undefined ? '' : ` --deck ${deck.slug}`}.`,
  )
  return 0
}

function deckLayoutDir(deck: DeckLocation, name: string): string {
  return join(deck.dir, LAYOUTS_FOLDER, name)
}

function newTheme(content: ContentLocations, name: string | undefined): number {
  const fail = (message: string): number => {
    console.error(styleText('red', message))
    console.error('Nothing was written.')
    return 1
  }
  if (name === undefined) return fail('Missing theme name: `dex new theme <name>`.')
  if (!IDENTIFIER_PATTERN.test(name)) {
    return fail(
      `Invalid theme name "${name}": use lowercase letters, digits and dashes, starting with a letter.`,
    )
  }
  const existing = loadWorkspaceThemes({ root: content.root }).themes.get(name)
  if (existing?.origin === 'built-in') {
    return fail(
      `"${name}" is a built-in theme: local themes cannot replace built-in ones. Choose another name.`,
    )
  }
  const dir = join(content.root, THEMES_FOLDER, name)
  if (existsSync(dir)) return fail(`${relative(content.root, dir)}/ already exists.`)

  mkdirSync(dir, { recursive: true })
  const files: [string, string][] = [
    [THEME_FILE, starterThemeCss(name, engineTokens())],
    ...readdirSync(THEME_SCAFFOLD).map((file): [string, string] => [
      file,
      readFileSync(join(THEME_SCAFFOLD, file), 'utf8').replaceAll('{{name}}', name),
    ]),
  ]
  for (const [file, text] of files) {
    writeFileSync(join(dir, file), text)
    console.log(`${styleText('green', 'created')}  ${relative(content.root, join(dir, file))}`)
  }
  console.log(
    `\nUse it with \`theme: ${name}\` in a deck's front matter (or in dex.yaml for the whole folder). Next: change the colours in ${THEMES_FOLDER}/${name}/${THEME_FILE} (light and dark), fill in theme.md, and run dex check. See dex docs themes.`,
  )
  return 0
}

/** A `theme.css` setting every colour token to its default, ready to edit. */
export function starterThemeCss(name: string, tokens: readonly TokenDefault[]): string {
  const lines = tokens.map(({ name: token, value }) => {
    const follows = /^var\(\s*--([\w-]+)\s*\)$/.exec(value)?.[1]
    return follows === undefined
      ? `  --${token}: ${value};`
      : `  /* --${token} follows --${follows}; set it to change it on its own. */`
  })
  return `/*
 * The ${name} theme. Every colour token, at the default value: change the
 * ones you want and delete the rest (they keep the defaults).
 * Each value is light-dark(<light mode>, <dark mode>), or one colour for both,
 * as hex. See \`dex docs themes\` for what each token colours.
 */
:root {
${lines.join('\n')}
}
`
}
