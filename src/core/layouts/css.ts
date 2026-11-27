/**
 * Wraps a layout stylesheet so it only applies to slides using that layout
 * (and, for a deck layout, only in that deck: two decks may have deck
 * layouts with the same name). Inside, `:scope` refers to the slide element.
 */
export function scopeLayoutCss(name: string, css: string, deck?: string): string {
  const body = css.trim()
  if (body === '') return ''
  const slide = `.slide[data-layout="${name}"]`
  const root = deck === undefined ? slide : `.deck[data-deck="${deck}"] ${slide}`
  return `@layer layouts {\n  @scope (${root}) {\n${indent(body)}\n  }\n}\n`
}

/** Constructs that cannot appear inside `@scope`/`@layer` blocks. */
export function findUnsupportedCss(css: string): string[] {
  const problems: string[] = []
  if (/@import\b/.test(css)) problems.push('@import is not allowed in layout styles')
  if (/@layer\b/.test(css)) problems.push('@layer is added automatically; remove it')
  return problems
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => (line === '' ? line : `    ${line}`))
    .join('\n')
}
