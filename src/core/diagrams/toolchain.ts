/** Finds the external programs diagram rendering needs. */
import { accessSync, constants } from 'node:fs'
import { delimiter, join } from 'node:path'

export const TEX_PROGRAMS = ['xelatex', 'dvisvgm'] as const

/** Absolute path of `program` on PATH, or undefined. */
export function findProgram(
  program: string,
  path: string = process.env.PATH ?? '',
): string | undefined {
  for (const dir of path.split(delimiter)) {
    if (!dir) continue
    const candidate = join(dir, program)
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // not here
    }
  }
  return undefined
}

/** The TeX programs that are missing from PATH (empty when all are there). */
export function missingTexPrograms(path?: string): string[] {
  return TEX_PROGRAMS.filter((program) => findProgram(program, path) === undefined)
}
