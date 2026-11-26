/**
 * Wraps a layout stylesheet so it only applies to slides using that layout.
 * Inside, `:scope` refers to the slide element itself.
 */
export function scopeLayoutCss(name: string, css: string): string {
  const body = css.trim()
  if (body === '') return ''
  return `@layer layouts {\n  @scope (.slide[data-layout="${name}"]) {\n${indent(body)}\n  }\n}\n`
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
