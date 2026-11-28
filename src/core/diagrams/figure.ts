/**
 * Turns a diagram's light and dark SVG renderings into the figure shown in
 * the slide. Each rendering is published as its own file, named after a hash
 * of its content (`_app/diagrams/<hash>.svg`), and the figure refers to both
 * with `<img>`: the page stays small, and browsers cache unchanged diagrams.
 * Pure: string and hast manipulation, and hashing.
 */
import { createHash } from 'node:crypto'
import type { Element } from 'hast'
import { MODES, type Mode } from './palette.ts'
import type { DiagramRenderings } from './render.ts'

/** TeX points per em of slide text: 10pt labels are as large as body text. */
const POINTS_PER_EM = 10

/** Where the built site keeps diagram files, relative to its root. */
export const DIAGRAMS_DIR = '_app/diagrams'

export interface DiagramFigure {
  readonly figure: Element
  /** The files the figure refers to: file name (in DIAGRAMS_DIR) to SVG text. */
  readonly files: ReadonlyMap<string, string>
}

/** A rendering's file name: a hash of its content, so it changes exactly when the file does. */
export function diagramFileName(svg: string): string {
  return `${createHash('sha256').update(svg).digest('hex').slice(0, 16)}.svg`
}

/**
 * The figure for a diagram, for a page one folder below the site root (a
 * deck page, `<slug>/index.html`).
 */
export function diagramFigure(
  renderings: DiagramRenderings,
  alt: string | undefined,
): DiagramFigure {
  const files = new Map<string, string>()
  const children = MODES.map((mode) => {
    const svg = renderings[mode]
    const name = diagramFileName(svg)
    files.set(name, svg)
    return renderingElement(svg, mode, `../${DIAGRAMS_DIR}/${name}`)
  })
  return {
    figure: {
      type: 'element',
      tagName: 'figure',
      properties: {
        className: ['diagram'],
        role: 'img',
        ...(alt === undefined ? {} : { ariaLabel: alt }),
      },
      children,
    },
    files,
  }
}

/** One rendering: decorative, since the figure carries the alt text. */
function renderingElement(svg: string, mode: Mode, src: string): Element {
  const width = svgWidthEm(svg)
  return {
    type: 'element',
    tagName: 'img',
    properties: {
      className: ['diagram__render', `diagram__render--${mode}`],
      src,
      alt: '',
      // The first slide mustn't wait for every diagram: the viewer loads the
      // rest in the background (src/client/preload.ts).
      loading: 'lazy',
      ...(width === undefined ? {} : { style: `width: ${width}em` }),
    },
    children: [],
  }
}

/** The SVG's width in em (from its `width` in points), or undefined. */
export function svgWidthEm(svg: string): number | undefined {
  const match = /<svg\b[^>]*\swidth=['"]([\d.]+)pt['"]/.exec(svg)
  if (match?.[1] === undefined) return undefined
  return Math.round((Number(match[1]) / POINTS_PER_EM) * 1000) / 1000
}
