/**
 * Turns a diagram's light and dark SVG renderings into the figure that is
 * inlined in the slide. Pure: string and hast manipulation only.
 */
import type { Element } from 'hast'
import { fromHtml } from 'hast-util-from-html'
import { DIAGRAM_THEMES, type DiagramTheme } from './palette.ts'
import type { DiagramRenderings } from './render.ts'

/** TeX points per em of slide text: 10pt labels are as large as body text. */
const POINTS_PER_EM = 10

export function diagramFigure(
  renderings: DiagramRenderings,
  alt: string | undefined,
  prefix: string,
): Element {
  const children = DIAGRAM_THEMES.map((theme) =>
    renderingElement(renderings[theme], theme, `${prefix}${theme}-`),
  )
  return {
    type: 'element',
    tagName: 'figure',
    properties: {
      className: ['diagram'],
      role: 'img',
      ...(alt === undefined ? {} : { ariaLabel: alt }),
    },
    children,
  }
}

function renderingElement(svg: string, theme: DiagramTheme, prefix: string): Element {
  const width = svgWidthEm(svg)
  const root = fromHtml(prefixIds(svg, prefix), { fragment: true })
  const element = root.children.find(
    (node): node is Element => node.type === 'element' && node.tagName === 'svg',
  )
  if (element === undefined) throw new Error('The diagram renderer returned no <svg> element.')
  const { width: _width, height: _height, ...properties } = element.properties
  element.properties = {
    ...properties,
    className: ['diagram__render', `diagram__render--${theme}`],
    ariaHidden: 'true',
    focusable: 'false',
    ...(width === undefined ? {} : { style: `width: ${width}em` }),
  }
  return element
}

/** The SVG's width in em (from its `width` in points), or undefined. */
export function svgWidthEm(svg: string): number | undefined {
  const match = /<svg\b[^>]*\swidth=['"]([\d.]+)pt['"]/.exec(svg)
  if (match?.[1] === undefined) return undefined
  return Math.round((Number(match[1]) / POINTS_PER_EM) * 1000) / 1000
}

/**
 * Prefixes every id and every reference to one (`href="#…"`,
 * `xlink:href="#…"`, `url(#…)`), so several SVGs can share a page.
 */
export function prefixIds(svg: string, prefix: string): string {
  return svg
    .replace(
      /(\sid=)(['"])([^'"]+)\2/g,
      (_, attribute: string, quote: string, id: string) =>
        `${attribute}${quote}${prefix}${id}${quote}`,
    )
    .replace(
      /(\s(?:xlink:)?href=)(['"])#([^'"]+)\2/g,
      (_, attribute: string, quote: string, id: string) =>
        `${attribute}${quote}#${prefix}${id}${quote}`,
    )
    .replace(/url\(#([^)]+)\)/g, (_, id: string) => `url(#${prefix}${id})`)
}
