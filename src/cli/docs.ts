/**
 * `dex docs [topic]`: prints the reference documentation. Topics come from
 * the installed engine (never from copies in content folders); `layouts` is
 * generated for the content folder, so it lists its local layouts too, and
 * with `--deck` that deck's own layouts; `themes` lists its themes.
 */
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { type ContentLocations, ENGINE_ROOT, SETTINGS_FILE } from '../core/config.ts'
import { DiagnosticBag } from '../core/diagnostics.ts'
import type { Layout, LayoutOrigin, Theme } from '../core/model.ts'
import { mergeColours } from '../core/themes/colours.ts'
import { TOKEN_ROLES } from '../core/themes/roles.ts'
import {
  DECK_FILE,
  type DeckLocation,
  engineTokens,
  findDecks,
  loadDeckLayouts,
  loadSettings,
  loadThemeContext,
  loadWorkspaceLayouts,
} from '../core/workspace.ts'

interface Topic {
  readonly description: string
  readonly render: (content: ContentLocations, deck?: DeckLocation) => string
}

const engineDoc = (file: string): string => readFileSync(join(ENGINE_ROOT, 'docs', file), 'utf8')

export const DOC_TOPICS = {
  authoring: {
    description: 'The deck format: files, front matter, slides, ids, directives, utilities, fit.',
    render: () => engineDoc('authoring.md'),
  },
  layouts: {
    description:
      "The layouts available in this folder (built-in and local; --deck adds a deck's own), and how to make one.",
    render: renderLayoutsReference,
  },
  themes: {
    description:
      "The colour themes available in this folder (built-in and local), the folder's default, and how to make one.",
    render: renderThemesReference,
  },
} as const satisfies Record<string, Topic>

export type DocTopic = keyof typeof DOC_TOPICS
export const DEFAULT_TOPIC: DocTopic = 'authoring'

export function runDocs(
  content: ContentLocations,
  topic: string | undefined,
  list: boolean,
  slug?: string,
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
  let deck: DeckLocation | undefined
  if (slug !== undefined) {
    deck = decksOf(content).find((d) => d.slug === slug)
    if (deck === undefined) {
      console.error(
        `No deck "${slug}" (expected ${relative(content.root, join(content.decksDir, slug, DECK_FILE))}).`,
      )
      return 1
    }
  }
  process.stdout.write(DOC_TOPICS[name].render(content, deck))
  return 0
}

function isTopic(name: string): name is DocTopic {
  return Object.hasOwn(DOC_TOPICS, name)
}

const ORIGIN_ORDER: readonly LayoutOrigin[] = ['built-in', 'local', 'deck']

function decksOf(content: ContentLocations): DeckLocation[] {
  return findDecks({ root: content.root, decksDir: content.decksDir }, new DiagnosticBag())
}

/**
 * The `layouts` topic: this folder's layouts (and `deck`'s own, when given),
 * then the guide to making one.
 */
export function renderLayoutsReference(content: ContentLocations, deck?: DeckLocation): string {
  const workspace = { root: content.root, decksDir: content.decksDir }
  const base = loadWorkspaceLayouts(workspace).layouts
  const layouts = deck === undefined ? base : loadDeckLayouts(workspace, deck, base).layouts
  const ordered = [...layouts.values()].sort(
    (a, b) =>
      ORIGIN_ORDER.indexOf(a.origin) - ORIGIN_ORDER.indexOf(b.origin) ||
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

  const scope =
    deck === undefined
      ? 'The layouts available in this content folder: the built-in ones, plus local ones from its `layouts/` folder.'
      : `The layouts the \`${deck.slug}\` deck can use: the built-in ones, local ones from the content folder's \`layouts/\` folder, and its own from \`${relative(content.root, join(deck.dir, 'layouts'))}/\`.`

  return `# Layouts

${scope} A slide picks one with \`::slide{#id layout=<name>}\`; without \`layout=\` it uses \`default\`. How to fill slots is explained in \`dex docs\` (section "Layouts and slots").

${table}
${deck === undefined ? deckLayoutsNote(content, base) : ''}
${sections.join('\n\n')}

${demoteHeadings(engineDoc('layouts.md'), 1)}`
}

/** Names the decks that have their own layouts (not listed without `--deck`). */
function deckLayoutsNote(content: ContentLocations, base: ReadonlyMap<string, Layout>): string {
  const workspace = { root: content.root, decksDir: content.decksDir }
  const owners = decksOf(content).flatMap((deck) => {
    const own = [...loadDeckLayouts(workspace, deck, base).layouts.values()]
      .filter((layout) => layout.origin === 'deck')
      .map((layout) => layout.name)
      .sort()
    return own.length === 0 ? [] : [`\`${deck.slug}\` (${own.join(', ')})`]
  })
  if (owners.length === 0) return ''
  return `\nThese decks also have their own layouts, which only they can use: ${owners.join(', ')}. To list everything a deck can use, run \`dex docs layouts --deck <slug>\`.\n`
}

/** The `themes` topic: this folder's themes and its default, then the guide and the tokens. */
export function renderThemesReference(content: ContentLocations): string {
  const workspace = { root: content.root, decksDir: content.decksDir }
  const { themes, choice } = loadThemeContext(workspace)
  const settings = loadSettings(workspace).settings
  const tokens = engineTokens()
  const ordered = [...themes.values()].sort(
    (a, b) =>
      (a.origin === b.origin ? 0 : a.origin === 'built-in' ? -1 : 1) ||
      a.name.localeCompare(b.name),
  )
  const swatch = (theme: Theme, mode: 'light' | 'dark') => {
    const colours = mergeColours(tokens, theme.colours)
    return ['color-bg', 'color-text', 'color-accent']
      .map((token) => `\`#${colours.get(token)?.[mode] ?? '??????'}\``)
      .join(' / ')
  }

  const table = [
    '| Theme | Origin | Description | Light: background / text / accent | Dark: background / text / accent |',
    '| --- | --- | --- | --- | --- |',
    ...ordered.map(
      (theme) =>
        `| \`${theme.name}\` | ${theme.origin} | ${cell(theme.description) || '_undocumented_'} | ${swatch(theme, 'light')} | ${swatch(theme, 'dark')} |`,
    ),
  ].join('\n')

  const source =
    settings.theme === undefined
      ? `no theme is set in \`${SETTINGS_FILE}\``
      : settings.theme === choice.fallback
        ? `set in \`${SETTINGS_FILE}\``
        : `\`${SETTINGS_FILE}\` names an unknown theme, so \`default\` is used; \`dex check\` reports it`
  const sections = ordered.map((theme) => {
    const notes =
      theme.notes === undefined
        ? '_No `theme.md`: undocumented. Read its `theme.css` to see its colours._'
        : demoteHeadings(theme.notes, 1) || '_No usage notes._'
    return `## \`${theme.name}\` (${theme.origin})\n\n${theme.description ? `${theme.description}\n\n` : ''}${notes}`
  })

  const tokenTable = [
    '| Token | Colours | Default (light / dark) |',
    '| --- | --- | --- |',
    ...tokens.map(
      ({ name, value }) =>
        `| \`--${name}\` | ${cell(TOKEN_ROLES[name] ?? '')} | \`${cell(value)}\` |`,
    ),
  ].join('\n')

  return `# Themes

The colour themes available in this content folder: the built-in ones, plus local ones from its \`themes/\` folder. A deck picks one with \`theme: <name>\` in its front matter. Decks that don't pick one use the folder's theme: **\`${choice.fallback}\`** (${source}).

${table}

${sections.join('\n\n')}

${demoteHeadings(engineDoc('themes.md'), 1)}

## Colour tokens

What a theme can set. Each default is the value used when no theme sets the token.

${tokenTable}
`
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
