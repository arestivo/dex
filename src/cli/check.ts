/**
 * `dex check [slug...]`: validates decks and layouts without building.
 * Returns the exit code: 1 when any error is found.
 */
import { styleText } from 'node:util'
import type { ContentLocations } from '../core/config.ts'
import { formatDiagnostic, hasErrors, sortDiagnostics } from '../core/diagnostics.ts'
import { compileWorkspace } from '../core/workspace.ts'
import { staleInstructions } from './scaffold.ts'

export async function runCheck(
  content: ContentLocations,
  slugs: readonly string[],
): Promise<number> {
  const result = await compileWorkspace({ root: content.root, decksDir: content.decksDir }, slugs)
  const { decks, layouts } = result
  const diagnostics = [
    ...result.diagnostics,
    ...staleInstructions(content).map((file) => ({
      severity: 'warning' as const,
      file,
      message:
        'Dex-managed instructions differ from the installed engine: run `dex init` to refresh them.',
    })),
  ]

  for (const diagnostic of sortDiagnostics(diagnostics)) {
    const color = diagnostic.severity === 'error' ? 'red' : 'yellow'
    console.log(styleText(color, formatDiagnostic(diagnostic)))
  }

  const errors = diagnostics.filter((d) => d.severity === 'error').length
  const warnings = diagnostics.length - errors
  const slides = decks.reduce((total, deck) => total + deck.slides.length, 0)
  const names = [...layouts.keys()].sort().join(', ')

  console.log(
    `\n${decks.length} deck(s), ${slides} slide(s), ${layouts.size} layout(s) [${names}]: ${errors} error(s), ${warnings} warning(s).`,
  )
  return hasErrors(diagnostics) ? 1 : 0
}
