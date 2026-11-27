/**
 * Compiles one deck source into rendered slides. This is the heart of the
 * engine; it is pure apart from the injected `assetExists` and
 * `renderDiagrams` functions.
 */
import type { Element, ElementContent } from 'hast'
import { toString as hastToString } from 'hast-util-to-string'
import type { Code, RootContent } from 'mdast'
import { visit } from 'unist-util-visit'
import { DiagnosticBag } from './diagnostics.ts'
import { isDiagramLanguage, parseAlt, validateTikz } from './diagrams/block.ts'
import { diagramFigure } from './diagrams/figure.ts'
import type { DiagramOutcome } from './diagrams/render.ts'
import { fillTemplate, type TemplateValues } from './layouts/template.ts'
import { type TocEntry, transformDirectives } from './markdown/directives.ts'
import { isKnownLanguage as isKnown, prepareHighlighter } from './markdown/highlight.ts'
import { collectReferences } from './markdown/references.ts'
import { contentOf, markdownToHast } from './markdown/to-hast.ts'
import {
  type CompiledDeck,
  DEFAULT_THEME,
  type DeckMeta,
  IDENTIFIER_PATTERN,
  type Layout,
  type RenderedSlide,
} from './model.ts'
import { parseFrontMatter } from './parse/front-matter.ts'
import { type ParsedSlide, parseSlide } from './parse/slide.ts'
import { splitSlides } from './parse/split.ts'

export interface DeckInput {
  readonly slug: string
  /** Path of `slides.md` relative to the project root, for diagnostics. */
  readonly file: string
  readonly source: string
  /** Whether a path relative to the deck folder exists. */
  readonly assetExists: (path: string) => boolean
  /** Renders the deck's tikz blocks (light and dark); absent when diagrams cannot be rendered. */
  readonly renderDiagrams?:
    | ((sources: readonly string[], theme: string) => Promise<DiagramOutcome[]>)
    | undefined
  /** The themes a deck may name, and the one used when it names none. */
  readonly themes?: ThemeChoice | undefined
}

export interface ThemeChoice {
  readonly available: readonly string[]
  /** The folder theme (from `dex.yaml`), or `default`. */
  readonly fallback: string
}

export interface CompileResult {
  /** `undefined` when the deck has errors. */
  readonly deck: CompiledDeck | undefined
  readonly diagnostics: DiagnosticBag
}

const DEFAULT_SLOT = ''
const TITLE_SLOT = 'title'
/** Slides with this layout are listed by `::toc`. */
const TOC_LAYOUT = 'section'

function containsToc(slide: ParsedSlide): boolean {
  return slide.tree.children.some((node) => node.type === 'leafDirective' && node.name === 'toc')
}

export async function compileDeck(
  input: DeckInput,
  layouts: ReadonlyMap<string, Layout>,
): Promise<CompileResult> {
  const diagnostics = new DiagnosticBag()
  const { file } = input

  const { meta, body, bodyLine } = parseFrontMatter(input.source, file, diagnostics)
  const theme = resolveTheme(meta?.theme, input, diagnostics)

  const sources = splitSlides(body, bodyLine).filter((chunk) => {
    if (chunk.markdown.trim() !== '') return true
    if (chunk.line > bodyLine) {
      diagnostics.warn(file, 'Empty slide ignored: remove the extra `---` separator.', {
        line: chunk.line - 1,
      })
    }
    return false
  })
  if (sources.length === 0) diagnostics.error(file, 'The deck has no slides.', { line: bodyLine })

  const slides = sources.map((source, index) => parseSlide(source, index + 1, file, diagnostics))
  checkUniqueIds(slides, file, diagnostics)
  checkLayouts(slides, layouts, file, diagnostics)

  const toc: TocEntry[] = slides.flatMap((slide) =>
    slide.layout === TOC_LAYOUT && slide.id && !containsToc(slide)
      ? [{ id: slide.id, title: slide.title }]
      : [],
  )
  const slideIds = new Set(slides.flatMap((slide) => (slide.id ? [slide.id] : [])))
  const highlighter = await prepareHighlighter(slides.map((slide) => slide.tree))
  const diagrams = await prepareDiagrams(slides, input, theme, diagnostics)
  const assets = new Set<string>()
  const rendered: RenderedSlide[] = []

  slides.forEach((slide, index) => {
    // Content is validated even when the declaration is broken, so authors
    // see every problem at once; the slide is only rendered when valid.
    const layout = layouts.get(slide.layout)

    const at = (line: number | undefined) => ({
      line: line === undefined ? slide.line : line + slide.lineOffset,
      slideId: slide.id,
    })
    const error = (message: string, line: number | undefined) =>
      diagnostics.error(file, message, at(line))
    const warn = (message: string, line: number | undefined) =>
      diagnostics.warn(file, message, at(line))

    const groups = assignSlots(slide.tree.children, layout, error)
    const content = new Map<string, ElementContent[]>()

    for (const [slot, nodes] of groups) {
      const root = { type: 'root' as const, children: nodes }
      transformDirectives(root, { toc, error })
      warnUnknownLanguages(nodes, warn)
      const hast = markdownToHast(root.children, highlighter, slide.markdown, diagrams)
      for (const asset of collectReferences(hast, {
        slideIds,
        assetExists: input.assetExists,
        error,
        warn,
      })) {
        assets.add(asset)
      }
      content.set(slot, contentOf(hast))
    }

    if (meta === undefined || layout === undefined || slide.id === undefined) return
    const number = index + 1
    const { element, title } = slideElement(
      slide,
      slide.id,
      number,
      slides.length,
      layout,
      content,
      meta,
    )
    rendered.push({ id: slide.id, number, layout: slide.layout, title, line: slide.line, element })
  })

  if (meta === undefined || diagnostics.hasErrors) return { deck: undefined, diagnostics }
  return { deck: { slug: input.slug, meta, slides: rendered, theme, assets }, diagnostics }
}

/** The deck's theme: its own if it names a known one, else the folder theme. */
function resolveTheme(
  named: string | undefined,
  input: DeckInput,
  diagnostics: DiagnosticBag,
): string {
  const fallback = input.themes?.fallback ?? DEFAULT_THEME
  if (named === undefined) return fallback
  const available = input.themes?.available
  if (available === undefined || available.includes(named)) return named
  const line = input.source.split(/\r?\n/).findIndex((text) => text.startsWith('theme:')) + 1
  diagnostics.error(
    input.file,
    `Unknown theme "${named}". Available: ${[...available].sort().join(', ')}. Run \`dex docs themes\` to see them.`,
    { line: line || 1 },
  )
  return fallback
}

/**
 * Validates every diagram block, renders the valid ones in one batch, and
 * returns their figures keyed by mdast node. Errors become diagnostics on
 * the deck (block lines) or on the preamble file TeX blamed.
 */
async function prepareDiagrams(
  slides: readonly ParsedSlide[],
  input: DeckInput,
  theme: string,
  diagnostics: DiagnosticBag,
): Promise<Map<Code, Element>> {
  const figures = new Map<Code, Element>()
  const blocks: { node: Code; slide: ParsedSlide; alt: string | undefined; fence: number }[] = []

  for (const slide of slides) {
    visit(slide.tree, 'code', (node) => {
      if (!isDiagramLanguage(node.lang)) return
      const fence = (node.position?.start.line ?? 1) + slide.lineOffset
      const at = { line: fence, slideId: slide.id }
      const problem = validateTikz(node.value)
      if (problem !== undefined) {
        diagnostics.error(input.file, problem, at)
        return
      }
      const alt = parseAlt(node.meta)
      if (alt === undefined) {
        diagnostics.warn(
          input.file,
          'Diagram without alt text: describe what it shows, e.g. ```tikz alt="The agent loop: decide, act, observe".',
          at,
        )
      }
      blocks.push({ node, slide, alt, fence })
    })
  }
  if (blocks.length === 0) return figures

  if (input.renderDiagrams === undefined) {
    for (const block of blocks) {
      diagnostics.error(input.file, 'Diagrams cannot be rendered here.', {
        line: block.fence,
        slideId: block.slide.id,
      })
    }
    return figures
  }

  const outcomes = await input.renderDiagrams(
    blocks.map((block) => block.node.value),
    theme,
  )
  const reported = new Set<string>()
  const counts = new Map<string, number>()
  blocks.forEach((block, index) => {
    const outcome = outcomes[index]
    if (outcome === undefined) return
    if ('svg' in outcome) {
      const key = block.slide.id ?? 'slide'
      const number = (counts.get(key) ?? 0) + 1
      counts.set(key, number)
      figures.set(block.node, diagramFigure(outcome.svg, block.alt, `${key}-diagram${number}-`))
      return
    }
    const { error } = outcome
    if (error.file === 'block') {
      const line = error.line === undefined ? block.fence : block.fence + error.line
      diagnostics.error(input.file, `Diagram error: ${error.message}`, {
        line,
        slideId: block.slide.id,
      })
      return
    }
    // A preamble error breaks every diagram using it: report it once.
    const key = `${error.file}:${error.line ?? ''}:${error.message}`
    if (reported.has(key)) return
    reported.add(key)
    diagnostics.error(
      error.file,
      `Diagram preamble error: ${error.message}`,
      error.line === undefined ? {} : { line: error.line },
    )
  })
  return figures
}

/**
 * Splits top-level content into slot groups at `::slot{name=x}` lines and
 * applies the automatic title slot. With an unknown layout (already
 * reported), slot names are not checked against it.
 */
function assignSlots(
  children: readonly RootContent[],
  layout: Layout | undefined,
  error: (message: string, line: number | undefined) => void,
): Map<string, RootContent[]> {
  const groups = new Map<string, RootContent[]>([[DEFAULT_SLOT, []]])
  let current = groups.get(DEFAULT_SLOT) as RootContent[]

  for (const node of children) {
    if (node.type !== 'leafDirective' || node.name !== 'slot') {
      current.push(node)
      continue
    }
    const line = node.position?.start.line
    const { name, ...rest } = node.attributes ?? {}
    if (Object.keys(rest).length > 0 || !name || !IDENTIFIER_PATTERN.test(name)) {
      error('Slots are written `::slot{name=<name>}` with a lowercase name.', line)
      continue
    }
    if (layout !== undefined && !layout.slots.has(name)) {
      error(
        `Layout "${layout.name}" has no slot "${name}". Its slots: ${describeSlots(layout)}.`,
        line,
      )
    }
    if (groups.has(name)) error(`Slot "${name}" is filled twice in this slide.`, line)
    current = []
    groups.set(name, current)
  }

  const main = groups.get(DEFAULT_SLOT) ?? []
  if (layout?.slots.has(TITLE_SLOT) && !groups.has(TITLE_SLOT) && main[0]?.type === 'heading') {
    groups.set(TITLE_SLOT, [main.shift() as RootContent])
  }
  if (main.length === 0) groups.delete(DEFAULT_SLOT)
  else if (layout !== undefined && !layout.slots.has(DEFAULT_SLOT)) {
    error(
      `Layout "${layout.name}" has no default slot. Put content under one of its slots: ${describeSlots(layout)}.`,
      main[0]?.position?.start.line,
    )
  }

  return groups
}

function slideElement(
  slide: ParsedSlide,
  id: string,
  number: number,
  total: number,
  layout: Layout,
  content: ReadonlyMap<string, ElementContent[]>,
  meta: DeckMeta,
): { element: Element; title: string } {
  const values: TemplateValues = {
    'deck.title': meta.title,
    'deck.subtitle': meta.subtitle ?? '',
    'deck.author.name': meta.author?.name ?? '',
    'deck.author.url': meta.author?.url ?? '',
    'deck.lang': meta.lang,
    'slide.id': id,
    'slide.number': String(number),
    'slide.total': String(total),
  }
  const children = [...fillTemplate(layout.template, content, values), slideNumber(number, total)]
  // Prefer the source heading; fall back to one the template supplied (e.g. {{deck.title}}).
  const title = slide.title || firstHeadingText(children)
  const label = `Slide ${number} of ${total}${title ? `: ${title}` : ''}`

  const element: Element = {
    type: 'element',
    tagName: 'section',
    properties: {
      id,
      className: ['slide', ...slide.classes],
      dataLayout: layout.name,
      dataNumber: number,
      ariaRoledescription: 'slide',
      ariaLabel: label,
    },
    children,
  }
  return { element, title }
}

/**
 * The visible slide number, after the layout's content so layouts can
 * style or hide it. Hidden from assistive technology: the slide's label
 * already says "Slide n of N".
 */
function slideNumber(number: number, total: number): Element {
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['slide__number'], ariaHidden: 'true' },
    children: [{ type: 'text', value: `${number} / ${total}` }],
  }
}

function firstHeadingText(nodes: readonly ElementContent[]): string {
  for (const node of nodes) {
    if (node.type !== 'element') continue
    if (/^h[1-6]$/.test(node.tagName)) return hastToString(node).trim()
    const nested = firstHeadingText(node.children)
    if (nested) return nested
  }
  return ''
}

function checkUniqueIds(
  slides: readonly ParsedSlide[],
  file: string,
  diagnostics: DiagnosticBag,
): void {
  const seen = new Map<string, ParsedSlide>()
  for (const slide of slides) {
    if (slide.id === undefined) continue
    const previous = seen.get(slide.id)
    if (previous === undefined) {
      seen.set(slide.id, slide)
      continue
    }
    const message = `Duplicate slide id "${slide.id}" (also at lines ${previous.line} and ${slide.line}). Ids must be unique within a deck.`
    diagnostics.error(file, message, { line: previous.line, slideId: slide.id })
    diagnostics.error(file, message, { line: slide.line, slideId: slide.id })
  }
}

function checkLayouts(
  slides: readonly ParsedSlide[],
  layouts: ReadonlyMap<string, Layout>,
  file: string,
  diagnostics: DiagnosticBag,
): void {
  const available = [...layouts.keys()].sort().join(', ')
  for (const slide of slides) {
    if (!layouts.has(slide.layout)) {
      diagnostics.error(file, `Unknown layout "${slide.layout}". Available: ${available}.`, {
        line: slide.line,
        slideId: slide.id,
      })
    }
  }
}

function warnUnknownLanguages(
  nodes: readonly RootContent[],
  warn: (message: string, line: number | undefined) => void,
): void {
  const visit = (node: RootContent): void => {
    if (node.type === 'code' && node.lang && !isKnown(node.lang) && !isDiagramLanguage(node.lang)) {
      warn(
        `Unknown code language "${node.lang}": rendered as plain text.`,
        node.position?.start.line,
      )
    }
    if ('children' in node) for (const child of node.children) visit(child as RootContent)
  }
  nodes.forEach(visit)
}

function describeSlots(layout: Layout): string {
  if (layout.slots.size === 0) return 'none'
  return [...layout.slots].map((slot) => (slot === DEFAULT_SLOT ? '(default)' : slot)).join(', ')
}
